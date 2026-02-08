import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Calculator, 
  FileCheck,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate, calculatePenaltyAndInterest } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';

interface ReportsFinanceSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsFinanceSection = ({ dateRange, userName, selectedUnitId }: ReportsFinanceSectionProps) => {
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
        unit:units(unit_number, property:properties(name))
      `)
      .eq('broker_id', user.id)
      .gte('due_date', dateRange.from.toISOString().split('T')[0])
      .lte('due_date', dateRange.to.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    if (selectedUnitId) {
      query = query.eq('unit_id', selectedUnitId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], userId: user.id };
  };

  // Extrato de Repasse - Enhanced with grouping by unit and deductions
  const handleRepassePdf = async () => {
    try {
      const { data: transactions, userId } = await fetchTransactions();
      
      // Get admin fee percentage from leases
      const { data: leases } = await supabase
        .from('leases')
        .select('unit_id, admin_fee_percentage')
        .eq('broker_id', userId)
        .eq('status', 'active');

      const leaseFeeMap = new Map((leases || []).map(l => [l.unit_id, l.admin_fee_percentage || 10]));

      // Group by unit
      const byUnit: Record<string, typeof transactions> = {};
      transactions.forEach(t => {
        const unitKey = t.unit?.unit_number || 'Sem Unidade';
        if (!byUnit[unitKey]) byUnit[unitKey] = [];
        byUnit[unitKey].push(t);
      });

      const tableData: (string | number)[][] = [];
      let totalBruto = 0;
      let totalTaxaAdmin = 0;
      let totalOutras = 0;
      let totalLiquido = 0;

      Object.entries(byUnit).forEach(([unitName, unitTransactions]) => {
        unitTransactions.forEach(t => {
          const valorBruto = t.type === 'income' ? t.amount : 0;
          const adminFeePerc = t.unit_id ? (leaseFeeMap.get(t.unit_id) || 10) : 10;
          const taxaAdmin = t.type === 'income' ? valorBruto * (adminFeePerc / 100) : 0;
          const outrasDed = t.type === 'expense' ? t.amount : 0;
          const valorLiquido = valorBruto - taxaAdmin - outrasDed;

          totalBruto += valorBruto;
          totalTaxaAdmin += taxaAdmin;
          totalOutras += outrasDed;
          totalLiquido += valorLiquido;

          tableData.push([
            formatDate(t.due_date || t.transaction_date),
            unitName,
            t.description,
            t.type === 'income' ? 'Receita' : 'Despesa',
            formatCurrency(valorBruto),
            formatCurrency(taxaAdmin),
            formatCurrency(outrasDed),
            formatCurrency(valorLiquido),
          ]);
        });
      });

      await generateReportPdf({
        title: 'Extrato de Repasse',
        subtitle: selectedUnitId ? 'Movimentações da unidade selecionada' : 'Movimentações agrupadas por unidade',
        userName,
        dateRange,
        columns: ['Data', 'Unidade', 'Descrição', 'Tipo', 'Valor Bruto', 'Taxa Admin.', 'Outras Ded.', 'Valor Líquido'],
        data: tableData,
        filename: 'extrato-repasse',
        landscape: true,
        footerTotals: ['TOTAIS', '', '', '', formatCurrency(totalBruto), formatCurrency(totalTaxaAdmin), formatCurrency(totalOutras), formatCurrency(totalLiquido)],
        summary: [
          { label: 'Total Bruto', value: formatCurrency(totalBruto) },
          { label: 'Total Taxa Administração', value: formatCurrency(totalTaxaAdmin) },
          { label: 'Total Outras Deduções', value: formatCurrency(totalOutras) },
          { label: 'Valor Líquido Final', value: formatCurrency(totalLiquido) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleRepasseCsv = async () => {
    try {
      const { data: transactions } = await fetchTransactions();
      generateReportCsv({
        columns: ['Data', 'Descrição', 'Unidade', 'Categoria', 'Tipo', 'Valor', 'Status', 'Conta'],
        data: transactions.map(t => [
          cleanDateValue(t.due_date || t.transaction_date),
          t.description,
          t.unit?.unit_number || '',
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

  // Saldo Bancário - Progressive daily view
  const handleSaldoBancarioPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('broker_id', user.id);

      // Get initial balances (before date range)
      const { data: initialTransactions } = await supabase
        .from('financial_transactions')
        .select('amount, type, bank_account_id')
        .eq('broker_id', user.id)
        .eq('status', 'paid')
        .lt('paid_date', dateRange.from.toISOString().split('T')[0]);

      // Calculate initial balance from account initial_balance + pre-period transactions
      const initialBalances: Record<string, number> = {};
      (accounts || []).forEach(a => {
        initialBalances[a.id] = a.initial_balance || 0;
      });
      (initialTransactions || []).forEach(t => {
        if (t.bank_account_id) {
          const change = t.type === 'income' ? t.amount : -t.amount;
          initialBalances[t.bank_account_id] = (initialBalances[t.bank_account_id] || 0) + change;
        }
      });

      const totalInitialBalance = Object.values(initialBalances).reduce((sum, b) => sum + b, 0);

      // Get daily movements
      const { data: dailyTransactions } = await supabase
        .from('financial_transactions')
        .select('amount, type, paid_date, bank_account_id')
        .eq('broker_id', user.id)
        .eq('status', 'paid')
        .gte('paid_date', dateRange.from.toISOString().split('T')[0])
        .lte('paid_date', dateRange.to.toISOString().split('T')[0])
        .order('paid_date', { ascending: true });

      // Group by date
      const byDate: Record<string, { credits: number; debits: number }> = {};
      (dailyTransactions || []).forEach(t => {
        const date = t.paid_date?.split('T')[0] || '';
        if (!byDate[date]) byDate[date] = { credits: 0, debits: 0 };
        if (t.type === 'income') byDate[date].credits += t.amount;
        else byDate[date].debits += t.amount;
      });

      const tableData: (string | number)[][] = [];
      let runningBalance = totalInitialBalance;

      // Add initial balance row
      tableData.push([
        formatDate(dateRange.from),
        'Saldo Inicial',
        '-',
        '-',
        formatCurrency(totalInitialBalance),
      ]);

      Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, { credits, debits }]) => {
        const dailyChange = credits - debits;
        runningBalance += dailyChange;
        tableData.push([
          formatDate(date),
          formatCurrency(credits),
          formatCurrency(debits),
          formatCurrency(dailyChange),
          formatCurrency(runningBalance),
        ]);
      });

      await generateReportPdf({
        title: 'Saldo Bancário Progressivo',
        subtitle: 'Evolução diária de saldos consolidados',
        userName,
        dateRange,
        columns: ['Data', 'Créditos', 'Débitos', 'Variação Dia', 'Saldo Acumulado'],
        data: tableData,
        filename: 'saldo-bancario-progressivo',
        summary: [
          { label: 'Saldo Inicial do Período', value: formatCurrency(totalInitialBalance) },
          { label: 'Saldo Final', value: formatCurrency(runningBalance) },
          { label: 'Contas Cadastradas', value: (accounts || []).length.toString() },
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
        columns: ['Conta', 'Banco', 'Agência', 'Número', 'Saldo Atual'],
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

  // Inadimplência Analítica - Enhanced with penalty/interest calculation
  const handleInadimplenciaPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
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

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: overdue } = await query;

      let totalOriginal = 0;
      let totalPenalty = 0;
      let totalInterest = 0;
      let totalUpdated = 0;

      const tableData = (overdue || []).map(t => {
        const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
        const { penalty, interest, total } = calculatePenaltyAndInterest(t.amount, daysOverdue);
        
        totalOriginal += t.amount;
        totalPenalty += penalty;
        totalInterest += interest;
        totalUpdated += total;

        return [
          formatDate(t.due_date!),
          t.contact?.name || '-',
          t.unit?.unit_number || '-',
          formatCurrency(t.amount),
          daysOverdue.toString(),
          formatCurrency(penalty + interest),
          formatCurrency(total),
        ];
      });

      await generateReportPdf({
        title: 'Inadimplência Analítica',
        subtitle: selectedUnitId ? 'Histórico de atrasos da unidade' : 'Recebíveis em atraso com cálculo de multa e juros (2% + 1% a.m.)',
        userName,
        dateRange,
        columns: ['Vencimento', 'Contato', 'Unidade', 'Valor Original', 'Dias Atraso', 'Multa/Juros', 'Valor Atualizado'],
        data: tableData,
        filename: 'inadimplencia-analitica',
        landscape: true,
        footerTotals: ['TOTAIS', '', '', formatCurrency(totalOriginal), '', formatCurrency(totalPenalty + totalInterest), formatCurrency(totalUpdated)],
        summary: [
          { label: 'Total Original em Atraso', value: formatCurrency(totalOriginal) },
          { label: 'Total Multas e Juros', value: formatCurrency(totalPenalty + totalInterest) },
          { label: 'Total Atualizado', value: formatCurrency(totalUpdated) },
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

      let query = supabase
        .from('financial_transactions')
        .select(`*, unit:units(unit_number), contact:contacts(name)`)
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: overdue } = await query;

      generateReportCsv({
        columns: ['Vencimento', 'Descrição', 'Unidade', 'Contato', 'Valor Original', 'Dias Atraso', 'Multa', 'Juros', 'Valor Atualizado'],
        data: (overdue || []).map(t => {
          const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
          const { penalty, interest, total } = calculatePenaltyAndInterest(t.amount, daysOverdue);
          return [
            cleanDateValue(t.due_date),
            t.description,
            t.unit?.unit_number || '',
            t.contact?.name || '',
            cleanNumericValue(t.amount),
            daysOverdue,
            cleanNumericValue(penalty),
            cleanNumericValue(interest),
            cleanNumericValue(total),
          ];
        }),
        filename: 'inadimplencia-analitica',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Fluxo de Caixa
  const handleFluxoCaixaPdf = async () => {
    try {
      const { data: transactions } = await fetchTransactions();
      
      const byMonth: Record<string, { income: number; expense: number }> = {};
      transactions.forEach(t => {
        const month = (t.due_date || t.transaction_date).substring(0, 7);
        if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
        if (t.type === 'income') byMonth[month].income += t.amount;
        else byMonth[month].expense += t.amount;
      });

      let totalIncome = 0;
      let totalExpense = 0;

      const tableData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, { income, expense }]) => {
        totalIncome += income;
        totalExpense += expense;
        return [
          month,
          formatCurrency(income),
          formatCurrency(expense),
          formatCurrency(income - expense),
        ];
      });

      await generateReportPdf({
        title: 'Fluxo de Caixa',
        subtitle: 'Receitas e despesas consolidadas por mês',
        userName,
        dateRange,
        columns: ['Mês', 'Receitas (R$)', 'Despesas (R$)', 'Saldo (R$)'],
        data: tableData,
        filename: 'fluxo-caixa',
        footerTotals: ['TOTAIS', formatCurrency(totalIncome), formatCurrency(totalExpense), formatCurrency(totalIncome - totalExpense)],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleFluxoCaixaCsv = async () => {
    try {
      const { data: transactions } = await fetchTransactions();
      const byMonth: Record<string, { income: number; expense: number }> = {};
      transactions.forEach(t => {
        const month = (t.due_date || t.transaction_date).substring(0, 7);
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
    <ReportsTable
      title="Relatórios Financeiros"
      icon={<BarChart3 className="h-5 w-5" />}
      description="Controle de fluxo de caixa, extratos de repasse, inadimplência e conciliação bancária."
    >
      <ReportRow
        title="Extrato de Repasse"
        description="Movimentações por unidade com deduções (taxa admin, reparos) e valor líquido."
        icon={<Wallet className="h-4 w-4" />}
        onGeneratePDF={handleRepassePdf}
        onDownloadCSV={handleRepasseCsv}
      />
      <ReportRow
        title="Fluxo de Caixa"
        description="Comparativo mensal de entradas e saídas, mostrando o saldo resultante por período."
        icon={<TrendingUp className="h-4 w-4" />}
        onGeneratePDF={handleFluxoCaixaPdf}
        onDownloadCSV={handleFluxoCaixaCsv}
      />
      <ReportRow
        title="Inadimplência Analítica"
        description="Atrasos com cálculo de multa (2%) e juros (1% a.m. pro-rata) e valor atualizado."
        icon={<AlertTriangle className="h-4 w-4" />}
        onGeneratePDF={handleInadimplenciaPdf}
        onDownloadCSV={handleInadimplenciaCsv}
      />
      <ReportRow
        title="Saldo Bancário Progressivo"
        description="Evolução diária de saldos com variação do dia e acumulado resultante."
        icon={<Calculator className="h-4 w-4" />}
        onGeneratePDF={handleSaldoBancarioPdf}
        onDownloadCSV={handleSaldoBancarioCsv}
      />
      <ReportRow
        title="Conciliação Bancária"
        description="Comparativo entre extratos importados e lançamentos do sistema."
        icon={<FileCheck className="h-4 w-4" />}
        onGeneratePDF={handleConciliacaoPdf}
        onDownloadCSV={handleConciliacaoCsv}
      />
    </ReportsTable>
  );
};
