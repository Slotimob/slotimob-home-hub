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
          'id, status, rent_amount, unit_id, tenant:contacts!leases_tenant_contact_id_fkey(name), unit:units(unit_number, is_standalone, property:properties(name))'
        )
        .in('status', ['active', 'pending'])
        .neq('unit_id', unitId)
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
        };
      });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (leaseId: string) => {
      const { error } = await supabase
        .from('leases')
        .update({ unit_id: unitId })
        .eq('id', leaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Contrato vinculado',
        description: 'O contrato foi movido para este imóvel.',
      });
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['leases'] });
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
          <DialogTitle>Vincular a Contrato Existente</DialogTitle>
          <DialogDescription>
            Selecione um contrato ativo ou pendente para movê-lo para este imóvel.
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
                      <span className="font-medium">{l.tenant_name}</span>
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
                        <p className="text-xs text-muted-foreground">
                          Esta ação move o contrato de <strong>{l.unit_label}</strong> para este
                          imóvel.
                        </p>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={linkMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            linkMutation.mutate(l.id);
                          }}
                        >
                          {linkMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4 mr-2" />
                          )}
                          Confirmar Vínculo
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
