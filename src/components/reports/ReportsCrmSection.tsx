import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { Target, Clock, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { translateStage, translateOrigin } from '@/utils/reportTranslations';
import { useToast } from '@/hooks/use-toast';
interface ReportsCrmSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsCrmSection = ({ dateRange, userName, selectedUnitId }: ReportsCrmSectionProps) => {
  const { toast } = useToast();

  // Performance de Conversão
  const handleConversaoPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('deals')
        .select(`
          *,
          lead:leads(name, origin),
          property:properties(name),
          unit:units(unit_number)
        `)
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: deals } = await query;

      const total = (deals || []).length;
      const won = (deals || []).filter(d => d.stage === 'won').length;
      const lost = (deals || []).filter(d => d.stage === 'lost').length;
      const conversionRate = total ? (won / total) * 100 : 0;
      const totalValue = (deals || []).filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.estimated_value || 0), 0);

      await generateReportPdf({
        title: 'Performance de Conversao',
        subtitle: 'Analise de negociacoes do periodo',
        userName,
        dateRange,
        columns: ['Data', 'Lead', 'Origem', 'Imovel', 'Unidade', 'Valor (R$)', 'Etapa', 'Status'],
        data: (deals || []).map(d => [
          formatDate(d.created_at),
          d.lead?.name || '-',
          translateOrigin(d.lead?.origin),
          d.property?.name || '-',
          d.unit?.unit_number || '-',
          formatCurrency(d.estimated_value || 0),
          translateStage(d.stage),
          d.stage === 'won' ? 'Ganho' : d.stage === 'lost' ? 'Perdido' : 'Em andamento',
        ]),
        filename: 'performance-conversao',
        landscape: true,
        summary: [
          { label: 'Total de Negociacoes', value: total.toString() },
          { label: 'Negociacoes Ganhas', value: won.toString() },
          { label: 'Negociacoes Perdidas', value: lost.toString() },
          { label: 'Taxa de Conversao', value: `${conversionRate.toFixed(1)}%` },
          { label: 'Valor Total Convertido', value: formatCurrency(totalValue) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleConversaoCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('deals')
        .select(`*, lead:leads(name, origin), property:properties(name), unit:units(unit_number)`)
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: deals } = await query;

      generateReportCsv({
        columns: ['Data', 'Lead', 'Origem', 'Imóvel', 'Unidade', 'Valor', 'Etapa', 'Comissão Estimada'],
        data: (deals || []).map(d => [
          cleanDateValue(d.created_at),
          d.lead?.name || '',
          d.lead?.origin || '',
          d.property?.name || '',
          d.unit?.unit_number || '',
          cleanNumericValue(d.estimated_value || 0),
          d.stage,
          cleanNumericValue(d.estimated_commission || 0),
        ]),
        filename: 'performance-conversao',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Funil de Conversão Analítico (enhanced ROI)
  const handleFunilConversaoPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get leads by origin
      const { data: leads } = await supabase
        .from('leads')
        .select('id, origin')
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Get deals with activities
      const { data: deals } = await supabase
        .from('deals')
        .select(`
          id, stage, estimated_value, created_at, updated_at,
          lead:leads(id, origin, created_at)
        `)
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      // Get activities (visits, proposals)
      const dealIds = (deals || []).map(d => d.id);
      const { data: activities } = dealIds.length > 0 
        ? await supabase
            .from('deal_activities')
            .select('deal_id, activity_type')
            .in('deal_id', dealIds)
        : { data: [] };

      // Build funnel by origin
      const byOrigin: Record<string, { 
        leads: number; 
        visits: number; 
        proposals: number; 
        won: number; 
        value: number;
        avgCycleDays: number;
        cycleCount: number;
      }> = {};

      // Count leads
      (leads || []).forEach(l => {
        const origin = l.origin || 'Não informado';
        if (!byOrigin[origin]) byOrigin[origin] = { leads: 0, visits: 0, proposals: 0, won: 0, value: 0, avgCycleDays: 0, cycleCount: 0 };
        byOrigin[origin].leads++;
      });

      // Process deals
      (deals || []).forEach(d => {
        const origin = d.lead?.origin || 'Não informado';
        if (!byOrigin[origin]) byOrigin[origin] = { leads: 0, visits: 0, proposals: 0, won: 0, value: 0, avgCycleDays: 0, cycleCount: 0 };
        
        if (d.stage === 'won') {
          byOrigin[origin].won++;
          byOrigin[origin].value += d.estimated_value || 0;
          
          // Calculate cycle days
          const leadDate = d.lead?.created_at ? new Date(d.lead.created_at) : new Date(d.created_at);
          const closeDate = new Date(d.updated_at);
          const cycleDays = Math.floor((closeDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
          byOrigin[origin].avgCycleDays += cycleDays;
          byOrigin[origin].cycleCount++;
        }
      });

      // Count activities by deal origin
      const dealOriginMap = new Map((deals || []).map(d => [d.id, d.lead?.origin || 'Não informado']));
      (activities || []).forEach(a => {
        const origin = dealOriginMap.get(a.deal_id) || 'Não informado';
        if (!byOrigin[origin]) byOrigin[origin] = { leads: 0, visits: 0, proposals: 0, won: 0, value: 0, avgCycleDays: 0, cycleCount: 0 };
        
        if (a.activity_type === 'visit' || a.activity_type === 'visita') {
          byOrigin[origin].visits++;
        } else if (a.activity_type === 'proposal' || a.activity_type === 'proposta') {
          byOrigin[origin].proposals++;
        }
      });

      const tableData = Object.entries(byOrigin).map(([origin, data]) => {
        const conversionRate = data.leads ? ((data.won / data.leads) * 100).toFixed(1) : '0';
        const avgTicket = data.won ? data.value / data.won : 0;
        const avgCycle = data.cycleCount ? Math.round(data.avgCycleDays / data.cycleCount) : 0;
        
        return [
          origin,
          data.leads.toString(),
          data.visits.toString(),
          data.proposals.toString(),
          data.won.toString(),
          `${conversionRate}%`,
          formatCurrency(avgTicket),
          `${avgCycle} dias`,
        ];
      });

      // Find best channel
      const sortedByTicket = Object.entries(byOrigin)
        .filter(([, data]) => data.won > 0)
        .sort(([, a], [, b]) => (b.value / b.won) - (a.value / a.won));
      
      const sortedByCycle = Object.entries(byOrigin)
        .filter(([, data]) => data.cycleCount > 0)
        .sort(([, a], [, b]) => (a.avgCycleDays / a.cycleCount) - (b.avgCycleDays / b.cycleCount));

      const insights: string[] = [];
      if (sortedByTicket.length > 0) {
        const [bestTicketOrigin, bestTicketData] = sortedByTicket[0];
        insights.push(`Maior ticket médio: ${bestTicketOrigin} (${formatCurrency(bestTicketData.value / bestTicketData.won)})`);
      }
      if (sortedByCycle.length > 0) {
        const [fastestOrigin, fastestData] = sortedByCycle[0];
        insights.push(`Menor tempo de fechamento: ${fastestOrigin} (${Math.round(fastestData.avgCycleDays / fastestData.cycleCount)} dias)`);
      }

      // Translate origins in table data
      const translatedTableData = tableData.map(row => {
        const [origin, ...rest] = row;
        return [translateOrigin(String(origin)), ...rest];
      });

      await generateReportPdf({
        title: 'Funil de Conversao Analitico',
        subtitle: 'Performance por canal de aquisicao com metricas de conversao',
        userName,
        dateRange,
        columns: ['Origem', 'Leads', 'Visitas', 'Propostas', 'Ganhos', '% Conv.', 'Ticket Medio', 'Ciclo Medio'],
        data: translatedTableData,
        filename: 'funil-conversao-analitico',
        landscape: true,
        insights: insights.length > 0 ? insights : undefined,
        summary: [
          { label: 'Total de Leads', value: (leads || []).length.toString() },
          { label: 'Total de Conversoes', value: Object.values(byOrigin).reduce((sum, d) => sum + d.won, 0).toString() },
          { label: 'Valor Total Gerado', value: formatCurrency(Object.values(byOrigin).reduce((sum, d) => sum + d.value, 0)) },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleFunilConversaoCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      generateReportCsv({
        columns: ['Nome', 'Email', 'Telefone', 'Origem', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Data'],
        data: (leads || []).map(l => [
          l.name,
          l.email || '',
          l.phone || '',
          l.origin || '',
          l.utm_source || '',
          l.utm_medium || '',
          l.utm_campaign || '',
          cleanDateValue(l.created_at),
        ]),
        filename: 'leads-detalhado',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Ciclo Médio de Venda
  const handleCicloVendaPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('deals')
        .select(`
          *,
          lead:leads(name, created_at, origin),
          unit:units(unit_number)
        `)
        .eq('broker_id', user.id)
        .eq('stage', 'won')
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString());

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: wonDeals } = await query;

      const dealsWithCycle = (wonDeals || []).map(d => {
        const leadDate = d.lead?.created_at ? new Date(d.lead.created_at) : new Date(d.created_at);
        const closeDate = new Date(d.updated_at);
        const cycleDays = Math.floor((closeDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...d, cycleDays };
      });

      const avgCycle = dealsWithCycle.length 
        ? dealsWithCycle.reduce((sum, d) => sum + d.cycleDays, 0) / dealsWithCycle.length 
        : 0;

      await generateReportPdf({
        title: 'Ciclo Médio de Venda',
        subtitle: 'Tempo médio do lead até fechamento',
        userName,
        dateRange,
        columns: ['Lead', 'Origem', 'Unidade', 'Data Entrada', 'Data Fechamento', 'Dias', 'Valor (R$)'],
        data: dealsWithCycle.map(d => [
          d.lead?.name || '-',
          d.lead?.origin || '-',
          d.unit?.unit_number || '-',
          formatDate(d.lead?.created_at || d.created_at),
          formatDate(d.updated_at),
          d.cycleDays.toString(),
          formatCurrency(d.estimated_value || 0),
        ]),
        filename: 'ciclo-medio-venda',
        landscape: true,
        summary: [
          { label: 'Negociações Fechadas', value: dealsWithCycle.length.toString() },
          { label: 'Ciclo Médio', value: `${avgCycle.toFixed(0)} dias` },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleCicloVendaCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('deals')
        .select(`*, lead:leads(name, created_at, origin), unit:units(unit_number)`)
        .eq('broker_id', user.id)
        .eq('stage', 'won')
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString());

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: wonDeals } = await query;

      const dealsWithCycle = (wonDeals || []).map(d => {
        const leadDate = d.lead?.created_at ? new Date(d.lead.created_at) : new Date(d.created_at);
        const closeDate = new Date(d.updated_at);
        const cycleDays = Math.floor((closeDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...d, cycleDays };
      });

      generateReportCsv({
        columns: ['Lead', 'Origem', 'Unidade', 'Data Entrada', 'Data Fechamento', 'Dias Ciclo', 'Valor', 'Comissão'],
        data: dealsWithCycle.map(d => [
          d.lead?.name || '',
          d.lead?.origin || '',
          d.unit?.unit_number || '',
          cleanDateValue(d.lead?.created_at || d.created_at),
          cleanDateValue(d.updated_at),
          d.cycleDays,
          cleanNumericValue(d.estimated_value || 0),
          cleanNumericValue(d.estimated_commission || 0),
        ]),
        filename: 'ciclo-medio-venda',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <ReportsTable
      title="Relatórios de CRM"
      icon={<Users className="h-5 w-5" />}
      description="Performance de conversão, análise de origens de leads e ciclo médio de vendas."
    >
      <ReportRow
        title="Performance de Conversão"
        description="Análise de negociações com taxa de conversão e valor total convertido no período."
        icon={<Target className="h-4 w-4" />}
        onGeneratePDF={handleConversaoPdf}
        onDownloadCSV={handleConversaoCsv}
      />
      <ReportRow
        title="Funil de Conversão Analítico"
        description="Leads, visitas, propostas e ganhos por origem com ticket médio e ciclo."
        icon={<TrendingUp className="h-4 w-4" />}
        onGeneratePDF={handleFunilConversaoPdf}
        onDownloadCSV={handleFunilConversaoCsv}
      />
      <ReportRow
        title="Ciclo Médio de Venda"
        description="Tempo médio do primeiro contato até fechamento da negociação."
        icon={<Clock className="h-4 w-4" />}
        onGeneratePDF={handleCicloVendaPdf}
        onDownloadCSV={handleCicloVendaCsv}
      />
    </ReportsTable>
  );
};
