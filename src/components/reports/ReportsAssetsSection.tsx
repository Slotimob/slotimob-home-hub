import { useState } from 'react';
import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { Building2, TrendingUp, Shield, Receipt, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { translateUnitStatus } from '@/utils/reportTranslations';
import { generateOwnerReportPDF, formatCurrency as formatCurrencyReport } from '@/utils/leaseReportGenerator';
import { generateTenantStatementPDF } from '@/utils/tenantStatementPdf';
import { downloadReportDocx, downloadReportExcel } from '@/utils/reportMultiFormat';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PaymentHistoryItem } from '@/utils/tenantStatementPdf';

interface ReportsAssetsSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsAssetsSection = ({ dateRange, userName, selectedUnitId }: ReportsAssetsSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');

  const { data: activeLeases = [] } = useQuery({
    queryKey: ['active-leases-for-reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('leases').select(`
        id, unit_id, rent_amount, admin_fee_percentage, due_day, start_date, end_date, status,
        is_dimob_deductible, cib, adjustment_index, next_adjustment_date,
        unit:units(id, unit_number, address, property:properties(name, address)),
        tenant:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, document_number),
        owner:contacts!leases_owner_contact_id_fkey(id, name, email, phone)
      `).eq('broker_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filteredLeases = selectedUnitId ? activeLeases.filter(l => l.unit_id === selectedUnitId) : activeLeases;
  const selectedLease = activeLeases.find(l => l.id === selectedLeaseId) || null;

  // === Owner Report (PDF only) ===
  const handleOwnerReportPdf = async () => {
    if (!selectedLease) { toast({ title: 'Selecione um contrato', variant: 'destructive' }); return; }
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');
      const { data: income } = await supabase.from('financial_transactions').select('*')
        .eq('unit_id', selectedLease.unit_id).eq('type', 'income').eq('status', 'paid')
        .gte('paid_date', format(dateRange.from, 'yyyy-MM-dd')).lte('paid_date', format(dateRange.to, 'yyyy-MM-dd'));
      const { data: expenses } = await supabase.from('financial_transactions').select('*')
        .eq('unit_id', selectedLease.unit_id).eq('type', 'expense').eq('status', 'paid')
        .gte('paid_date', format(dateRange.from, 'yyyy-MM-dd')).lte('paid_date', format(dateRange.to, 'yyyy-MM-dd'));
      const rentReceived = (income || []).reduce((s, t) => s + Number(t.amount), 0);
      const adminFee = rentReceived * (selectedLease.admin_fee_percentage / 100);
      const maintenanceExpenses = (expenses || []).filter(t => t.obligation_type === 'maintenance' || t.description.toLowerCase().includes('manutenção'))
        .map(t => ({ description: t.description, amount: Number(t.amount), date: t.paid_date || t.transaction_date }));
      const otherDeductions = (expenses || []).filter(t => t.obligation_type !== 'maintenance' && !t.description.toLowerCase().includes('manutenção'))
        .map(t => ({ description: t.description, amount: Number(t.amount) }));
      const totalExpenses = (expenses || []).reduce((s, t) => s + Number(t.amount), 0);
      const netTransfer = rentReceived - adminFee - totalExpenses;
      generateOwnerReportPDF({
        lease: selectedLease as any,
        period: { start: format(dateRange.from, 'dd/MM/yyyy'), end: format(dateRange.to, 'dd/MM/yyyy') },
        rentReceived, adminFee, maintenanceExpenses, otherDeductions, netTransfer,
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  // === Tenant Statement (PDF only) ===
  const handleTenantStatementPdf = async () => {
    if (!selectedLease) { toast({ title: 'Selecione um contrato', variant: 'destructive' }); return; }
    try {
      const months = Math.max(1, Math.round(differenceInDays(dateRange.to, dateRange.from) / 30));
      const { data: transactions } = await supabase.from('financial_transactions').select('*')
        .eq('unit_id', selectedLease.unit_id).eq('type', 'income')
        .gte('due_date', format(dateRange.from, 'yyyy-MM-dd')).lte('due_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true });
      const payments: PaymentHistoryItem[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        if (monthDate < dateRange.from || monthDate > dateRange.to) continue;
        const monthStr = format(monthDate, 'MMMM/yyyy', { locale: ptBR });
        const dueDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), selectedLease.due_day);
        const transaction = (transactions || []).find(t => {
          if (!t.due_date) return false;
          const td = new Date(t.due_date);
          return td.getMonth() === monthDate.getMonth() && td.getFullYear() === monthDate.getFullYear();
        });
        const isPaid = transaction?.status === 'paid';
        const isOverdue = !isPaid && dueDate < new Date();
        payments.push({
          month: monthStr.charAt(0).toUpperCase() + monthStr.slice(1), reference: format(monthDate, 'MM/yyyy'),
          dueDate: format(dueDate, 'yyyy-MM-dd'), paidDate: transaction?.paid_date || null,
          amount: selectedLease.rent_amount, lateFee: 0,
          totalPaid: isPaid ? (transaction?.amount || selectedLease.rent_amount) : 0,
          status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        });
      }
      generateTenantStatementPDF({
        lease: selectedLease as any, payments,
        period: { start: format(dateRange.from, 'dd/MM/yyyy'), end: format(dateRange.to, 'dd/MM/yyyy') },
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  // === Vacância ===
  const buildVacanciaData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario nao autenticado');
    let query = supabase.from('units').select(`*, property:properties(name, address), owner:contacts!units_owner_contact_id_fkey(name)`)
      .eq('broker_id', user.id);
    if (selectedUnitId) query = query.eq('id', selectedUnitId);
    const { data: units } = await query;
    const periodDays = differenceInDays(dateRange.to, dateRange.from);
    let totalOpportunityCost = 0;
    const tableData = (units || []).map(u => {
      const isVacant = u.status === 'available';
      const estimatedRent = u.rent_price || 0;
      const dailyRate = estimatedRent / 30;
      let daysVacantInPeriod = 0, opportunityCost = 0;
      if (isVacant) { daysVacantInPeriod = periodDays; opportunityCost = dailyRate * daysVacantInPeriod; totalOpportunityCost += opportunityCost; }
      const address = u.address || u.property?.address || '';
      const shortAddress = address.length > 30 ? address.substring(0, 30) + '...' : address;
      return [u.unit_number || u.id.substring(0, 8), u.property?.name || 'Imovel Avulso', u.owner?.name || '-', shortAddress || '-', translateUnitStatus(u.status), formatCurrency(estimatedRent), isVacant ? daysVacantInPeriod.toString() : '-', isVacant ? formatCurrency(opportunityCost) : '-'];
    });
    const vacant = (units || []).filter(u => u.status === 'available');
    const occupied = (units || []).filter(u => u.status === 'rented');
    const vacancyRate = units?.length ? (vacant.length / units.length) * 100 : 0;
    const columns = ['Unidade', 'Empreendimento', 'Proprietario', 'Endereco', 'Status', 'Aluguel', 'Dias Vago', 'Perda Acumulada'];
    const summary = [
      { label: 'Total de Unidades', value: (units || []).length.toString() },
      { label: 'Unidades Vagas', value: vacant.length.toString() },
      { label: 'Unidades Ocupadas', value: occupied.length.toString() },
      { label: 'Taxa de Vacancia', value: `${vacancyRate.toFixed(1)}%` },
    ];
    return { tableData, columns, summary, totalOpportunityCost };
  };

  const handleVacanciaPdf = async () => {
    try {
      const { tableData, columns, summary, totalOpportunityCost } = await buildVacanciaData();
      await generateReportPdf({
        title: 'Relatorio de Vacancia', subtitle: 'Analise de ocupacao com custo de oportunidade',
        userName, dateRange, columns, data: tableData, filename: 'relatorio-vacancia', landscape: true, summary,
        insights: totalOpportunityCost > 0 ? [`Neste periodo, voce deixou de arrecadar ${formatCurrency(totalOpportunityCost)} devido a vacancia.`] : undefined,
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleVacanciaCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      let query = supabase.from('units').select(`*, property:properties(name)`).eq('broker_id', user.id);
      if (selectedUnitId) query = query.eq('id', selectedUnitId);
      const { data: units } = await query;
      generateReportCsv({
        columns: ['Unidade', 'Empreendimento', 'Tipo', 'Status', 'Valor Aluguel', 'Área'],
        data: (units || []).map(u => [u.unit_number || u.id.substring(0, 8), u.property?.name || '', u.property_type || '', u.status, cleanNumericValue(u.rent_price || 0), cleanNumericValue(u.area || 0)]),
        filename: 'relatorio-vacancia',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleVacanciaDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildVacanciaData();
      await downloadReportDocx({ title: 'Relatório de Vacância', reportKey: 'relatorio-vacancia', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleVacanciaExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildVacanciaData();
      await downloadReportExcel({ title: 'Relatório de Vacância', reportKey: 'relatorio-vacancia', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  // === Reajustes ===
  const buildReajustesData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    let query = supabase.from('leases').select(`*, unit:units(unit_number), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
      .eq('broker_id', user.id).eq('status', 'active')
      .gte('next_adjustment_date', dateRange.from.toISOString().split('T')[0]).lte('next_adjustment_date', dateRange.to.toISOString().split('T')[0]);
    if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
    const { data: leases } = await query;
    const columns = ['Data Reajuste', 'Unidade', 'Inquilino', 'Índice', 'Valor Atual', 'Valor Projetado'];
    const tableData = (leases || []).map(l => {
      const projectedValue = l.rent_amount * 1.05;
      return [formatDate(l.next_adjustment_date || ''), l.unit?.unit_number || '-', l.tenant?.name || '-', l.adjustment_index || 'IGPM', formatCurrency(l.rent_amount), formatCurrency(projectedValue)];
    });
    const summary = [{ label: 'Total de Contratos', value: (leases || []).length.toString() }];
    return { tableData, columns, summary };
  };

  const handleReajustesPdf = async () => {
    try {
      const { tableData, columns, summary } = await buildReajustesData();
      await generateReportPdf({ title: 'Projeção de Reajustes', subtitle: 'Contratos com reajuste previsto no período (projeção estimada de 5%)', userName, dateRange, columns, data: tableData, filename: 'projecao-reajustes', summary });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleReajustesCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      let query = supabase.from('leases').select(`*, unit:units(unit_number), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
        .eq('broker_id', user.id).eq('status', 'active')
        .gte('next_adjustment_date', dateRange.from.toISOString().split('T')[0]).lte('next_adjustment_date', dateRange.to.toISOString().split('T')[0]);
      if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
      const { data: leases } = await query;
      generateReportCsv({
        columns: ['Data Reajuste', 'Unidade', 'Inquilino', 'Aluguel Atual', 'Índice', 'Início Contrato'],
        data: (leases || []).map(l => [cleanDateValue(l.next_adjustment_date), l.unit?.unit_number || '', l.tenant?.name || '', cleanNumericValue(l.rent_amount), l.adjustment_index || 'IGPM', cleanDateValue(l.start_date)]),
        filename: 'projecao-reajustes',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleReajustesDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildReajustesData();
      await downloadReportDocx({ title: 'Projeção de Reajustes', reportKey: 'projecao-reajustes', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleReajustesExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildReajustesData();
      await downloadReportExcel({ title: 'Projeção de Reajustes', reportKey: 'projecao-reajustes', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  const handleSegurosPdf = async () => { toast({ title: 'Em desenvolvimento', description: 'O módulo de seguros será implementado em breve.' }); };
  const handleSegurosCsv = async () => { toast({ title: 'Em desenvolvimento', description: 'O módulo de seguros será implementado em breve.' }); };

  return (
    <div className="space-y-6">
      {filteredLeases.length > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Contrato Ativo (para Relatório do Proprietário e Extrato do Inquilino)</Label>
          </div>
          <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder="Selecione um contrato..." />
            </SelectTrigger>
            <SelectContent>
              {filteredLeases.map((lease) => (
                <SelectItem key={lease.id} value={lease.id}>
                  {lease.unit?.unit_number || 'Unidade'} — {lease.tenant?.name || 'Inquilino'} ({formatCurrencyReport(lease.rent_amount)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedLeaseId && (
            <p className="text-xs text-muted-foreground">Selecione um contrato para gerar relatórios de prestação de contas.</p>
          )}
        </div>
      )}

      <ReportsTable
        title="Relatórios de Ativos"
        icon={<Building2 className="h-5 w-5" />}
        description="Prestação de contas, vacância, projeção de reajustes e controle de seguros."
      >
        <ReportRow
          title="Relatório do Proprietário"
          description="Prestação de contas com receitas, deduções e repasse líquido ao proprietário."
          icon={<Receipt className="h-4 w-4" />}
          onGeneratePDF={handleOwnerReportPdf}
          onDownloadCSV={async () => { toast({ title: 'Disponível apenas em PDF', description: 'Este relatório é gerado exclusivamente em formato PDF.' }); }}
          pdfDisabled={!selectedLeaseId}
          csvDisabled={true}
        />
        <ReportRow
          title="Extrato do Inquilino"
          description="Histórico de pagamentos, saldo devedor e próximos vencimentos do inquilino."
          icon={<FileText className="h-4 w-4" />}
          onGeneratePDF={handleTenantStatementPdf}
          onDownloadCSV={async () => { toast({ title: 'Disponível apenas em PDF', description: 'Este relatório é gerado exclusivamente em formato PDF.' }); }}
          pdfDisabled={!selectedLeaseId}
          csvDisabled={true}
        />

        <Separator />

        <ReportRow
          title="Relatório de Vacância"
          description="Ocupação do portfólio com dias vagos e custo de oportunidade calculado."
          icon={<Building2 className="h-4 w-4" />}
          onGeneratePDF={handleVacanciaPdf}
          onDownloadCSV={handleVacanciaCsv}
          onDownloadDocx={handleVacanciaDocx}
          onDownloadExcel={handleVacanciaExcel}
        />
        <ReportRow
          title="Projeção de Reajustes"
          description="Contratos com reajuste previsto, valor projetado e alerta de seguro vencido."
          icon={<TrendingUp className="h-4 w-4" />}
          onGeneratePDF={handleReajustesPdf}
          onDownloadCSV={handleReajustesCsv}
          onDownloadDocx={handleReajustesDocx}
          onDownloadExcel={handleReajustesExcel}
        />
        <ReportRow
          title="Vigência de Seguros"
          description="Controle de vencimento de seguros dos imóveis administrados."
          icon={<Shield className="h-4 w-4" />}
          onGeneratePDF={handleSegurosPdf}
          onDownloadCSV={handleSegurosCsv}
          warningMessage="Em desenvolvimento"
        />
      </ReportsTable>
    </div>
  );
};
