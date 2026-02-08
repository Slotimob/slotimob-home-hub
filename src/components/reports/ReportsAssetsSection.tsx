import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { Building2, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';

interface ReportsAssetsSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
}

export const ReportsAssetsSection = ({ dateRange, userName }: ReportsAssetsSectionProps) => {
  const { toast } = useToast();

  // Vacância
  const handleVacanciaPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: units } = await supabase
        .from('units')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('broker_id', user.id);

      const vacant = (units || []).filter(u => u.status === 'available');
      const occupied = (units || []).filter(u => u.status === 'rented');
      const vacancyRate = units?.length ? (vacant.length / units.length) * 100 : 0;

      await generateReportPdf({
        title: 'Relatório de Vacância',
        subtitle: 'Análise de ocupação do portfólio de imóveis',
        userName,
        dateRange,
        columns: ['Unidade', 'Empreendimento', 'Tipo', 'Status', 'Valor Aluguel (R$)'],
        data: (units || []).map(u => [
          u.unit_number || u.id.substring(0, 8),
          u.property?.name || '-',
          u.property_type || '-',
          u.status === 'rented' ? 'Ocupado' : 'Vago',
          formatCurrency(u.rent_price || 0),
        ]),
        filename: 'relatorio-vacancia',
        summary: [
          { label: 'Total de Unidades', value: (units || []).length.toString() },
          { label: 'Unidades Vagas', value: vacant.length.toString() },
          { label: 'Unidades Ocupadas', value: occupied.length.toString() },
          { label: 'Taxa de Vacância', value: `${vacancyRate.toFixed(1)}%` },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleVacanciaCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: units } = await supabase
        .from('units')
        .select(`*, property:properties(name)`)
        .eq('broker_id', user.id);

      generateReportCsv({
        columns: ['Unidade', 'Empreendimento', 'Tipo', 'Status', 'Valor Aluguel', 'Área'],
        data: (units || []).map(u => [
          u.unit_number || u.id.substring(0, 8),
          u.property?.name || '',
          u.property_type || '',
          u.status,
          cleanNumericValue(u.rent_price || 0),
          cleanNumericValue(u.area || 0),
        ]),
        filename: 'relatorio-vacancia',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Projeção de Reajustes
  const handleReajustesPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: leases } = await supabase
        .from('leases')
        .select(`
          *,
          unit:units(unit_number),
          tenant:contacts!leases_tenant_contact_id_fkey(name)
        `)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .gte('next_adjustment_date', dateRange.from.toISOString().split('T')[0])
        .lte('next_adjustment_date', dateRange.to.toISOString().split('T')[0]);

      await generateReportPdf({
        title: 'Projeção de Reajustes',
        subtitle: 'Contratos com reajuste previsto no período',
        userName,
        dateRange,
        columns: ['Data Reajuste', 'Unidade', 'Inquilino', 'Aluguel Atual (R$)', 'Índice'],
        data: (leases || []).map(l => [
          formatDate(l.next_adjustment_date || ''),
          l.unit?.unit_number || '-',
          l.tenant?.name || '-',
          formatCurrency(l.rent_amount),
          l.adjustment_index || 'IGPM',
        ]),
        filename: 'projecao-reajustes',
        summary: [
          { label: 'Total de Contratos', value: (leases || []).length.toString() },
        ],
      });
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
  };

  const handleReajustesCsv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: leases } = await supabase
        .from('leases')
        .select(`*, unit:units(unit_number), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .gte('next_adjustment_date', dateRange.from.toISOString().split('T')[0])
        .lte('next_adjustment_date', dateRange.to.toISOString().split('T')[0]);

      generateReportCsv({
        columns: ['Data Reajuste', 'Unidade', 'Inquilino', 'Aluguel Atual', 'Índice', 'Início Contrato'],
        data: (leases || []).map(l => [
          cleanDateValue(l.next_adjustment_date),
          l.unit?.unit_number || '',
          l.tenant?.name || '',
          cleanNumericValue(l.rent_amount),
          l.adjustment_index || 'IGPM',
          cleanDateValue(l.start_date),
        ]),
        filename: 'projecao-reajustes',
      });
      toast({ title: 'CSV baixado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao baixar CSV', description: error.message, variant: 'destructive' });
    }
  };

  // Vigência de Seguros
  const handleSegurosPdf = async () => {
    toast({ 
      title: 'Em desenvolvimento', 
      description: 'O módulo de seguros será implementado em breve.',
    });
  };

  const handleSegurosCsv = async () => {
    toast({ 
      title: 'Em desenvolvimento', 
      description: 'O módulo de seguros será implementado em breve.',
    });
  };

  return (
    <ReportsTable
      title="Relatórios de Ativos"
      icon={<Building2 className="h-5 w-5" />}
      description="Análise de vacância, projeção de reajustes e controle de seguros do portfólio."
    >
      <ReportRow
        title="Relatório de Vacância"
        description="Análise de ocupação do portfólio, com taxa de vacância e valor potencial de aluguel."
        icon={<Building2 className="h-4 w-4" />}
        onGeneratePDF={handleVacanciaPdf}
        onDownloadCSV={handleVacanciaCsv}
      />
      <ReportRow
        title="Projeção de Reajustes"
        description="Contratos com reajuste previsto no período, incluindo índice aplicável (IGP-M/IPCA)."
        icon={<TrendingUp className="h-4 w-4" />}
        onGeneratePDF={handleReajustesPdf}
        onDownloadCSV={handleReajustesCsv}
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
  );
};
