import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { 
  AlertOctagon, 
  ShieldAlert, 
  ArrowLeftRight, 
  CalendarClock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { translateType, translateLeaseStatus } from '@/utils/reportTranslations';
import { useToast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportsAuditSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsAuditSection = ({ dateRange, userName, selectedUnitId }: ReportsAuditSectionProps) => {
  const { toast } = useToast();

  // 1. Inconsistências de Lançamento - orphan transactions
  const handleInconsistenciasPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          bank_account:bank_accounts(name),
          unit:units(unit_number),
          category:financial_categories(name)
        `)
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: transactions } = await query;

      // Filter orphan transactions
      const orphans = (transactions || []).filter(t => 
        !t.bank_account_id || !t.unit_id || !t.category_id
      );

      const tableData = orphans.map(t => {
        const problems: string[] = [];
        if (!t.bank_account_id) problems.push('Conta Bancaria');
        if (!t.unit_id) problems.push('Unidade');
        if (!t.category_id) problems.push('Categoria');

        return [
          formatDate(t.transaction_date),
          t.description?.substring(0, 40) || '-',
          translateType(t.type),
          formatCurrency(t.amount),
          problems.join(', '),
        ];
      });

      await generateReportPdf({
        title: 'Inconsistencias de Lancamento',
        subtitle: 'Transacoes incompletas ou orfas que precisam de correcao',
        userName,
        dateRange,
        columns: ['Data', 'Descricao', 'Tipo', 'Valor', 'Campos Ausentes'],
        data: tableData,
        filename: 'inconsistencias-lancamento',
        landscape: true,
        highlightCondition: () => true,
        summary: [
          { label: 'Total de Inconsistencias', value: orphans.length.toString() },
          { label: 'Sem Conta Bancaria', value: orphans.filter(t => !t.bank_account_id).length.toString() },
          { label: 'Sem Unidade', value: orphans.filter(t => !t.unit_id).length.toString() },
          { label: 'Sem Categoria', value: orphans.filter(t => !t.category_id).length.toString() },
        ],
        insights: orphans.length > 0 
          ? [`Foram encontradas ${orphans.length} transacoes com dados incompletos. Corrija-as para garantir integridade nos relatorios.`]
          : ['Nenhuma inconsistencia encontrada. Seus lancamentos estao completos!'],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleInconsistenciasCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('financial_transactions')
        .select(`*, bank_account:bank_accounts(name), unit:units(unit_number), category:financial_categories(name)`)
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: transactions } = await query;

      const orphans = (transactions || []).filter(t => 
        !t.bank_account_id || !t.unit_id || !t.category_id
      );

      generateReportCsv({
        columns: ['Data', 'Descrição', 'Valor', 'Tipo', 'Tem Conta', 'Tem Unidade', 'Tem Categoria'],
        data: orphans.map(t => [
          cleanDateValue(t.transaction_date),
          t.description,
          cleanNumericValue(t.amount),
          t.type,
          t.bank_account_id ? 'Sim' : 'Não',
          t.unit_id ? 'Sim' : 'Não',
          t.category_id ? 'Sim' : 'Não',
        ]),
        filename: 'inconsistencias-lancamento',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // 2. Risco de Conciliação - paid but not reconciled
  const handleRiscoConciliacaoPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          bank_account:bank_accounts(name)
        `)
        .eq('broker_id', user.id)
        .eq('status', 'paid')
        .eq('is_reconciled', false)
        .gte('paid_date', dateRange.from.toISOString().split('T')[0])
        .lte('paid_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: transactions } = await query;

      let totalValue = 0;
      const tableData = (transactions || []).map(t => {
        totalValue += t.amount;
        return [
          formatDate(t.due_date || ''),
          formatDate(t.paid_date || ''),
          t.description,
          t.bank_account?.name || '-',
          formatCurrency(t.amount),
          'Pago - Não Conciliado',
        ];
      });

      await generateReportPdf({
        title: 'Risco de Conciliacao',
        subtitle: 'Transacoes marcadas como pagas que nao foram validadas no extrato bancario',
        userName,
        dateRange,
        columns: ['Vencimento', 'Pagamento', 'Descricao', 'Conta', 'Valor', 'Status'],
        data: tableData,
        filename: 'risco-conciliacao',
        landscape: true,
        highlightCondition: () => true,
        summary: [
          { label: 'Transacoes em Risco', value: (transactions || []).length.toString() },
          { label: 'Valor Total Nao Conciliado', value: formatCurrency(totalValue) },
        ],
        insights: (transactions || []).length > 0
          ? [`Existem ${(transactions || []).length} transacoes (${formatCurrency(totalValue)}) marcadas como pagas, mas sem confirmacao no extrato. Verifique possiveis erros de lancamento.`]
          : ['Todas as transacoes pagas foram devidamente conciliadas.'],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleRiscoConciliacaoCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('financial_transactions')
        .select(`*, bank_account:bank_accounts(name)`)
        .eq('broker_id', user.id)
        .eq('status', 'paid')
        .eq('is_reconciled', false)
        .gte('paid_date', dateRange.from.toISOString().split('T')[0])
        .lte('paid_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: transactions } = await query;

      generateReportCsv({
        columns: ['Vencimento', 'Pagamento', 'Descrição', 'Conta', 'Valor', 'Tipo'],
        data: (transactions || []).map(t => [
          cleanDateValue(t.due_date),
          cleanDateValue(t.paid_date),
          t.description,
          t.bank_account?.name || '',
          cleanNumericValue(t.amount),
          t.type,
        ]),
        filename: 'risco-conciliacao',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // 3. Transferências Internas - internal transfers between accounts
  const handleTransferenciasPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch transactions that are transfers (group_id indicates paired transactions)
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          bank_account:bank_accounts(name)
        `)
        .eq('broker_id', user.id)
        .not('group_id', 'is', null)
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      // Group transfers by group_id
      const groupedTransfers: Record<string, typeof transactions> = {};
      (transactions || []).forEach(t => {
        if (t.group_id) {
          if (!groupedTransfers[t.group_id]) groupedTransfers[t.group_id] = [];
          groupedTransfers[t.group_id].push(t);
        }
      });

      let totalTransfers = 0;
      const tableData: (string | number)[][] = [];

      Object.values(groupedTransfers).forEach(group => {
        if (group.length >= 2) {
          const outgoing = group.find(t => t.type === 'expense');
          const incoming = group.find(t => t.type === 'income');
          
          if (outgoing && incoming) {
            totalTransfers += outgoing.amount;
            tableData.push([
              formatDate(outgoing.transaction_date),
              outgoing.bank_account?.name || '-',
              incoming.bank_account?.name || '-',
              formatCurrency(outgoing.amount),
              outgoing.description || 'Transferência',
            ]);
          }
        }
      });

      await generateReportPdf({
        title: 'Transferencias Internas',
        subtitle: 'Auditoria de movimentacoes entre contas proprias',
        userName,
        dateRange,
        columns: ['Data', 'Conta Origem', 'Conta Destino', 'Valor', 'Descricao'],
        data: tableData,
        filename: 'transferencias-internas',
        landscape: true,
        summary: [
          { label: 'Total de Transferencias', value: tableData.length.toString() },
          { label: 'Volume Total Movimentado', value: formatCurrency(totalTransfers) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleTransferenciasCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select(`*, bank_account:bank_accounts(name)`)
        .eq('broker_id', user.id)
        .not('group_id', 'is', null)
        .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);

      const groupedTransfers: Record<string, typeof transactions> = {};
      (transactions || []).forEach(t => {
        if (t.group_id) {
          if (!groupedTransfers[t.group_id]) groupedTransfers[t.group_id] = [];
          groupedTransfers[t.group_id].push(t);
        }
      });

      const csvData: (string | number)[][] = [];
      Object.values(groupedTransfers).forEach(group => {
        if (group.length >= 2) {
          const outgoing = group.find(t => t.type === 'expense');
          const incoming = group.find(t => t.type === 'income');
          if (outgoing && incoming) {
            csvData.push([
              cleanDateValue(outgoing.transaction_date),
              outgoing.bank_account?.name || '',
              incoming.bank_account?.name || '',
              cleanNumericValue(outgoing.amount),
              outgoing.description || '',
            ]);
          }
        }
      });

      generateReportCsv({
        columns: ['Data', 'Conta Origem', 'Conta Destino', 'Valor', 'Descrição'],
        data: csvData,
        filename: 'transferencias-internas',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // 4. Auditoria de Projeções - missing future income projections
  const handleProjecoesPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get active leases
      let leasesQuery = supabase
        .from('leases')
        .select(`
          *,
          unit:units(unit_number, id),
          tenant:contacts!leases_tenant_contact_id_fkey(name)
        `)
        .eq('broker_id', user.id)
        .eq('status', 'active');

      if (selectedUnitId) {
        leasesQuery = leasesQuery.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await leasesQuery;

      // Check next 60 days for future income
      const today = new Date();
      const futureDate = addDays(today, 60);

      const { data: futureTransactions } = await supabase
        .from('financial_transactions')
        .select('unit_id')
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0]);

      const unitsWithProjections = new Set((futureTransactions || []).map(t => t.unit_id));

      // Find leases without future projections
      const missingProjections = (leases || []).filter(l => 
        l.unit_id && !unitsWithProjections.has(l.unit_id)
      );

      // Get last income transaction per unit to show "Última Parcela Lançada"
      const unitIds = (leases || []).map(l => l.unit_id).filter(Boolean);
      const { data: lastTransactions } = unitIds.length > 0 
        ? await supabase
            .from('financial_transactions')
            .select('unit_id, due_date')
            .eq('broker_id', user.id)
            .eq('type', 'income')
            .in('unit_id', unitIds)
            .order('due_date', { ascending: false })
        : { data: [] };

      // Build map of last transaction per unit
      const lastTxMap = new Map<string, string>();
      (lastTransactions || []).forEach(t => {
        if (t.unit_id && !lastTxMap.has(t.unit_id)) {
          lastTxMap.set(t.unit_id, t.due_date);
        }
      });

      const tableData = missingProjections.map(l => [
        l.unit?.unit_number || '-',
        l.tenant?.name || '-',
        formatDate(l.end_date || ''),
        lastTxMap.get(l.unit_id) ? formatDate(lastTxMap.get(l.unit_id)!) : 'Nunca',
        translateLeaseStatus(l.status),
      ]);

      await generateReportPdf({
        title: 'Auditoria de Projecoes',
        subtitle: 'Unidades com contrato ativo sem lancamentos futuros de receita (proximos 60 dias)',
        userName,
        dateRange,
        columns: ['Unidade', 'Inquilino', 'Termino Contrato', 'Ultima Parcela', 'Status'],
        data: tableData,
        filename: 'auditoria-projecoes',
        landscape: true,
        highlightCondition: () => true,
        summary: [
          { label: 'Contratos Ativos', value: (leases || []).length.toString() },
          { label: 'Sem Projecao Futura', value: missingProjections.length.toString() },
          { label: 'Com Projecao OK', value: ((leases || []).length - missingProjections.length).toString() },
        ],
        insights: missingProjections.length > 0
          ? [`${missingProjections.length} unidades com contrato ativo nao possuem receitas projetadas para os proximos 60 dias. Verifique se as parcelas foram lancadas corretamente.`]
          : ['Todas as unidades com contrato ativo possuem projecoes de receita para os proximos 60 dias.'],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleProjecoesCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let leasesQuery = supabase
        .from('leases')
        .select(`*, unit:units(unit_number, id), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
        .eq('broker_id', user.id)
        .eq('status', 'active');

      if (selectedUnitId) {
        leasesQuery = leasesQuery.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await leasesQuery;

      const today = new Date();
      const futureDate = addDays(today, 60);

      const { data: futureTransactions } = await supabase
        .from('financial_transactions')
        .select('unit_id')
        .eq('broker_id', user.id)
        .eq('type', 'income')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0]);

      const unitsWithProjections = new Set((futureTransactions || []).map(t => t.unit_id));

      const missingProjections = (leases || []).filter(l => 
        l.unit_id && !unitsWithProjections.has(l.unit_id)
      );

      generateReportCsv({
        columns: ['Unidade', 'Inquilino', 'Aluguel', 'Início Contrato', 'Fim Contrato', 'Status Projeção'],
        data: missingProjections.map(l => [
          l.unit?.unit_number || '',
          l.tenant?.name || '',
          cleanNumericValue(l.rent_amount || 0),
          cleanDateValue(l.start_date),
          cleanDateValue(l.end_date),
          'Sem projeção',
        ]),
        filename: 'auditoria-projecoes',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <ReportsTable
      title="Relatórios de Auditoria"
      icon={<ShieldAlert className="h-5 w-5" />}
      description="Identifique inconsistências, riscos de conciliação e lacunas operacionais para garantir integridade dos dados."
    >
      <ReportRow
        title="Inconsistências de Lançamento"
        description="Transações órfãs: sem conta bancária, unidade ou categoria definida."
        icon={<AlertOctagon className="h-4 w-4" />}
        onGeneratePDF={handleInconsistenciasPdf}
        onDownloadCSV={handleInconsistenciasCsv}
      />
      <ReportRow
        title="Risco de Conciliação"
        description="Transações pagas mas não validadas no extrato bancário."
        icon={<ShieldAlert className="h-4 w-4" />}
        onGeneratePDF={handleRiscoConciliacaoPdf}
        onDownloadCSV={handleRiscoConciliacaoCsv}
      />
      <ReportRow
        title="Transferências Internas"
        description="Auditoria de movimentações entre contas próprias."
        icon={<ArrowLeftRight className="h-4 w-4" />}
        onGeneratePDF={handleTransferenciasPdf}
        onDownloadCSV={handleTransferenciasCsv}
      />
      <ReportRow
        title="Auditoria de Projeções"
        description="Unidades com contrato ativo sem receitas projetadas para os próximos 60 dias."
        icon={<CalendarClock className="h-4 w-4" />}
        onGeneratePDF={handleProjecoesPdf}
        onDownloadCSV={handleProjecoesCsv}
      />
    </ReportsTable>
  );
};
