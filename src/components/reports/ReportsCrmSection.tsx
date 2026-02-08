import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { Target, Megaphone, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';

interface ReportsCrmSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
}

export const ReportsCrmSection = ({ dateRange, userName }: ReportsCrmSectionProps) => {
  const { toast } = useToast();

  // Performance de Conversão
  const handleConversaoPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: deals } = await supabase
        .from('deals')
        .select(`
          *,
          lead:leads(name, origin),
          property:properties(name)
        `)
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const total = (deals || []).length;
      const won = (deals || []).filter(d => d.stage === 'won').length;
      const lost = (deals || []).filter(d => d.stage === 'lost').length;
      const conversionRate = total ? (won / total) * 100 : 0;
      const totalValue = (deals || []).filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.estimated_value || 0), 0);

      await generateReportPdf({
        title: 'Performance de Conversão',
        subtitle: 'Análise de negociações do período',
        userName,
        dateRange,
        columns: ['Data', 'Lead', 'Imóvel', 'Valor (R$)', 'Etapa', 'Status'],
        data: (deals || []).map(d => [
          formatDate(d.created_at),
          d.lead?.name || '-',
          d.property?.name || '-',
          formatCurrency(d.estimated_value || 0),
          d.stage,
          d.stage === 'won' ? 'Ganho' : d.stage === 'lost' ? 'Perdido' : 'Em andamento',
        ]),
        filename: 'performance-conversao',
        summary: [
          { label: 'Total de Negociações', value: total.toString() },
          { label: 'Negociações Ganhas', value: won.toString() },
          { label: 'Negociações Perdidas', value: lost.toString() },
          { label: 'Taxa de Conversão', value: `${conversionRate.toFixed(1)}%` },
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

      const { data: deals } = await supabase
        .from('deals')
        .select(`*, lead:leads(name, origin), property:properties(name)`)
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      generateReportCsv({
        columns: ['Data', 'Lead', 'Origem', 'Imóvel', 'Valor', 'Etapa', 'Comissão Estimada'],
        data: (deals || []).map(d => [
          cleanDateValue(d.created_at),
          d.lead?.name || '',
          d.lead?.origin || '',
          d.property?.name || '',
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

  // Origem de Leads (ROI)
  const handleOrigemLeadsPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: leads } = await supabase
        .from('leads')
        .select('origin')
        .eq('broker_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const { data: wonDeals } = await supabase
        .from('deals')
        .select('lead:leads(origin), estimated_value')
        .eq('broker_id', user.id)
        .eq('stage', 'won')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const byOrigin: Record<string, { leads: number; conversions: number; value: number }> = {};
      
      (leads || []).forEach(l => {
        const origin = l.origin || 'Não informado';
        if (!byOrigin[origin]) byOrigin[origin] = { leads: 0, conversions: 0, value: 0 };
        byOrigin[origin].leads++;
      });

      (wonDeals || []).forEach(d => {
        const origin = d.lead?.origin || 'Não informado';
        if (!byOrigin[origin]) byOrigin[origin] = { leads: 0, conversions: 0, value: 0 };
        byOrigin[origin].conversions++;
        byOrigin[origin].value += d.estimated_value || 0;
      });

      await generateReportPdf({
        title: 'Origem de Leads (ROI)',
        subtitle: 'Performance por canal de aquisição',
        userName,
        dateRange,
        columns: ['Origem', 'Leads', 'Conversões', 'Taxa (%)', 'Valor Gerado (R$)'],
        data: Object.entries(byOrigin).map(([origin, data]) => [
          origin,
          data.leads.toString(),
          data.conversions.toString(),
          data.leads ? ((data.conversions / data.leads) * 100).toFixed(1) : '0',
          formatCurrency(data.value),
        ]),
        filename: 'origem-leads-roi',
        summary: [
          { label: 'Total de Leads', value: (leads || []).length.toString() },
          { label: 'Total de Conversões', value: (wonDeals || []).length.toString() },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleOrigemLeadsCsv = async () => {
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
        filename: 'origem-leads',
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

      const { data: wonDeals } = await supabase
        .from('deals')
        .select(`
          *,
          lead:leads(name, created_at)
        `)
        .eq('broker_id', user.id)
        .eq('stage', 'won')
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString());

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
        columns: ['Lead', 'Data Entrada', 'Data Fechamento', 'Dias', 'Valor (R$)'],
        data: dealsWithCycle.map(d => [
          d.lead?.name || '-',
          formatDate(d.lead?.created_at || d.created_at),
          formatDate(d.updated_at),
          d.cycleDays.toString(),
          formatCurrency(d.estimated_value || 0),
        ]),
        filename: 'ciclo-medio-venda',
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

      const { data: wonDeals } = await supabase
        .from('deals')
        .select(`*, lead:leads(name, created_at)`)
        .eq('broker_id', user.id)
        .eq('stage', 'won')
        .gte('updated_at', dateRange.from.toISOString())
        .lte('updated_at', dateRange.to.toISOString());

      const dealsWithCycle = (wonDeals || []).map(d => {
        const leadDate = d.lead?.created_at ? new Date(d.lead.created_at) : new Date(d.created_at);
        const closeDate = new Date(d.updated_at);
        const cycleDays = Math.floor((closeDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...d, cycleDays };
      });

      generateReportCsv({
        columns: ['Lead', 'Data Entrada', 'Data Fechamento', 'Dias Ciclo', 'Valor', 'Comissão'],
        data: dealsWithCycle.map(d => [
          d.lead?.name || '',
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
        title="Origem de Leads (ROI)"
        description="Performance por canal de aquisição: leads, conversões e valor gerado por origem."
        icon={<Megaphone className="h-4 w-4" />}
        onGeneratePDF={handleOrigemLeadsPdf}
        onDownloadCSV={handleOrigemLeadsCsv}
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
