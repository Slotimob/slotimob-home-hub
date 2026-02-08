import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Kanban, ArrowRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './DashboardDateFilter';
import { PipelineStageConfig } from '@/hooks/useDashboardPreferences';
import { SmartCurrency } from '@/hooks/useSmartCurrency';

// Estágios padrão do CRM (enum pipeline_stage)
const DEFAULT_PIPELINE_STAGES: Array<{
  id: string;
  name: string;
  color: string;
}> = [{
  id: 'new_lead',
  name: 'Novo Lead',
  color: '#3b82f6'
}, {
  id: 'in_contact',
  name: 'Em Contato',
  color: '#f59e0b'
}, {
  id: 'visit_scheduled',
  name: 'Visita Agendada',
  color: '#8b5cf6'
}, {
  id: 'proposal',
  name: 'Proposta',
  color: '#f97316'
}, {
  id: 'won',
  name: 'Ganho',
  color: '#22c55e'
}, {
  id: 'lost',
  name: 'Perdido',
  color: '#ef4444'
}];
const DEFAULT_PIPELINE_STAGE_IDS = new Set(DEFAULT_PIPELINE_STAGES.map(s => s.id));
interface PipelineStageData {
  id: string;
  name: string;
  color: string;
  count: number;
  value: number;
}
interface PipelineData {
  newLeads: number;
  stages: PipelineStageData[];
  totalDealsValue: number;
}
interface PipelineWidgetProps {
  dateRange: DateRange;
  refreshKey?: number;
  isLoading?: boolean;
  enabledStages: PipelineStageConfig[];
  onStagesLoaded?: (stages: Array<{
    id: string;
    name: string;
    color: string | null;
  }>) => void;
}
export function PipelineWidget({
  dateRange,
  refreshKey,
  isLoading: externalLoading,
  enabledStages,
  onStagesLoaded
}: PipelineWidgetProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<PipelineData>({
    newLeads: 0,
    stages: [],
    totalDealsValue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadPipelineData();
  }, [dateRange, refreshKey]);
  const loadPipelineData = async () => {
    try {
      setIsLoading(true);
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Get new leads in period
      const {
        count: newLeadsCount
      } = await supabase.from('leads').select('id', {
        count: 'exact',
        head: true
      }).gte('created_at', fromDate).lte('created_at', toDate);

      // Get custom pipeline stages
      const {
        data: stages
      } = await supabase.from('pipeline_stages').select('id, name, color, display_order').order('display_order', {
        ascending: true
      });
      const allStages: Array<{
        id: string;
        name: string;
        color: string;
      }> = [...DEFAULT_PIPELINE_STAGES, ...(stages || []).map(s => ({
        id: s.id,
        name: s.name,
        color: s.color || '#6366f1'
      }))];

      // Notify parent about available stages for sync
      if (onStagesLoaded && stages) {
        onStagesLoaded(stages);
      }

      // Get deals with their stages created in period
      const {
        data: deals
      } = await supabase.from('deals').select('id, stage, custom_stage_id, estimated_value, created_at').gte('created_at', fromDate).lte('created_at', toDate);

      // Map deals to stages
      const stageData: PipelineStageData[] = allStages.map(stage => {
        const isDefaultStage = DEFAULT_PIPELINE_STAGE_IDS.has(stage.id);
        const stageDeals = (deals || []).filter(d => {
          // Padrão: usa enum deals.stage, mas evita duplicidade quando o deal já usa custom_stage_id
          if (isDefaultStage) {
            return d.stage === stage.id && !d.custom_stage_id;
          }
          // Customizado: usa deals.custom_stage_id
          return d.custom_stage_id === stage.id;
        });
        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + Number(d.estimated_value || 0), 0)
        };
      });

      // Valor em negociação: exclui Won/Lost (independente de ser estágio padrão ou custom)
      const totalDealsValue = (deals || []).filter(d => d.stage !== 'lost' && d.stage !== 'won').reduce((sum, d) => sum + Number(d.estimated_value || 0), 0);
      setData({
        newLeads: newLeadsCount || 0,
        stages: stageData,
        totalDealsValue
      });
    } catch (error) {
      console.error('Error loading pipeline data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const loading = externalLoading || isLoading;

  // Filter stages to only show enabled ones
  const enabledStageIds = enabledStages.filter(s => s.enabled).map(s => s.id);
  const visibleStages = data.stages.filter(s => enabledStageIds.includes(s.id));

  // Determine grid columns based on number of visible stages
  const getGridCols = (count: number) => {
    if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 3) return 'grid-cols-2 sm:grid-cols-3';
    if (count <= 4) return 'grid-cols-2 sm:grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>;
  }
  return <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Pipeline (CRM)</CardTitle>
            <CardDescription>
              {format(dateRange.from, 'dd/MM', {
              locale: ptBR
            })} - {format(dateRange.to, 'dd/MM/yyyy', {
              locale: ptBR
            })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
            Ver Pipeline <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big Numbers - Fixed metrics */}
          

          {/* Dynamic Stage Big Numbers */}
          {visibleStages.length > 0 && <div className="rounded-lg border">
              <div className="px-3 py-2 border-b flex items-center gap-2">
                <Kanban className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Etapas Selecionadas</span>
              </div>
              <div className={`p-3 grid ${getGridCols(visibleStages.length)} gap-2`}>
                {visibleStages.map(stage => <Tooltip key={stage.id}>
                    <TooltipTrigger asChild>
                      <div className="rounded-lg p-2.5 border cursor-default transition-colors hover:bg-muted/50" style={{
                  backgroundColor: `${stage.color}08`,
                  borderColor: `${stage.color}30`
                }}>
                        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: stage.color
                    }} />
                          <span className="font-medium truncate" style={{
                      fontSize: 'clamp(0.625rem, 2vw, 0.75rem)',
                      color: stage.color
                    }}>
                            {stage.name}
                          </span>
                        </div>
                        <p className="font-bold" style={{
                    fontSize: 'clamp(1.125rem, 3.5vw, 1.5rem)',
                    color: stage.color
                  }}>
                          {stage.count}
                        </p>
                        {stage.value > 0 && <p className="text-xs text-muted-foreground truncate">
                            <SmartCurrency value={stage.value} />
                          </p>}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-center">
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                          {stage.value > 0 && ` • R$ ${stage.value.toLocaleString('pt-BR')}`}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>)}
              </div>
            </div>}

          {visibleStages.length === 0 && enabledStages.length > 0 && <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground text-center">
                Nenhuma etapa selecionada. Configure no botão "Customizar Dashboard".
              </p>
            </div>}

          {data.stages.length === 0 && <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground text-center">
                Configure etapas do pipeline para visualizar métricas.
              </p>
            </div>}
        </CardContent>
      </Card>
    </TooltipProvider>;
}