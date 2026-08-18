import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useRentalMetrics } from '@/hooks/useRentalMetrics';
import { useDashboardScope } from '@/hooks/useDashboardScope';
import type { DateRange } from './DashboardDateFilter';
import { useWidgetPeriod, WidgetPeriodFilter } from './WidgetPeriodFilter';

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface AluguelReceberWidgetProps {
  dateRange: DateRange;
  refreshKey: number;
}

export function AluguelReceberWidget({ dateRange: _dateRange, refreshKey }: AluguelReceberWidgetProps) {
  const scope = useDashboardScope();
  const { period, setPeriod, dateRange: localDateRange } = useWidgetPeriod('this_month');
  const { data, isLoading } = useRentalMetrics({ from: localDateRange.from, to: localDateRange.to, refreshKey });

  const received = data?.received ?? { amount: 0, count: 0 };
  const receivable = data?.receivable ?? { amount: 0, count: 0 };
  const overdue = data?.overdue ?? { amount: 0, count: 0 };
  const total = received.amount + receivable.amount + overdue.amount;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          Aluguéis <HelpTooltip featureKey="dashboard.rent_receivables" />
        </CardTitle>
        <WidgetPeriodFilter period={period} onChange={setPeriod} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{fmtCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">Total de aluguéis no período</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md bg-muted/30 border-l-2 border-l-amber-500 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-foreground">A receber</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">{fmtCurrency(receivable.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{receivable.count} cobrança{receivable.count !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/30 border-l-2 border-l-emerald-500 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-foreground">Recebido</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">{fmtCurrency(received.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{received.count} cobrança{received.count !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/30 border-l-2 border-l-destructive p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-sm text-foreground">Em atraso</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{fmtCurrency(overdue.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{overdue.count} cobrança{overdue.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-1 mt-auto">
              <Link
                to="/finance/transactions?type=income"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver lançamentos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
        {scope === 'workspace' && (
          <div className="flex justify-end mt-auto pt-2">
            <span className="text-[10px] text-muted-foreground">• Equipe</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
