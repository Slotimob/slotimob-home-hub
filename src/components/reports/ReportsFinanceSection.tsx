import { useState } from 'react';
import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { CashflowReportConfigDialog, CashflowReportConfig } from './CashflowReportConfigDialog';
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
import { downloadReportDocx, downloadReportExcel } from '@/utils/reportMultiFormat';
import { buildCashflowExport } from '@/lib/cashflow-export-data';
import { generateCashflowPdf, generateCashflowDocx, generateCashflowExcel, generateCashflowCsv } from '@/utils/cashflowExportGenerators';
import { useToast } from '@/hooks/use-toast';

interface ReportsFinanceSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsFinanceSection = ({ dateRange, userName, selectedUnitId }: ReportsFinanceSectionProps) => {
  const [cashflowConfigOpen, setCashflowConfigOpen] = useState<string | null>(null);
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

    if (type) query = query.eq('type', type);
    if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [], userId: user.id };
  };

  // === Repasse helpers ===
  const buildRepasseData = async () => {
    const { data: transactions, userId } = await fetchTransactions();
    const { data: leases } = await supabase
      .from('leases')
      .select('unit_id, admin_fee_percentage')
      .eq('broker_id', userId)
      .eq('status', 'active');
    const leaseFeeMap = new Map((leases || []).map(l => [l.unit_id, l.admin_fee_percentage || 10]));
    const byUnit: Record<string, typeof transactions> = {};
    transactions.forEach(t => {
      const unitKey = t.unit?.unit_number || 'Sem Unidade';
      if (!byUnit[unitKey]) byUnit[unitKey] = [];
      byUnit[unitKey].push(t);
    });
    const tableData: (string | number)[][] = [];
    let totalBruto = 0, totalTaxaAdmin = 0, totalOutras = 0, totalLiquido = 0;
    Object.entries(byUnit).forEach(([unitName, unitTransactions]) => {
      unitTransactions.forEach(t => {
        const valorBruto = t.type === 'income' ? t.amount : 0;
        const adminFeePerc = t.unit_id ? (leaseFeeMap.get(t.unit_id) || 10) : 10;
        const taxaAdmin = t.type === 'income' ? valorBruto * (adminFeePerc / 100) : 0;
        const outrasDed = t.type === 'expense' ? t.amount : 0;
        const valorLiquido = valorBruto - taxaAdmin - outrasDed;
        totalBruto += valorBruto; totalTaxaAdmin += taxaAdmin; totalOutras += outrasDed; totalLiquido += valorLiquido;
        tableData.push([
          formatDate(t.due_date || t.transaction_date), unitName, t.description,
          t.category?.name || '-', formatCurrency(valorBruto), formatCurrency(taxaAdmin),
          formatCurrency(outrasDed), formatCurrency(valorLiquido),
        ]);
      });
    });
    const columns = ['Data', 'Unidade', 'Descrição', 'Categoria', 'Valor Bruto', 'Taxa Admin.', 'Outras Ded.', 'Valor Líquido'];
    const summary = [
      { label: 'Total Bruto (Receitas)', value: formatCurrency(totalBruto) },
      { label: 'Total Taxa Administração', value: formatCurrency(totalTaxaAdmin) },
      { label: 'Total Outras Deduções', value: formatCurrency(totalOutras) },
      { label: 'Total a Repassar ao Proprietário', value: formatCurrency(totalLiquido) },
    ];
    return { tableData, columns, summary, totalLiquido };
  };

  const handleRepassePdf = async () => {
    try {
      const { tableData, columns, summary, totalLiquido } = await buildRepasseData();
      await generateReportPdf({
        title: 'Extrato de Repasse', subtitle: selectedUnitId ? 'Movimentações da unidade selecionada' : 'Movimentações agrupadas por unidade',
        userName, dateRange, columns, data: tableData, filename: 'extrato-repasse', landscape: true,
        footerTotals: ['TOTAIS', '', '', '', summary[0].value, summary[1].value, summary[2].value, summary[3].value],
        summary, insights: totalLiquido > 0 ? [`Total líquido a repassar ao proprietário: ${formatCurrency(totalLiquido)}`] : undefined,
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleRepasseCsv = async () => {
    try {
      const { data: transactions } = await fetchTransactions();
      generateReportCsv({
        columns: ['Data', 'Descrição', 'Unidade', 'Categoria', 'Tipo', 'Valor', 'Status', 'Conta'],
        data: transactions.map(t => [cleanDateValue(t.due_date || t.transaction_date), t.description, t.unit?.unit_number || '', t.category?.name || '', t.type, cleanNumericValue(t.amount), t.status, t.bank_account?.name || '']),
        filename: 'extrato-repasse',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleRepasseDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildRepasseData();
      await downloadReportDocx({ title: 'Extrato de Repasse', reportKey: 'extrato-repasse', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleRepasseExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildRepasseData();
      await downloadReportExcel({ title: 'Extrato de Repasse', reportKey: 'extrato-repasse', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  // === Fluxo de Caixa — uses config dialog ===
  const handleCashflowGenerate = async (config: CashflowReportConfig, formatType: string) => {
    try {
      const data = await buildCashflowExport({
        from: config.dateRange.from,
        to: config.dateRange.to,
        accountIds: config.accountIds,
        mode: config.mode,
      });
      switch (formatType) {
        case 'pdf':
          await generateCashflowPdf(data, config.mode, userName);
          toast({ title: 'PDF gerado com sucesso!' });
          break;
        case 'csv':
          generateCashflowCsv(data, config.mode);
          toast({ title: 'CSV baixado com sucesso!' });
          break;
        case 'docx':
          await generateCashflowDocx(data, config.mode);
          toast({ title: 'Word gerado com sucesso!' });
          break;
        case 'excel':
          await generateCashflowExcel(data, config.mode);
          toast({ title: 'Excel gerado com sucesso!' });
          break;
      }
    } catch (error: any) {
      toast({ title: 'Erro ao gerar relatório', description: error.message, variant: 'destructive' });
    }
  };

  const handleFluxoCaixaPdf = async () => setCashflowConfigOpen('pdf');
  const handleFluxoCaixaCsv = async () => setCashflowConfigOpen('csv');
  const handleFluxoCaixaDocx = async () => setCashflowConfigOpen('docx');
  const handleFluxoCaixaExcel = async () => setCashflowConfigOpen('excel');

  // === Inadimplência helpers ===
  const buildInadimplenciaData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    let query = supabase.from('financial_transactions').select(`*, unit:units(unit_number), contact:contacts(name)`)
      .eq('broker_id', user.id).eq('type', 'income').eq('status', 'pending').lt('due_date', new Date().toISOString().split('T')[0]).order('due_date', { ascending: true });
    if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
    const { data: overdue } = await query;
    let totalOriginal = 0, totalPenalty = 0, totalInterest = 0, totalUpdated = 0;
    const tableData = (overdue || []).map(t => {
      const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
      const { penalty, interest, total } = calculatePenaltyAndInterest(t.amount, daysOverdue);
      totalOriginal += t.amount; totalPenalty += penalty; totalInterest += interest; totalUpdated += total;
      return [formatDate(t.due_date!), t.contact?.name || '-', t.unit?.unit_number || '-', formatCurrency(t.amount), daysOverdue.toString(), formatCurrency(penalty + interest), formatCurrency(total)];
    });
    const columns = ['Vencimento', 'Contato', 'Unidade', 'Valor Original', 'Dias Atraso', 'Multa/Juros', 'Valor Atualizado'];
    const summary = [
      { label: 'Total Original em Atraso', value: formatCurrency(totalOriginal) },
      { label: 'Total Multas e Juros', value: formatCurrency(totalPenalty + totalInterest) },
      { label: 'Total Atualizado', value: formatCurrency(totalUpdated) },
      { label: 'Quantidade de Títulos', value: (overdue || []).length.toString() },
    ];
    return { tableData, columns, summary, totalOriginal, totalPenalty, totalInterest, totalUpdated, overdue };
  };

  const handleInadimplenciaPdf = async () => {
    try {
      const { tableData, columns, summary, totalOriginal, totalPenalty, totalInterest, totalUpdated } = await buildInadimplenciaData();
      await generateReportPdf({
        title: 'Inadimplência Analítica', subtitle: selectedUnitId ? 'Histórico de atrasos da unidade' : 'Recebíveis em atraso com cálculo de multa e juros (2% + 1% a.m.)',
        userName, dateRange, columns, data: tableData, filename: 'inadimplencia-analitica', landscape: true,
        footerTotals: ['TOTAIS', '', '', formatCurrency(totalOriginal), '', formatCurrency(totalPenalty + totalInterest), formatCurrency(totalUpdated)],
        summary,
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleInadimplenciaCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      let query = supabase.from('financial_transactions').select(`*, unit:units(unit_number), contact:contacts(name)`)
        .eq('broker_id', user.id).eq('type', 'income').eq('status', 'pending').lt('due_date', new Date().toISOString().split('T')[0]);
      if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
      const { data: overdue } = await query;
      generateReportCsv({
        columns: ['Vencimento', 'Descrição', 'Unidade', 'Contato', 'Valor Original', 'Dias Atraso', 'Multa', 'Juros', 'Valor Atualizado'],
        data: (overdue || []).map(t => {
          const daysOverdue = Math.floor((Date.now() - new Date(t.due_date!).getTime()) / (1000 * 60 * 60 * 24));
          const { penalty, interest, total } = calculatePenaltyAndInterest(t.amount, daysOverdue);
          return [cleanDateValue(t.due_date), t.description, t.unit?.unit_number || '', t.contact?.name || '', cleanNumericValue(t.amount), daysOverdue, cleanNumericValue(penalty), cleanNumericValue(interest), cleanNumericValue(total)];
        }),
        filename: 'inadimplencia-analitica',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleInadimplenciaDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildInadimplenciaData();
      await downloadReportDocx({ title: 'Inadimplência Analítica', reportKey: 'inadimplencia-analitica', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleInadimplenciaExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildInadimplenciaData();
      await downloadReportExcel({ title: 'Inadimplência Analítica', reportKey: 'inadimplencia-analitica', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  // === Saldo Bancário helpers ===
  const buildSaldoBancarioData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('broker_id', user.id);
    const { data: initialTransactions } = await supabase.from('financial_transactions').select('amount, type, bank_account_id')
      .eq('broker_id', user.id).eq('status', 'paid').lt('paid_date', dateRange.from.toISOString().split('T')[0]);
    const initialBalances: Record<string, number> = {};
    (accounts || []).forEach(a => { initialBalances[a.id] = a.initial_balance || 0; });
    (initialTransactions || []).forEach(t => {
      if (t.bank_account_id) {
        const change = t.type === 'income' ? t.amount : -t.amount;
        initialBalances[t.bank_account_id] = (initialBalances[t.bank_account_id] || 0) + change;
      }
    });
    const totalInitialBalance = Object.values(initialBalances).reduce((sum, b) => sum + b, 0);
    const { data: dailyTransactions } = await supabase.from('financial_transactions').select('amount, type, paid_date, bank_account_id')
      .eq('broker_id', user.id).eq('status', 'paid')
      .gte('paid_date', dateRange.from.toISOString().split('T')[0]).lte('paid_date', dateRange.to.toISOString().split('T')[0])
      .order('paid_date', { ascending: true });
    const byDate: Record<string, { credits: number; debits: number }> = {};
    (dailyTransactions || []).forEach(t => {
      const date = t.paid_date?.split('T')[0] || '';
      if (!byDate[date]) byDate[date] = { credits: 0, debits: 0 };
      if (t.type === 'income') byDate[date].credits += t.amount; else byDate[date].debits += t.amount;
    });
    const tableData: (string | number)[][] = [['Saldo Anterior', '-', '-', '-', formatCurrency(totalInitialBalance)]];
    let runningBalance = totalInitialBalance;
    Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, { credits, debits }]) => {
      const dailyChange = credits - debits; runningBalance += dailyChange;
      tableData.push([formatDate(date), formatCurrency(credits), formatCurrency(debits), formatCurrency(dailyChange), formatCurrency(runningBalance)]);
    });
    const columns = ['Data', 'Créditos', 'Débitos', 'Variação Dia', 'Saldo Acumulado'];
    const summary = [
      { label: 'Saldo Inicial (antes do período)', value: formatCurrency(totalInitialBalance) },
      { label: 'Total Créditos no Período', value: formatCurrency(Object.values(byDate).reduce((s, d) => s + d.credits, 0)) },
      { label: 'Total Débitos no Período', value: formatCurrency(Object.values(byDate).reduce((s, d) => s + d.debits, 0)) },
      { label: 'Saldo Final', value: formatCurrency(runningBalance) },
      { label: 'Contas Cadastradas', value: (accounts || []).length.toString() },
    ];
    return { tableData, columns, summary, accounts, totalInitialBalance, runningBalance, byDate };
  };

  const handleSaldoBancarioPdf = async () => {
    try {
      const { tableData, columns, summary, accounts, totalInitialBalance } = await buildSaldoBancarioData();
      await generateReportPdf({
        title: 'Saldo Bancário Progressivo', subtitle: 'Evolução diária de saldos consolidados com saldo inicial do período',
        userName, dateRange, columns, data: tableData, filename: 'saldo-bancario-progressivo', landscape: true, summary,
        insights: [`Saldo inicial calculado: ${formatCurrency(totalInitialBalance)} (soma dos saldos das ${(accounts || []).length} contas antes de ${formatDate(dateRange.from)})`],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleSaldoBancarioCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('broker_id', user.id);
      generateReportCsv({
        columns: ['Conta', 'Banco', 'Agência', 'Número', 'Saldo Atual'],
        data: (accounts || []).map(a => [a.name, a.bank_name || '', a.agency || '', a.account_number || '', cleanNumericValue(a.balance || 0)]),
        filename: 'saldo-bancario',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleSaldoBancarioDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildSaldoBancarioData();
      await downloadReportDocx({ title: 'Saldo Bancário Progressivo', reportKey: 'saldo-bancario-progressivo', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleSaldoBancarioExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildSaldoBancarioData();
      await downloadReportExcel({ title: 'Saldo Bancário Progressivo', reportKey: 'saldo-bancario-progressivo', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  // === Conciliação helpers ===
  const buildConciliacaoData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const { data: entries } = await supabase.from('bank_statement_entries').select(`*, bank_account:bank_accounts(name)`)
      .eq('broker_id', user.id).gte('entry_date', dateRange.from.toISOString().split('T')[0]).lte('entry_date', dateRange.to.toISOString().split('T')[0]);
    const reconciled = (entries || []).filter(e => e.is_reconciled).length;
    const pending = (entries || []).filter(e => !e.is_reconciled).length;
    const tableData = (entries || []).map(e => [formatDate(e.entry_date), e.bank_account?.name || '-', e.description, formatCurrency(e.amount), e.is_reconciled ? 'Conciliado' : 'Pendente']);
    const columns = ['Data', 'Conta', 'Descrição', 'Valor (R$)', 'Status'];
    const summary = [
      { label: 'Total de Lançamentos', value: (entries || []).length.toString() },
      { label: 'Conciliados', value: reconciled.toString() },
      { label: 'Pendentes', value: pending.toString() },
    ];
    return { tableData, columns, summary, entries };
  };

  const handleConciliacaoPdf = async () => {
    try {
      const { tableData, columns, summary } = await buildConciliacaoData();
      await generateReportPdf({ title: 'Conciliação Bancária', subtitle: 'Extrato importado vs lançamentos do sistema', userName, dateRange, columns, data: tableData, filename: 'conciliacao-bancaria', summary });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleConciliacaoCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      const { data: entries } = await supabase.from('bank_statement_entries').select(`*, bank_account:bank_accounts(name)`)
        .eq('broker_id', user.id).gte('entry_date', dateRange.from.toISOString().split('T')[0]).lte('entry_date', dateRange.to.toISOString().split('T')[0]);
      generateReportCsv({
        columns: ['Data', 'Conta', 'Descrição', 'Valor', 'Tipo', 'Conciliado'],
        data: (entries || []).map(e => [cleanDateValue(e.entry_date), e.bank_account?.name || '', e.description, cleanNumericValue(e.amount), e.is_credit ? 'Crédito' : 'Débito', e.is_reconciled ? 'Sim' : 'Não']),
        filename: 'conciliacao-bancaria',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleConciliacaoDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildConciliacaoData();
      await downloadReportDocx({ title: 'Conciliação Bancária', reportKey: 'conciliacao-bancaria', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleConciliacaoExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildConciliacaoData();
      await downloadReportExcel({ title: 'Conciliação Bancária', reportKey: 'conciliacao-bancaria', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
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
        onDownloadDocx={handleRepasseDocx}
        onDownloadExcel={handleRepasseExcel}
      />
      <ReportRow
        title="Fluxo de Caixa"
        description="Comparativo mensal de entradas e saídas, mostrando o saldo resultante por período."
        icon={<TrendingUp className="h-4 w-4" />}
        onGeneratePDF={handleFluxoCaixaPdf}
        onDownloadCSV={handleFluxoCaixaCsv}
        onDownloadDocx={handleFluxoCaixaDocx}
        onDownloadExcel={handleFluxoCaixaExcel}
      />
      <ReportRow
        title="Inadimplência Analítica"
        description="Atrasos com cálculo de multa (2%) e juros (1% a.m. pro-rata) e valor atualizado."
        icon={<AlertTriangle className="h-4 w-4" />}
        onGeneratePDF={handleInadimplenciaPdf}
        onDownloadCSV={handleInadimplenciaCsv}
        onDownloadDocx={handleInadimplenciaDocx}
        onDownloadExcel={handleInadimplenciaExcel}
      />
      <ReportRow
        title="Saldo Bancário Progressivo"
        description="Evolução diária de saldos com variação do dia e acumulado resultante."
        icon={<Calculator className="h-4 w-4" />}
        onGeneratePDF={handleSaldoBancarioPdf}
        onDownloadCSV={handleSaldoBancarioCsv}
        onDownloadDocx={handleSaldoBancarioDocx}
        onDownloadExcel={handleSaldoBancarioExcel}
      />
      <ReportRow
        title="Conciliação Bancária"
        description="Comparativo entre extratos importados e lançamentos do sistema."
        icon={<FileCheck className="h-4 w-4" />}
        onGeneratePDF={handleConciliacaoPdf}
        onDownloadCSV={handleConciliacaoCsv}
        onDownloadDocx={handleConciliacaoDocx}
        onDownloadExcel={handleConciliacaoExcel}
      />
    </ReportsTable>

    {cashflowConfigOpen && (
      <CashflowReportConfigDialog
        open={!!cashflowConfigOpen}
        onOpenChange={(open) => !open && setCashflowConfigOpen(null)}
        formatLabel={cashflowConfigOpen === 'pdf' ? 'PDF' : cashflowConfigOpen === 'csv' ? 'CSV' : cashflowConfigOpen === 'docx' ? 'Word' : 'Excel'}
        onGenerate={(config) => handleCashflowGenerate(config, cashflowConfigOpen)}
      />
    )}
    </>
  );
};
