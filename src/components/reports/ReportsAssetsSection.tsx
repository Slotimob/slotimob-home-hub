import { useState } from 'react';
import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { RAReportConfigDialog } from './RAReportConfigDialog';
import { Building2, TrendingUp, Shield, Receipt, FileText, BarChart3, Users, Wrench, AlertTriangle, CalendarClock, CircleDollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { translateUnitStatus } from '@/utils/reportTranslations';
import { generateOwnerReportPDF, formatCurrency as formatCurrencyReport } from '@/utils/leaseReportGenerator';
import { generateTenantStatementPDF } from '@/utils/tenantStatementPdf';
import { downloadReportDocx, downloadReportExcel } from '@/utils/reportMultiFormat';
import { generateAssetReportPdf } from '@/utils/assetReportPdfGenerator';
import { generateAssetReportDocx } from '@/utils/assetReportDocxGenerator';
import { generateAssetReportExcel } from '@/utils/assetReportExcelGenerator';
import { generateAssetReportCsv } from '@/utils/assetReportCsvGenerator';
import type { AssetReportData } from '@/lib/asset-report-data';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, differenceInMonths, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { activityTypeLabel } from '@/lib/activity-types';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PaymentHistoryItem } from '@/utils/tenantStatementPdf';
import { parseDateOnly, toDateOnly } from "@/lib/date-only";

