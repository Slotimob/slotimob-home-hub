import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarClock, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface AccessReviewCycle {
  id: string;
  broker_id: string;
  owner_name: string | null;
  owner_email: string | null;
  period_label: string;
  period_start: string;
  due_date: string;
  status: 'pending' | 'overdue' | 'completed';
  members_count: number;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

interface AccessReviewOverview {
  summary: {
    pending: number;
    overdue: number;
    completed: number;
    last_cycle_opened_at: string | null;
  };
  current_period: string;
  cycles: AccessReviewCycle[];
}

const statusConfig: Record<
  AccessReviewCycle['status'],
  { label: string; variant: 'secondary' | 'destructive' | 'default' }
> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  overdue: { label: 'Vencida', variant: 'destructive' },
  completed: { label: 'Concluída', variant: 'default' },
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function CockpitGovernanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['cockpit', 'access-review-overview'],
    queryFn: async () => {
      const { data: result, error } = await supabase.rpc('get_access_review_overview');
      if (error) throw error;
      return result as unknown as AccessReviewOverview;
    },
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const summary = data?.summary ?? { pending: 0, overdue: 0, completed: 0, last_cycle_opened_at: null };
  const cycles = data?.cycles ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Período atual</p>
                <p className="text-2xl font-bold">{data?.current_period ?? '—'}</p>
              </div>
              <CalendarClock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{summary.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-bold">{summary.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">{summary.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ciclos de revisão de acessos</CardTitle>
          <CardDescription>
            Acompanhamento das confirmações trimestrais feitas pelos donos das contas.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {cycles.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum ciclo de revisão registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Membros</TableHead>
                    <TableHead>Concluída em</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map((cycle) => {
                    const status = statusConfig[cycle.status] ?? statusConfig.pending;
                    return (
                      <TableRow key={cycle.id}>
                        <TableCell>
                          <div className="font-medium">{cycle.owner_name || 'Sem nome'}</div>
                          <div className="text-xs text-muted-foreground">{cycle.owner_email || '—'}</div>
                        </TableCell>
                        <TableCell>{cycle.period_label}</TableCell>
                        <TableCell>{formatDate(cycle.due_date)}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{cycle.members_count}</TableCell>
                        <TableCell>{formatDate(cycle.completed_at)}</TableCell>
                        <TableCell className="max-w-[220px]">
                          {cycle.notes ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate text-sm">{cycle.notes}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">{cycle.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Como a rotina funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Os ciclos são abertos automaticamente no primeiro dia de cada trimestre (cron
            open-access-review-quarterly, 06:00 UTC) e marcados como vencidos após o prazo (cron
            mark-overdue-access-reviews, 05:00 UTC diário). A confirmação é feita pelo próprio dono
            da conta e registra data, responsável e a foto das permissões vigentes. Nenhuma ação
            manual é necessária.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
