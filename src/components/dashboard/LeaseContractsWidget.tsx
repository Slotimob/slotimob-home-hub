import { FileText, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LEASE_STATUS_LABELS } from '@/lib/lease-status';
import { useLeaseStatusCounts } from '@/hooks/useLeaseStatusCounts';

const STATUS_COLORS: Record<string, { dot: string; borderLeft: string }> = {
  active: { dot: 'bg-emerald-500', borderLeft: 'border-l-emerald-500' },
  pending: { dot: 'bg-amber-500', borderLeft: 'border-l-amber-500' },
  terminated: { dot: 'bg-slate-500', borderLeft: 'border-l-slate-500' },
  expired: { dot: 'bg-red-500', borderLeft: 'border-l-red-500' },
  cancelled: { dot: 'bg-zinc-400', borderLeft: 'border-l-zinc-400' },
};

const STATUS_ORDER = ['active', 'pending', 'terminated', 'expired', 'cancelled'] as const;

export function LeaseContractsWidget() {
  const { counts, adjustmentsDue, isLoading } = useLeaseStatusCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 px-3 lg:px-6">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 lg:h-8 w-12 lg:w-16" />
                <Skeleton className="h-3 lg:h-4 w-16 lg:w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'Total de Contratos',
      shortLabel: 'Contratos',
      value: counts.total,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Reajuste próximo ou vencido',
      shortLabel: 'Reajustes',
      value: adjustmentsDue,
      icon: CalendarClock,
      color: 'text-amber-600 dark:text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="h-full">
        <CardHeader className="pb-2 px-3 lg:px-6 pt-3 lg:pt-6">
          <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-1.5 justify-between">
            <span className="flex items-center gap-1.5">
              Contratos de Locação <HelpTooltip featureKey="management.contracts_count" />
            </span>
            <Link
              to="/gestao/contratos"
              className="text-xs text-muted-foreground hover:text-foreground font-normal"
            >
              Ver contratos
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 lg:px-6 pb-3 lg:pb-6">
          {/* Single row layout - responsive with flex wrap */}
          <div className="flex flex-wrap gap-4 lg:gap-6">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Tooltip key={metric.label}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 min-w-0 cursor-default flex-1 min-w-[100px]">
                      <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${metric.bgColor}`}>
                        <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${metric.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg lg:text-xl font-bold leading-tight">
                          {metric.value}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {metric.shortLabel}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{metric.label}: {metric.value}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Detalhamento por status - lista vertical */}
          <div className="mt-3 lg:mt-4 pt-3 border-t space-y-1.5">
            {STATUS_ORDER.map((status) => {
              const config = LEASE_STATUS_LABELS[status];
              const colors = STATUS_COLORS[status];
              return (
                <div
                  key={status}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 border-l-2 bg-muted/30 ${colors?.borderLeft ?? ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colors?.dot ?? 'bg-muted-foreground'}`} />
                    <span className="text-sm text-muted-foreground">{config?.label ?? status}</span>
                  </div>
                  <span className="text-sm font-semibold">{counts[status]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
