import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useRentalMetrics } from '@/hooks/useRentalMetrics';
import { useDashboardScope } from '@/hooks/useDashboardScope';
import type { DateRange } from './DashboardDateFilter';

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface OpenRentalsWidgetProps {
  dateRange: DateRange;
  refreshKey: number;
}

export function OpenRentalsWidget({ dateRange, refreshKey }: OpenRentalsWidgetProps) {
  const scope = useDashboardScope();
  const { data, isLoading } = useRentalMetrics({ from: dateRange.from, to: dateRange.to, refreshKey });

  const items = data?.properties_with_open_rentals ?? [];
  const totalAmount = items.reduce((s, i) => s + i.total_open, 0);
  const displayed = items.slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Imóveis com aluguel em aberto
            {scope === 'workspace' && (
              <Badge variant="secondary" className="text-[10px] font-normal">Equipe</Badge>
            )}
          </CardTitle>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {items.length} imóve{items.length === 1 ? 'l' : 'is'} • {fmtCurrency(totalAmount)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sem aluguéis em aberto. ✓</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayed.map((item, i) => {
              const daysOverdue = differenceInDays(new Date(), new Date(item.oldest_due_date));
              const route = item.unit_id ? `/units/${item.unit_id}` : item.property_id ? `/real-estate/${item.property_id}` : '#';
              return (
                <Link
                  key={i}
                  to={route}
                  className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.property_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.transactions_count} cobrança{item.transactions_count !== 1 ? 's' : ''} • atraso máx {daysOverdue}d • {fmtCurrency(item.total_open)}
                    </p>
                  </div>
                </Link>
              );
            })}
            {items.length > 6 && (
              <Link to="/finance/transactions?status=overdue&type=income" className="block text-center text-xs text-primary hover:underline pt-2">
                Ver todos ({items.length})
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
