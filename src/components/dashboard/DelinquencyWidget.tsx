import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Link } from 'react-router-dom';
import { useRentalMetrics } from '@/hooks/useRentalMetrics';
import { useDashboardScope } from '@/hooks/useDashboardScope';
import type { DateRange } from './DashboardDateFilter';

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface DelinquencyWidgetProps {
  dateRange: DateRange;
  refreshKey: number;
}

const BUCKET_CONFIG = [
  { key: 'bucket_0_15' as const, label: '0-15 dias', color: 'bg-blue-400' },
  { key: 'bucket_16_30' as const, label: '16-30 dias', color: 'bg-yellow-400' },
  { key: 'bucket_31_60' as const, label: '31-60 dias', color: 'bg-orange-400' },
  { key: 'bucket_60_plus' as const, label: '60+ dias', color: 'bg-red-500' },
];

export function DelinquencyWidget({ dateRange, refreshKey }: DelinquencyWidgetProps) {
  const scope = useDashboardScope();
  const { data, isLoading } = useRentalMetrics({ from: dateRange.from, to: dateRange.to, refreshKey });

  const overdue = data?.overdue ?? { amount: 0, count: 0, buckets: { bucket_0_15: { amount: 0, count: 0 }, bucket_16_30: { amount: 0, count: 0 }, bucket_31_60: { amount: 0, count: 0 }, bucket_60_plus: { amount: 0, count: 0 } } };
  const hasOverdue = overdue.amount > 0;
  const maxBucketAmount = Math.max(...Object.values(overdue.buckets).map(b => b.amount), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className={`h-4 w-4 ${hasOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
          Inadimplência <HelpTooltip featureKey="dashboard.delinquency" />
          {scope === 'workspace' && (
            <Badge variant="secondary" className="text-[10px] font-normal">Equipe</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
          </div>
        ) : !hasOverdue ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sem inadimplência. ✓</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main KPI */}
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{fmtCurrency(overdue.amount)}</p>
              <p className="text-xs text-muted-foreground">{overdue.count} cobrança{overdue.count !== 1 ? 's' : ''} em atraso</p>
            </div>

            {/* Aging bars */}
            <div className="space-y-2">
              {BUCKET_CONFIG.map(({ key, label, color }) => {
                const bucket = overdue.buckets[key];
                if (bucket.count === 0) return null;
                const widthPct = Math.max(5, (bucket.amount / maxBucketAmount) * 100);
                return (
                  <div key={key} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">
                        {fmtCurrency(bucket.amount)} <span className="text-muted-foreground">({bucket.count})</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              to="/finance/transactions?status=overdue&type=income"
              className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            >
              Ver inadimplentes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