interface ReportsAssetsSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsAssetsSection = ({ dateRange, userName, selectedUnitId }: ReportsAssetsSectionProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const maintenanceBrokerId = effectiveBrokerId || user?.id || null;
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [raConfigOpen, setRaConfigOpen] = useState(false);
  const [raFormat, setRaFormat] = useState<'pdf' | 'docx' | 'excel' | 'csv'>('pdf');

  const handleRaGenerate = async (data: AssetReportData) => {
    try {
      if (raFormat === 'pdf') await generateAssetReportPdf(data);
      else if (raFormat === 'docx') await generateAssetReportDocx(data);
      else if (raFormat === 'excel') await generateAssetReportExcel(data);
      else generateAssetReportCsv(data);
      toast({ title: `${raFormat.toUpperCase()} gerado com sucesso!`, duration: 1000 });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar relatório', description: e.message, variant: 'destructive', duration: 1000 });
    }
  };

  const openRaConfig = (fmt: 'pdf' | 'docx' | 'excel' | 'csv') => {
    setRaFormat(fmt);
    setRaConfigOpen(true);
  };

  // === Resumo de Manutenções (property_activities) ===
  const { data: maintenanceSummary } = useQuery({
    queryKey: [
      'reports-maintenance-summary',
      maintenanceBrokerId,
      selectedUnitId,
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      if (!maintenanceBrokerId) return null;
      let query = (supabase as any)
        .from('property_activities')
        .select('id, activity_type, scheduled_at, created_at, is_completed, estimated_cost, unit_id, property_id')
        .eq('broker_id', maintenanceBrokerId)
        .limit(2000);
      if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
      const { data, error } = await query;
      if (error) throw error;

      const fromStr = format(dateRange.from, 'yyyy-MM-dd');
      const toStr = format(dateRange.to, 'yyyy-MM-dd');
      const rows = (data || []).filter((r: any) => {
        const d = r.scheduled_at || r.created_at;
        if (!d) return false;
        const day = String(d).slice(0, 10);
        return day >= fromStr && day <= toStr;
      });

      const today = format(new Date(), 'yyyy-MM-dd');
      const inSevenDays = format(new Date(Date.now() + 7 * 24 * 3600 * 1000), 'yyyy-MM-dd');

      const byType: Record<string, number> = {};
      let overdue = 0;
      let upcoming = 0;
      let completed = 0;
      let estimatedCost = 0;

      for (const r of rows) {
        const label = activityTypeLabel(r.activity_type);
        byType[label] = (byType[label] || 0) + 1;
        estimatedCost += Number(r.estimated_cost || 0);
        if (r.is_completed) { completed++; continue; }
        const day = String(r.scheduled_at || r.created_at).slice(0, 10);
        if (day < today) overdue++;
        else if (day <= inSevenDays) upcoming++;
      }

      return {
        total: rows.length,
        completed,
        pending: rows.length - completed,
        overdue,
        upcoming,
        estimatedCost,
        byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      };
    },
    enabled: !!maintenanceBrokerId,
    staleTime: 30_000,
  });

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
      await generateOwnerReportPDF({
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
          const td = parseDateOnly(t.due_date);
          if (!td) return false;
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

  // === Histórico de Inquilinos ===
  const buildTenantHistoryData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    let query = (supabase as any)
      .from('unit_tenant_history')
      .select(`id, unit_id, tenant_contact_id, moved_in_at, moved_out_at, source, notes, unit:units(unit_number, property:properties(name)), tenant:contacts(name)`)
      .eq('broker_id', user.id)
      .order('moved_in_at', { ascending: false });
    if (selectedUnitId) query = query.eq('unit_id', selectedUnitId);
    const { data, error } = await query;
    if (error) throw error;

    const fromStr = toDateOnly(dateRange.from);
    const toStr = toDateOnly(dateRange.to);
    const records = (data || []).filter((r: any) => {
      if (!r.moved_out_at) return true; // registros em aberto sempre entram
      const movedIn = (r.moved_in_at || '').split('T')[0];
      return movedIn >= fromStr && movedIn <= toStr;
    });

    const tableData = records.map((r: any) => {
      const isCurrent = !r.moved_out_at;
      const start = r.moved_in_at ? new Date(`${String(r.moved_in_at).split('T')[0]}T12:00:00`) : null;
      const end = r.moved_out_at ? new Date(`${String(r.moved_out_at).split('T')[0]}T12:00:00`) : new Date();
      const months = start ? Math.max(0, differenceInMonths(end, start)) : 0;
      return [
        r.unit?.unit_number || (r.unit_id ? String(r.unit_id).substring(0, 8) : '-'),
        r.unit?.property?.name || 'Imóvel Avulso',
        r.tenant?.name || '-',
        r.moved_in_at ? formatDate(r.moved_in_at) : '-',
        r.moved_out_at ? formatDate(r.moved_out_at) : '-',
        String(months),
        isCurrent ? 'Atual' : 'Encerrado',
      ];
    });

    const currentCount = records.filter((r: any) => !r.moved_out_at).length;
    const columns = ['Unidade', 'Empreendimento', 'Inquilino', 'Data de Entrada', 'Data de Saída', 'Duração (meses)', 'Status'];
    const summary = [
      { label: 'Total de Registros', value: records.length.toString() },
      { label: 'Inquilinos Atuais', value: currentCount.toString() },
      { label: 'Ocupações Encerradas', value: (records.length - currentCount).toString() },
    ];
    return { tableData, columns, summary };
  };

  const handleTenantHistoryPdf = async () => {
    try {
      const { tableData, columns, summary } = await buildTenantHistoryData();
      await generateReportPdf({
        title: 'Histórico de Inquilinos', subtitle: 'Entradas e saídas de inquilinos por unidade',
        userName, dateRange, columns, data: tableData, filename: 'historico-inquilinos', landscape: true, summary,
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' }); }
  };

  const handleTenantHistoryCsv = async () => {
    try {
      const { tableData, columns } = await buildTenantHistoryData();
      generateReportCsv({
        columns,
        data: tableData.map((row: string[]) => [row[0], row[1], row[2], cleanDateValue(row[3]), cleanDateValue(row[4]), cleanNumericValue(Number(row[5]) || 0), row[6]]),
        filename: 'historico-inquilinos',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' }); }
  };

  const handleTenantHistoryDocx = async () => {
    try {
      const { tableData, columns, summary } = await buildTenantHistoryData();
      await downloadReportDocx({ title: 'Histórico de Inquilinos', reportKey: 'historico-inquilinos', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Word gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Word', description: error.message, variant: 'destructive' }); }
  };

  const handleTenantHistoryExcel = async () => {
    try {
      const { tableData, columns, summary } = await buildTenantHistoryData();
      await downloadReportExcel({ title: 'Histórico de Inquilinos', reportKey: 'historico-inquilinos', dateRange, columnLabels: columns, data: tableData, summary });
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) { toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' }); }
  };

  // === Reajustes ===
  const buildReajustesData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    let query = supabase.from('leases').select(`*, unit:units(unit_number), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
      .eq('broker_id', user.id).eq('status', 'active')
      .gte('next_adjustment_date', toDateOnly(dateRange.from)).lte('next_adjustment_date', toDateOnly(dateRange.to));
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
        .gte('next_adjustment_date', toDateOnly(dateRange.from)).lte('next_adjustment_date', toDateOnly(dateRange.to));
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
      {maintenanceSummary && maintenanceSummary.total > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Resumo de Manutenções no período</Label>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground">Atividades</p>
              <p className="text-lg font-semibold">{maintenanceSummary.total}</p>
              <p className="text-[11px] text-muted-foreground">
                {maintenanceSummary.completed} concluída(s) · {maintenanceSummary.pending} pendente(s)
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Em atraso
              </p>
              <p className="text-lg font-semibold text-destructive">{maintenanceSummary.overdue}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Próximos 7 dias
              </p>
              <p className="text-lg font-semibold">{maintenanceSummary.upcoming}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CircleDollarSign className="h-3 w-3" /> Custo estimado
              </p>
              <p className="text-lg font-semibold">{formatCurrency(maintenanceSummary.estimatedCost)}</p>
            </div>
          </div>

          {maintenanceSummary.byType.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {maintenanceSummary.byType.map(([label, count]) => (
                <Badge key={label} variant="secondary" className="text-[11px] font-normal">
                  {label}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

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
          title="Relatório Completo do Imóvel"
          description="Aquisição, valor de mercado, despesas, manutenções e atividades em período selecionável."
          icon={<BarChart3 className="h-4 w-4" />}
          onGeneratePDF={async () => openRaConfig('pdf')}
          onDownloadCSV={async () => openRaConfig('csv')}
          onDownloadDocx={async () => openRaConfig('docx')}
          onDownloadExcel={async () => openRaConfig('excel')}
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
        <ReportRow
          title="Histórico de Inquilinos"
          description="Registro de entrada e saída de inquilinos por unidade, com duração de ocupação."
          icon={<Users className="h-4 w-4" />}
          onGeneratePDF={handleTenantHistoryPdf}
          onDownloadCSV={handleTenantHistoryCsv}
          onDownloadDocx={handleTenantHistoryDocx}
          onDownloadExcel={handleTenantHistoryExcel}
        />
      </ReportsTable>

      <RAReportConfigDialog
        open={raConfigOpen}
        onOpenChange={setRaConfigOpen}
        dateRange={dateRange}
        onGenerate={handleRaGenerate}
        formatLabel={raFormat.toUpperCase()}
      />
    </div>
  );
};
