import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Link2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyBRL } from '@/utils/unitPricing';
import { useSetLeaseUnits } from '@/hooks/useLeases';
import { occupyLeaseUnits } from '@/lib/unit-status-sync';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' }> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Pendente', variant: 'secondary' },
};

interface LeaseOption {
  id: string;
  status: string;
  rent_amount: number | null;
  tenant_name: string;
  unit_label: string;
  tenant_contact_id: string | null;
  start_date: string;
  /** Já contém este imóvel (principal ou adicional). */
  contains_unit: boolean;
  /** Contrato com rateio definido (% por imóvel). */
  has_shares: boolean;
  units: { unit_id: string; unit_subdivision_id: string | null; is_primary: boolean; share_percent: number | null }[];
}

interface LeaseLinkSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  onLinked: () => void;
}

export function LeaseLinkSelector({
  open,
  onOpenChange,
  unitId,
  onLinked,
}: LeaseLinkSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: leases = [], isLoading } = useQuery({
    queryKey: ['leases', 'linkable', unitId],
    enabled: open,
    queryFn: async (): Promise<LeaseOption[]> => {
      const { data, error } = await supabase
        .from('leases')
        .select(
          'id, status, rent_amount, unit_id, unit_subdivision_id, tenant_contact_id, start_date, tenant:contacts!leases_tenant_contact_id_fkey(name), unit:units!leases_unit_id_fkey(unit_number, is_standalone, property:properties(name)), lease_units(unit_id, unit_subdivision_id, is_primary, share_percent)'
        )
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data as any[]) || []).map((l) => {
        const u = l.unit;
        const unitLabel = !u
          ? 'Sem imóvel vinculado'
          : u.is_standalone
            ? u.unit_number
            : `${u.unit_number} — ${u.property?.name ?? 'Empreendimento'}`;
        return {
          id: l.id,
          status: l.status,
          rent_amount: l.rent_amount,
          tenant_name: l.tenant?.name ?? 'Inquilino não informado',
          unit_label: unitLabel,
          tenant_contact_id: l.tenant_contact_id ?? null,
          start_date: l.start_date,
          contains_unit:
            l.unit_id === unitId || (l.lease_units || []).some((lu: any) => lu.unit_id === unitId),
          has_shares: (l.lease_units || []).some((lu: any) => lu.share_percent != null),
          units: (l.lease_units || []).length
            ? l.lease_units
            : [{ unit_id: l.unit_id, unit_subdivision_id: l.unit_subdivision_id ?? null, is_primary: true, share_percent: null }],
        };
      });
    },
  });

  const setLeaseUnits = useSetLeaseUnits();

  // ADICIONA este imóvel ao contrato (mantém os atuais e o principal); não move o contrato.
  const linkMutation = useMutation({
    mutationFn: async (lease: LeaseOption) => {
      if (lease.contains_unit) throw new Error('Este contrato já contém este imóvel.');
      if (lease.has_shares) {
        throw new Error(
          'Este contrato tem rateio por imóvel. Adicione o imóvel pelo assistente do contrato para redefinir os percentuais.'
        );
      }
      await setLeaseUnits.mutateAsync({
        leaseId: lease.id,
        units: [
          ...lease.units.map((u) => ({
            unit_id: u.unit_id,
            unit_subdivision_id: u.unit_subdivision_id,
            is_primary: u.is_primary,
            share_percent: null,
          })),
          { unit_id: unitId, unit_subdivision_id: null, is_primary: false, share_percent: null },
        ],
      });
      if (lease.tenant_contact_id) {
        await occupyLeaseUnits({
          leaseId: lease.id,
          tenantContactId: lease.tenant_contact_id,
          startDate: lease.start_date,
          refs: [{ unit_id: unitId, unit_subdivision_id: null }],
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Imóvel adicionado ao contrato',
        description: 'Este imóvel agora faz parte do contrato como imóvel adicional.',
      });
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['lease'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      onLinked();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao vincular contrato',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedId(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar este imóvel a um contrato existente</DialogTitle>
          <DialogDescription>
            Selecione um contrato ativo ou pendente. Este imóvel entra como imóvel adicional; o
            imóvel principal e os lançamentos do contrato não mudam.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar por inquilino ou imóvel..." />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>Nenhum contrato disponível para vínculo.</CommandEmpty>
              <CommandGroup>
                {leases.map((l) => (
                  <CommandItem
                    key={l.id}
                    value={`${l.tenant_name} ${l.unit_label}`}
                    onSelect={() => setSelectedId(selectedId === l.id ? null : l.id)}
                    className="flex flex-col items-start gap-2 py-3"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium">
                        {l.tenant_name}
                        {l.contains_unit && (
                          <span className="ml-2 text-[10px] text-amber-700">já contém este imóvel</span>
                        )}
                      </span>
                      <Badge variant={STATUS_LABELS[l.status]?.variant ?? 'secondary'}>
                        {STATUS_LABELS[l.status]?.label ?? l.status}
                      </Badge>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{l.unit_label}</span>
                      <span>{formatCurrencyBRL(l.rent_amount)}</span>
                    </div>

                    {selectedId === l.id && (
                      <div className="w-full space-y-2 rounded-md bg-muted/60 p-2">
                        {l.contains_unit ? (
                          <p className="text-xs text-amber-700">
                            Este contrato já contém este imóvel.
                          </p>
                        ) : l.has_shares ? (
                          <p className="text-xs text-amber-700">
                            Este contrato tem rateio por imóvel. Adicione o imóvel pelo assistente
                            do contrato (etapa Imóvel) para redefinir os percentuais.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Este imóvel será adicionado ao contrato de <strong>{l.unit_label}</strong>{' '}
                            (que continua como principal).
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={linkMutation.isPending || l.contains_unit || l.has_shares}
                          onClick={(e) => {
                            e.stopPropagation();
                            linkMutation.mutate(l);
                          }}
                        >
                          {linkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4 mr-2" />
                          )}
                          Adicionar a este contrato
                        </Button>
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}
