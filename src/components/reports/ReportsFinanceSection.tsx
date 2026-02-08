import { ReportCard } from './ReportCard';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Calculator, 
  FileCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';

interface ReportsFinanceSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
}

export const ReportsFinanceSection = ({ dateRange, userName }: ReportsFinanceSectionProps) => {
  const { toast } = useToast();

  const fetchTransactions = async (type?: 'income' | 'expense') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    let query = supabase
      .from('financial_transactions')
      .select(`
        *,
        category:financial_categories(name),
        bank_account:bank_accounts(name),
        unit:units(unit_number)
      `)
      .eq('broker_id', user.id)
      .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
      .lte('transaction_date', dateRange.to.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  // Extrato de Repasse
  const handleRepassePdf = async () => {
    try {
      const transactions = await fetchTransactions();
      const incomeTotal = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
      const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);

      await generateReportPdf({
        title: 'Extrato de Repasse',
        subtitle: 'Movimentações financeiras do período',
        userName,
        dateRange,
        columns: ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)'],
        data: transactions.map(t => [
          formatDate(t.transaction_date),
          t.description,
          t.category?.name || '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          formatCurrency(t.amount),
        ]),
        filename: 'extrato-repasse',
        summary: [
          { label: 'Total de Receitas', value: formatCurrency(incomeTotal) },
          { label: 'Total de Despesas', value: formatCurrency(expenseTotal) },
          { label: 'Saldo do Período', value: formatCurrency(incomeTotal - expenseTotal) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleRepasseCsv = async () => {
    try {
      const transactions = await fetchTransactions();
      generateReportCsv({
        columns: ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Conta'],
        data: transactions.map(t => [
          cleanDateValue(t.transaction_date),
          t.description,
          t.category?.name || '',
          t.type,
          cleanNumericValue(t.amount),
          t.status,
          t.bank_account?.name || '',
        ]),
        filename: 'extrato-repasse',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Fluxo de Caixa
  const handleFluxoCaixaPdf = async () => {
    try {
      const transactions = await fetchTransactions();
      
      // Group by month
      const byMonth: Record<string, { income: number; expense: number }> = {};
      transactions.forEach(t => {
        const month = t.transaction_date.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
        if (t.type === 'income') byMonth[month].income += t.amount;
        else byMonth[month].expense += t.amount;
      });

      await generateReportPdf({
        title: 'Fluxo de Caixa',
        subtitle: 'Receitas e despesas consolidadas por mês',
        userName,
        dateRange,
        columns: ['Mês', 'Receitas (R$)', 'Despesas (R$)', 'Saldo (R$)'],
        data: Object.entries(byMonth).map(([month, { income, expense }]) => [
          month,
          formatCurrency(income),
          formatCurrency(expense),
          formatCurrency(income - expense),
        ]),
        filename: 'fluxo-caixa',
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleFluxoCaixaCsv = async () => {
    try {
      const transactions = await fetchTransactions();
      const byMonth: Record<string, { income: number; expense: number }> = {};
      transactions.forEach(t => {
        const month = t.transaction_date.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
        if (t.type === 'income') byMonth[month].income += t.amount;
        else byMonth[month].expense += t.amount;
      });

      generateReportCsv({
        columns: ['Mês', 'Receitas', 'Despesas', 'Saldo'],
        data: Object.entries(byMonth).map(([month, { income, expense }]) => [
          month,
          cleanNumericValue(income),
          cleanNumericValue(expense),
          cleanNumericValue(income - expense),
        ]),
        filename: 'fluxo-caixa',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Inadimplência
  const handleInadimplenciaPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: overdue } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          unit:units(unit_number),
          contact:contacts(name)
        `)
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      const total = (overdue || []).reduce((sum, t) => sum + (t.amount || 0), 0);

      await generateReportPdf({
        title: 'Inadimplência Analítica',
        subtitle: 'Recebíveis em atraso',
        userName,
        dateRange,
        columns: ['Vencimento', 'Descrição', 'Unidade', 'Contato', 'Valor (R$)', 'Dias Atraso'],
        data: (overdue || []).map(t => {
          const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
          return [
            formatDate(t.due_date!),
            t.description,
            t.unit?.unit_number || '-',
            t.contact?.name || '-',
            formatCurrency(t.amount),
            daysOverdue.toString(),
          ];
        }),
        filename: 'inadimplencia-analitica',
        summary: [
          { label: 'Total em Atraso', value: formatCurrency(total) },
          { label: 'Quantidade de Títulos', value: (overdue || []).length.toString() },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleInadimplenciaCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: overdue } = await supabase
        .from('financial_transactions')
        .select(`*, unit:units(unit_number), contact:contacts(name)`)
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0]);

      generateReportCsv({
        columns: ['Vencimento', 'Descrição', 'Unidade', 'Contato', 'Valor', 'Dias Atraso'],
        data: (overdue || []).map(t => {
          const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
          return [
            cleanDateValue(t.due_date),
            t.description,
            t.unit?.unit_number || '',
            t.contact?.name || '',
            cleanNumericValue(t.amount),
            daysOverdue,
          ];
        }),
        filename: 'inadimplencia-analitica',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Saldo Bancário
  const handleSaldoBancarioPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('broker_id', user.id);

      const totalBalance = (accounts || []).reduce((sum, a) => sum + (a.balance || 0), 0);

      await generateReportPdf({
        title: 'Saldo Bancário',
        subtitle: 'Posição das contas bancárias',
        userName,
        dateRange,
        columns: ['Conta', 'Banco', 'Agência', 'Número', 'Saldo (R$)'],
        data: (accounts || []).map(a => [
          a.name,
          a.bank_name || '-',
          a.agency || '-',
          a.account_number || '-',
          formatCurrency(a.balance || 0),
        ]),
        filename: 'saldo-bancario',
        summary: [
          { label: 'Saldo Total Consolidado', value: formatCurrency(totalBalance) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaldoBancarioCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('broker_id', user.id);

      generateReportCsv({
        columns: ['Conta', 'Banco', 'Agência', 'Número', 'Saldo'],
        data: (accounts || []).map(a => [
          a.name,
          a.bank_name || '',
          a.agency || '',
          a.account_number || '',
          cleanNumericValue(a.balance || 0),
        ]),
        filename: 'saldo-bancario',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Conciliação
  const handleConciliacaoPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: entries } = await supabase
        .from('bank_statement_entries')
        .select(`
          *,
          bank_account:bank_accounts(name)
        `)
        .eq('broker_id', user.id)
        .gte('entry_date', dateRange.from.toISOString().split('T')[0])
        .lte('entry_date', dateRange.to.toISOString().split('T')[0]);

      const reconciled = (entries || []).filter(e => e.is_reconciled).length;
      const pending = (entries || []).filter(e => !e.is_reconciled).length;

      await generateReportPdf({
        title: 'Conciliação Bancária',
        subtitle: 'Extrato importado vs lançamentos do sistema',
        userName,
        dateRange,
        columns: ['Data', 'Conta', 'Descrição', 'Valor (R$)', 'Status'],
        data: (entries || []).map(e => [
          formatDate(e.entry_date),
          e.bank_account?.name || '-',
          e.description,
          formatCurrency(e.amount),
          e.is_reconciled ? 'Conciliado' : 'Pendente',
        ]),
        filename: 'conciliacao-bancaria',
        summary: [
          { label: 'Total de Lançamentos', value: (entries || []).length.toString() },
          { label: 'Conciliados', value: reconciled.toString() },
          { label: 'Pendentes', value: pending.toString() },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleConciliacaoCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: entries } = await supabase
        .from('bank_statement_entries')
        .select(`*, bank_account:bank_accounts(name)`)
        .eq('broker_id', user.id)
        .gte('entry_date', dateRange.from.toISOString().split('T')[0])
        .lte('entry_date', dateRange.to.toISOString().split('T')[0]);

      generateReportCsv({
        columns: ['Data', 'Conta', 'Descrição', 'Valor', 'Tipo', 'Conciliado'],
        data: (entries || []).map(e => [
          cleanDateValue(e.entry_date),
          e.bank_account?.name || '',
          e.description,
          cleanNumericValue(e.amount),
          e.is_credit ? 'Crédito' : 'Débito',
          e.is_reconciled ? 'Sim' : 'Não',
        ]),
        filename: 'conciliacao-bancaria',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ReportCard
        title="Extrato de Repasse"
        description="Todas as movimentações financeiras do período, separadas por receita e despesa."
        icon={<Wallet className="h-5 w-5" />}
        onGeneratePDF={handleRepassePdf}
        onDownloadCSV={handleRepasseCsv}
      />
      <ReportCard
        title="Fluxo de Caixa"
        description="Comparativo mensal de entradas e saídas, mostrando o saldo resultante por período."
        icon={<TrendingUp className="h-5 w-5" />}
        onGeneratePDF={handleFluxoCaixaPdf}
        onDownloadCSV={handleFluxoCaixaCsv}
      />
      <ReportCard
        title="Inadimplência Analítica"
        description="Lista detalhada de recebíveis em atraso, com dias de atraso e contato devedor."
        icon={<AlertTriangle className="h-5 w-5" />}
        onGeneratePDF={handleInadimplenciaPdf}
        onDownloadCSV={handleInadimplenciaCsv}
      />
      <ReportCard
        title="Saldo Bancário"
        description="Posição consolidada de todas as contas bancárias cadastradas."
        icon={<Calculator className="h-5 w-5" />}
        onGeneratePDF={handleSaldoBancarioPdf}
        onDownloadCSV={handleSaldoBancarioCsv}
      />
      <ReportCard
        title="Conciliação Bancária"
        description="Comparativo entre extratos importados e lançamentos do sistema."
        icon={<FileCheck className="h-5 w-5" />}
        onGeneratePDF={handleConciliacaoPdf}
        onDownloadCSV={handleConciliacaoCsv}
      />
    </div>
  );
};
