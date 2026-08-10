import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, FileSignature, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactSelector } from '@/components/ContactSelector';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeaseOption {
  id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  termination_date: string | null;
  tenant_contact_id: string | null;
  tenant: { name: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  pending: 'Pendente de Configuração',
  terminated: 'Encerrado',
  expired: 'Vencido',
  draft: 'Rascunho',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(`${value.split('T')[0]}T12:00:00`);
  if (isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy');
}

interface RegisterTenantHistoryDialogProps {
  unitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RegisterTenantHistoryDialog = ({
  unitId,
  open,
  onOpenChange,
}: RegisterTenantHistoryDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'manual' | 'lease'>('manual');
  const [saving, setSaving] = useState(false);

  // manual mode
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [movedInAt, setMovedInAt] = useState('');
  const [movedOutAt, setMovedOutAt] = useState('');
  const [notes, setNotes] = useState('');
  const [contactSelectorKey, setContactSelectorKey] = useState(0);
  const [createContactOpen, setCreateContactOpen] = useState(false);

  // lease mode
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);

  const { data: leases = [], isLoading: loadingLeases } = useQuery<LeaseOption[]>({
    queryKey: ['unit-leases-for-history', unitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leases')
        .select(
          'id, status, start_date, end_date, termination_date, tenant_contact_id, tenant:contacts!leases_tenant_contact_id_fkey(name)'
        )
        .eq('unit_id', unitId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as LeaseOption[];
    },
    enabled: !!unitId && open,
  });

  const selectedLease = leases.find(l => l.id === selectedLeaseId) || null;

  const resetState = () => {
    setTenantId(null);
    setMovedInAt('');
    setMovedOutAt('');
    setNotes('');
    setSelectedLeaseId(null);
    setTab('manual');
  };

  const handleContactCreated = (newContact?: { id: string }) => {
    setContactSelectorKey(prev => prev + 1);
    if (newContact?.id) setTenantId(newContact.id);
  };

  const canSubmit =
    tab === 'manual'
      ? !!tenantId && !!movedInAt
      : !!selectedLease && !!selectedLease.tenant_contact_id && !!selectedLease.start_date;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    const payload =
      tab === 'manual'
        ? {
            p_unit_id: unitId,
            p_tenant_contact_id: tenantId,
            p_moved_in_at: movedInAt,
            p_moved_out_at: movedOutAt || null,
            p_source: 'manual',
            p_lease_id: null,
            p_notes: notes || null,
          }
        : {
            p_unit_id: unitId,
            p_tenant_contact_id: selectedLease!.tenant_contact_id,
            p_moved_in_at: selectedLease!.start_date,
            p_moved_out_at:
              selectedLease!.termination_date || selectedLease!.end_date || null,
            p_source: 'lease',
            p_lease_id: selectedLease!.id,
            p_notes: null,
          };

    const { error } = await (supabase as any).rpc('register_tenant_history_entry', payload);
    setSaving(false);

    if (error) {
      toast({
        title: 'Erro ao registrar histórico',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Entrada de inquilino registrada com sucesso' });
    queryClient.invalidateQueries({ queryKey: ['unit-tenant-history', unitId] });
    queryClient.invalidateQueries({ queryKey: ['lease', 'unit', unitId] });
    resetState();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={o => {
          if (!o) resetState();
          onOpenChange(o);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Inquilino</DialogTitle>
            <DialogDescription>
              Registre uma ocupação manualmente ou a partir de um contrato desta unidade.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={v => setTab(v as 'manual' | 'lease')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="lease">Vincular Contrato</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Inquilino *</Label>
                <ContactSelector
                  key={`tenant-history-${contactSelectorKey}`}
                  value={tenantId}
                  onChange={v => setTenantId(v || null)}
                  placeholder="Buscar inquilino..."
                  filterCategories={['Inquilino']}
                  autoAddCategory="Inquilino"
                  showCreateButton
                  onCreateClick={() => setCreateContactOpen(true)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de início *</Label>
                  <Input
                    type="date"
                    value={movedInAt}
                    onChange={e => setMovedInAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de fim</Label>
                  <Input
                    type="date"
                    value={movedOutAt}
                    onChange={e => setMovedOutAt(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deixe vazio se for o inquilino atual.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre esta ocupação (opcional)"
                />
              </div>
            </TabsContent>

            <TabsContent value="lease" className="space-y-4 pt-4">
              {loadingLeases ? (
                <div className="space-y-2">
                  {[0, 1].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : leases.length === 0 ? (
                <div className="py-8 text-center">
                  <FileSignature className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum contrato encontrado para esta unidade.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {leases.map(lease => {
                    const isSelected = lease.id === selectedLeaseId;
                    return (
                      <button
                        type="button"
                        key={lease.id}
                        onClick={() => setSelectedLeaseId(lease.id)}
                        className={cn(
                          'w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50',
                          isSelected && 'border-primary bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {lease.tenant?.name || 'Inquilino não identificado'}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              {STATUS_LABELS[lease.status || ''] || lease.status || '—'}
                            </Badge>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(lease.start_date)} —{' '}
                          {formatDate(lease.termination_date || lease.end_date)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedLease && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Confirmação
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Inquilino</Label>
                      <Input readOnly value={selectedLease.tenant?.name || '—'} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de início</Label>
                      <Input readOnly value={formatDate(selectedLease.start_date)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de fim</Label>
                      <Input
                        readOnly
                        value={
                          selectedLease.termination_date || selectedLease.end_date
                            ? formatDate(
                                selectedLease.termination_date || selectedLease.end_date
                              )
                            : 'Em aberto'
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateContactDialog
        open={createContactOpen}
        onOpenChange={setCreateContactOpen}
        onSuccess={handleContactCreated}
        defaultCategory="Inquilino"
      />
    </>
  );
};

export default RegisterTenantHistoryDialog;
