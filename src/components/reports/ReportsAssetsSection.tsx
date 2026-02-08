import { ReportRow } from './ReportRow';
import { ReportsTable } from './ReportsTable';
import { Building2, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateReportPdf, formatCurrency, formatDate } from '@/utils/reportPdfGenerator';
import { generateReportCsv, cleanNumericValue, cleanDateValue } from '@/utils/reportCsvGenerator';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';

interface ReportsAssetsSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

export const ReportsAssetsSection = ({ dateRange, userName, selectedUnitId }: ReportsAssetsSectionProps) => {
  const { toast } = useToast();

  // Vacância - Enhanced with opportunity cost
  const handleVacanciaPdf = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('units')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('broker_id', user.id);

      if (selectedUnitId) {
        query = query.eq('id', selectedUnitId);
      }

      const { data: units } = await query;

      // Calculate vacancy days and opportunity cost
      const today = new Date();
      let totalOpportunityCost = 0;

      const tableData = (units || []).map(u => {
        const isVacant = u.status === 'available';
        const estimatedRent = u.rent_price || 0;
        const dailyRate = estimatedRent / 30;
        
        // For vacant units, calculate days vacant (simplified: using updated_at as reference)
        let daysVacant = 0;
        let opportunityCost = 0;
        
        if (isVacant && u.updated_at) {
          const lastUpdate = new Date(u.updated_at);
          daysVacant = Math.max(0, differenceInDays(today, lastUpdate));
          opportunityCost = dailyRate * daysVacant;
          totalOpportunityCost += opportunityCost;
        }

        return [
          u.unit_number || u.id.substring(0, 8),
          u.property?.name || 'Imóvel Avulso',
          isVacant ? 'Vago' : 'Ocupado',
          formatCurrency(estimatedRent),
          isVacant ? daysVacant.toString() : '-',
          isVacant ? formatCurrency(opportunityCost) : '-',
        ];
      });

      const vacant = (units || []).filter(u => u.status === 'available');
      const occupied = (units || []).filter(u => u.status === 'rented');
      const vacancyRate = units?.length ? (vacant.length / units.length) * 100 : 0;

      await generateReportPdf({
        title: 'Relatório de Vacância',
        subtitle: 'Análise de ocupação com custo de oportunidade',
        userName,
        dateRange,
        columns: ['Unidade', 'Empreendimento', 'Status', 'Valor Estimado', 'Dias Vago', 'Perda Acumulada'],
        data: tableData,
        filename: 'relatorio-vacancia',
        summary: [
          { label: 'Total de Unidades', value: (units || []).length.toString() },
          { label: 'Unidades Vagas', value: vacant.length.toString() },
          { label: 'Unidades Ocupadas', value: occupied.length.toString() },
          { label: 'Taxa de Vacância', value: `${vacancyRate.toFixed(1)}%` },
        ],
        insights: totalOpportunityCost > 0 
          ? [`Neste período, você deixou de arrecadar ${formatCurrency(totalOpportunityCost)} devido à vacância.`]
          : undefined,
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

      let query = supabase
        .from('units')
        .select(`*, property:properties(name)`)
        .eq('broker_id', user.id);

      if (selectedUnitId) {
        query = query.eq('id', selectedUnitId);
      }

      const { data: units } = await query;

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

      let query = supabase
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

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await query;

      // Calculate projected value (simplified: 5% increase assumption for IGP-M estimate)
      const tableData = (leases || []).map(l => {
        const projectedValue = l.rent_amount * 1.05;
        
        return [
          formatDate(l.next_adjustment_date || ''),
          l.unit?.unit_number || '-',
          l.tenant?.name || '-',
          l.adjustment_index || 'IGPM',
          formatCurrency(l.rent_amount),
          formatCurrency(projectedValue),
        ];
      });

      await generateReportPdf({
        title: 'Projeção de Reajustes',
        subtitle: 'Contratos com reajuste previsto no período (projeção estimada de 5%)',
        userName,
        dateRange,
        columns: ['Data Reajuste', 'Unidade', 'Inquilino', 'Índice', 'Valor Atual', 'Valor Projetado'],
        data: tableData,
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

      let query = supabase
        .from('leases')
        .select(`*, unit:units(unit_number), tenant:contacts!leases_tenant_contact_id_fkey(name)`)
        .eq('broker_id', user.id)
        .eq('status', 'active')
        .gte('next_adjustment_date', dateRange.from.toISOString().split('T')[0])
        .lte('next_adjustment_date', dateRange.to.toISOString().split('T')[0]);

      if (selectedUnitId) {
        query = query.eq('unit_id', selectedUnitId);
      }

      const { data: leases } = await query;

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
        description="Ocupação do portfólio com dias vagos e custo de oportunidade calculado."
        icon={<Building2 className="h-4 w-4" />}
        onGeneratePDF={handleVacanciaPdf}
        onDownloadCSV={handleVacanciaCsv}
      />
      <ReportRow
        title="Projeção de Reajustes"
        description="Contratos com reajuste previsto, valor projetado e alerta de seguro vencido."
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
