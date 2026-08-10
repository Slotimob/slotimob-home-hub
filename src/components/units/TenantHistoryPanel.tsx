import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInMonths } from 'date-fns';
import { User, Phone, Mail, CalendarDays, Users, FileSignature, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RegisterTenantHistoryDialog } from '@/components/units/RegisterTenantHistoryDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface TenantHistoryRow {
  id: string;
  unit_id: string;
  tenant_contact_id: string | null;
  moved_in_at: string | null;
  moved_out_at: string | null;
  source: string | null;
  notes: string | null;
  tenant: { name: string | null; phone: string | null; email: string | null } | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(`${value.split('T')[0]}T12:00:00`);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy');
}

function formatDuration(from: string | null, to: string | null): string {
  if (!from) return '—';
  const start = new Date(`${from.split('T')[0]}T12:00:00`);
  const end = to ? new Date(`${to.split('T')[0]}T12:00:00`) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
  const months = Math.max(0, differenceInMonths(end, start));
  if (months < 1) return 'menos de 1 mês';
  return months === 1 ? '1 mês' : `${months} meses`;
}

export const TenantHistoryPanel = ({ unitId }: { unitId: string }) => {
  const [registerOpen, setRegisterOpen] = useState(false);
  const { data: history = [], isLoading } = useQuery<TenantHistoryRow[]>({
    queryKey: ['unit-tenant-history', unitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('unit_tenant_history')
        .select('id, unit_id, tenant_contact_id, moved_in_at, moved_out_at, source, notes, tenant:contacts(name, phone, email)')
        .eq('unit_id', unitId)
        .order('moved_in_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TenantHistoryRow[];
    },
    enabled: !!unitId,
    staleTime: 30_000,
  });

  const header = (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">Histórico de Inquilinos</p>
      <Button size="sm" onClick={() => setRegisterOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Registrar Entrada de Inquilino
      </Button>
    </div>
  );

  const dialog = (
    <RegisterTenantHistoryDialog
      unitId={unitId}
      open={registerOpen}
      onOpenChange={setRegisterOpen}
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {header}
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
        {dialog}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum histórico de inquilino registrado para esta unidade.
          </p>
        </div>
        {dialog}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      {history.map(row => {
        const isCurrent = !row.moved_out_at;
        return (
          <div
            key={row.id}
            className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {row.tenant?.name || 'Inquilino não identificado'}
                </p>
                {isCurrent && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 text-[10px]">
                    Atual
                  </Badge>
                )}
                {row.source === 'lease' && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                          <FileSignature className="h-3 w-3" />
                          Via Contrato
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-xs">
                          Data de entrada herdada do contrato de locação
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {row.source === 'manual' && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] gap-1 cursor-help">
                          <Pencil className="h-3 w-3" />
                          Manual
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-xs">
                          Data de entrada registrada na data em que o campo foi editado, sem contrato vinculado
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {(row.tenant?.phone || row.tenant?.email) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {row.tenant?.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {row.tenant.phone}
                    </span>
                  )}
                  {row.tenant?.email && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {row.tenant.email}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Entrada: {formatDate(row.moved_in_at)}
                </span>
                <span>
                  Saída: {row.moved_out_at ? formatDate(row.moved_out_at) : '—'}
                </span>
                <span>Duração: {formatDuration(row.moved_in_at, row.moved_out_at)}</span>
              </div>

              {row.notes && (
                <p className="text-xs text-muted-foreground italic">{row.notes}</p>
              )}
            </div>
          </div>
        );
      })}
      {dialog}
    </div>
  );
};

export default TenantHistoryPanel;
