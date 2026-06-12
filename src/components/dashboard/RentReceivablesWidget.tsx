import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, ArrowRight } from 'lucide-react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Link } from 'react-router-dom';
import { useRentalMetrics } from '@/hooks/useRentalMetrics';
import { useDashboardScope } from '@/hooks/useDashboardScope';
import type { DateRange } from './DashboardDateFilter';

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface RentReceivablesWidgetProps {
  dateRange: DateRange;
  refreshKey: number;
}

export function RentReceivablesWidget({ dateRange, refreshKey }: RentReceivablesWidgetProps) {
  const scope = useDashboardScope();
  const { data, isLoading } = useRentalMetrics({ from: dateRange.from, to: dateRange.to, refreshKey });

  const received = data?.received ?? { amount: 0, count: 0 };
  const receivable = data?.receivable ?? { amount: 0, count: 0 };
  const overdue = data?.overdue ?? { amount: 0, count: 0 };
  const total = received.amount + receivable.amount + overdue.amount;
  const pct = total > 0 ? Math.round((received.amount / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Aluguéis no período <HelpTooltip featureKey="dashboard.rent_receivables" />
          {scope === 'workspace' && (
            <Badge variant="secondary" className="text-[10px] font-normal">Equipe</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-4" />
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum aluguel previsto para este período.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <p className="text-[11px] text-muted-foreground">Já recebido</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(received.amount)}</p>
                <p className="text-[10px] text-muted-foreground">{received.count} cobrança{received.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-[11px] text-muted-foreground">A receber</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmtCurrency(receivable.amount)}</p>
                <p className="text-[10px] text-muted-foreground">{receivable.count} cobrança{receivable.count !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{pct}% recebido</p>
            </div>

            <Link
              to={`/finance/transactions?type=income`}
              className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            >
              Ver detalhes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
