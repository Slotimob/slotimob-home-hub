import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  Wallet,
  Wrench,
  Send,
} from 'lucide-react';
import { useActionCenterPending } from '@/hooks/useActionCenterPending';
import { HelpTooltip } from '@/components/help/HelpTooltip';

interface SummaryRow {
  key: string;
  label: string;
  icon: typeof ClipboardList;
  count: number;
  overdue: number;
  color: string;
  bg: string;
}

export function AfazeresSummaryWidget() {
  const {
    contracts,
    receivables,
    payables,
    maintenances,
    proposalFollowups,
    totalCount,
    isLoading,
  } = useActionCenterPending();

  const financeCount = receivables.length + payables.length;
  const financeOverdue =
    receivables.filter((r) => r.is_overdue).length +
    payables.filter((p) => p.is_overdue).length;

  const rows: SummaryRow[] = [
    {
      key: 'contracts',
      label: 'Contratos',
      icon: FileSignature,
      count: contracts.length,
      overdue: contracts.filter(
        (c) => c.issue_type === 'adjustment_overdue' || c.issue_type === 'expired',
      ).length,
      color: 'text-blue-600 dark:text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      key: 'finance',
      label: 'Financeiro',
      icon: Wallet,
      count: financeCount,
      overdue: financeOverdue,
      color: 'text-emerald-600 dark:text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      key: 'maintenances',
      label: 'Manutenções',
      icon: Wrench,
      count: maintenances.length,
      overdue: maintenances.filter((m) => m.is_overdue).length,
      color: 'text-orange-600 dark:text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      key: 'proposals',
      label: 'Propostas',
      icon: Send,
      count: proposalFollowups.length,
      overdue: proposalFollowups.filter((p) => p.kind === 'followup').length,
      color: 'text-purple-600 dark:text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  const totalOverdue = rows.reduce((sum, r) => sum + r.overdue, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Afazeres <HelpTooltip featureKey="dashboard.overview" />
          </CardTitle>
          {!isLoading && totalCount > 0 && (
            <Badge variant={totalOverdue > 0 ? 'destructive' : 'secondary'} className="text-[11px]">
              {totalCount} pendência{totalCount !== 1 ? 's' : ''}
              {totalOverdue > 0 ? ` • ${totalOverdue} atrasada${totalOverdue !== 1 ? 's' : ''}` : ''}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : totalCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma pendência em aberto. ✓</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-2">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <Link
                  key={row.key}
                  to="/gestao/afazeres"
                  className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${row.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{row.count}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{row.label}</p>
                    {row.overdue > 0 && (
                      <p className="text-[10px] font-medium text-destructive">
                        {row.overdue} atrasada{row.overdue !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t">
          <Button asChild variant="outline" size="sm" className="w-full gap-1 text-xs">
            <Link to="/gestao/afazeres">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
