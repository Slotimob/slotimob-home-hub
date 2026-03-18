import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, DollarSign, Target, ArrowRight } from 'lucide-react';
import type { Deal } from '@/pages/Pipeline';
import { differenceInDays } from 'date-fns';

interface PipelineMetricsProps {
  deals: Deal[];
  stageHistory: Array<{
    deal_id: string;
    from_stage: string | null;
    to_stage: string;
    changed_at: string;
  }>;
}

const STAGES_ORDER = ['new_lead', 'in_contact', 'visit_scheduled', 'proposal', 'won'];

export const PipelineMetrics = ({ deals, stageHistory }: PipelineMetricsProps) => {
  // Calculate metrics
  const totalDeals = deals.length;
  const wonDeals = deals.filter(d => d.stage === 'won');
  const lostDeals = deals.filter(d => d.stage === 'lost');
  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');

  // Conversion rate (won / total closed)
  const closedDeals = wonDeals.length + lostDeals.length;
  const conversionRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;

  // Average closing time for won deals
  const avgClosingTime = wonDeals.length > 0
    ? wonDeals.reduce((sum, deal) => {
        const days = differenceInDays(new Date(), new Date(deal.created_at));
        return sum + days;
      }, 0) / wonDeals.length
    : 0;

  // Total value per stage
  const valueByStage = deals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + (deal.estimated_value || 0);
    return acc;
  }, {} as Record<string, number>);

  // Funnel metrics (deals count per stage)
  const dealsByStage = deals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Total pipeline value (excluding won/lost)
  const totalPipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);
  const totalWonValue = wonDeals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);

  // Stage conversion rates
  const getStageConversion = (fromStage: string, toStage: string) => {
    const fromCount = dealsByStage[fromStage] || 0;
    const toCount = dealsByStage[toStage] || 0;
    if (fromCount === 0) return 0;
    return Math.round((toCount / fromCount) * 100);
  };

  const stageLabels: Record<string, string> = {
    new_lead: 'Novo Lead',
    in_contact: 'Em Contato',
    visit_scheduled: 'Visita Agendada',
    proposal: 'Proposta',
    won: 'Ganho',
    lost: 'Perdido',
  };

  return (
    <div className="space-y-4">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{wonDeals.length} ganhos de {closedDeals} fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio de Fechamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgClosingTime)} dias</div>
            <p className="text-xs text-muted-foreground">para deals ganhos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor no Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', compactDisplay: 'short' } as any)}
            </div>
            <p className="text-xs text-muted-foreground">{activeDeals.length} deals ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {totalWonValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', compactDisplay: 'short' } as any)}
            </div>
            <p className="text-xs text-muted-foreground">{wonDeals.length} vendas fechadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Performance do Funil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STAGES_ORDER.map((stage, index) => {
              const count = dealsByStage[stage] || 0;
              const value = valueByStage[stage] || 0;
              const nextStage = STAGES_ORDER[index + 1];
              const conversion = nextStage ? getStageConversion(stage, nextStage) : null;

              return (
                <div key={stage} className="flex items-center gap-2">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className={`
                      w-full py-3 px-4 rounded-lg text-center
                      ${stage === 'won' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}
                    `}>
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground truncate">{stageLabels[stage]}</div>
                      {value > 0 && (
                        <div className="text-xs font-medium mt-1">
                          R$ {(value / 1000).toFixed(0)}k
                        </div>
                      )}
                    </div>
                  </div>
                  {conversion !== null && (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-xs">{conversion}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
