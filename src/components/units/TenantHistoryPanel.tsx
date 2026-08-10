import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { User, CalendarDays, Users, ChevronDown, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { LEASE_STATUS_LABELS } from '@/lib/lease-status';
import { formatCurrencyBRL } from '@/utils/unitPricing';

type AssetType = 'unit' | 'property';

interface LeaseRow {
  id: string;
  unit_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_amount: number | null;
  tenant_contact_id: string | null;
  tenant: { name: string | null } | null;
}

interface LegacyHistoryRow {
  id: string;
  lease_id: string | null;
  moved_in_at: string | null;
  moved_out_at: string | null;
  source: string | null;
  notes: string | null;
  tenant: { name: string | null } | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(`${value.split('T')[0]}T12:00:00`);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy');
}

interface TenantHistoryPanelProps {
  /** Unit id (legacy prop, equivalent to assetId with assetType="unit") */
  unitId?: string;
  assetId?: string;
  assetType?: AssetType;
}

export const TenantHistoryPanel = ({
  unitId,
  assetId,
  assetType = 'unit',
}: TenantHistoryPanelProps) => {
  const id = assetId ?? unitId;
  const type: AssetType = assetId ? assetType : 'unit';

  const { data: leases = [], isLoading } = useQuery<LeaseRow[]>({
    queryKey: ['asset-tenant-leases', type, id],
    queryFn: async () => {
      if (!id) return [];
      const select =
        'id, unit_id, status, start_date, end_date, rent_amount, tenant_contact_id, tenant:contacts!leases_tenant_contact_id_fkey(name)';

      let unitIds: string[] = [id];
      if (type === 'property') {
        const { data: childUnits, error: unitsError } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', id);
        if (unitsError) throw unitsError;
        unitIds = (childUnits || []).map((u: any) => u.id).filter(Boolean);
        if (unitIds.length === 0) return [];
      }

      const { data, error } = await (supabase as any)
        .from('leases')
        .select(select)
        .in('unit_id', unitIds)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as LeaseRow[];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: legacyHistory = [] } = useQuery<LegacyHistoryRow[]>({
    queryKey: ['asset-tenant-legacy-history', type, id],
    queryFn: async () => {
      if (!id) return [];
      let unitIds: string[] = [id];
      if (type === 'property') {
        const { data: childUnits, error: unitsError } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', id);
        if (unitsError) throw unitsError;
        unitIds = (childUnits || []).map((u: any) => u.id).filter(Boolean);
        if (unitIds.length === 0) return [];
      }

      const { data, error } = await (supabase as any)
        .from('unit_tenant_history')
        .select('id, lease_id, moved_in_at, moved_out_at, source, notes, tenant:contacts(name)')
        .in('unit_id', unitIds)
        .is('lease_id', null)
        .order('moved_in_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LegacyHistoryRow[];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const header = (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">Inquilinos por Contrato</p>
    </div>
  );

  const legacySection = legacyHistory.length > 0 && (
    <Collapsible className="rounded-lg border border-border">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 p-3 text-left">
          <span className="text-xs font-medium text-muted-foreground">
            Histórico anterior (sem contrato vinculado) · {legacyHistory.length}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-border p-3">
        {legacyHistory.map(row => (
          <div key={row.id} className="space-y-1 rounded-md bg-muted/40 p-2">
            <p className="text-sm font-medium">
              {row.tenant?.name || 'Inquilino não identificado'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(row.moved_in_at)} → {row.moved_out_at ? formatDate(row.moved_out_at) : 'em vigor'}
              </span>
              {row.source && <span>Origem: {row.source === 'manual' ? 'Manual' : row.source}</span>}
            </div>
            {row.notes && <p className="text-xs italic text-muted-foreground">{row.notes}</p>}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {header}
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (leases.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum contrato de locação registrado para este imóvel.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Os inquilinos aparecem aqui automaticamente a partir dos contratos.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to={`/gestao/contratos/novo?unitId=${id}`}>
              <FileSignature className="mr-1 h-4 w-4" />
              Criar Contrato
            </Link>
          </Button>
        </div>
        {legacySection}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      {leases.map(lease => {
        const statusConfig =
          LEASE_STATUS_LABELS[lease.status || ''] || { label: lease.status || '—', variant: 'outline' as const };
        const ongoing =
          !lease.end_date && (lease.status === 'active' || lease.status === 'pending');
        return (
          <div
            key={lease.id}
            className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {lease.tenant?.name || 'Inquilino não identificado'}
                </p>
                <Badge variant={statusConfig.variant} className="text-[10px]">
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(lease.start_date)} → {ongoing ? 'em vigor' : formatDate(lease.end_date)}
                </span>
                <span>Aluguel: {formatCurrencyBRL(lease.rent_amount)}</span>
              </div>
            </div>
          </div>
        );
      })}
      {legacySection}
    </div>
  );
};

export default TenantHistoryPanel;
