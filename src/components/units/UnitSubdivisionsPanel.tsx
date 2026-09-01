import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LEASE_STATUS_LABELS } from '@/lib/lease-status';
import { supabase } from '@/integrations/supabase/client';
import { SubdivisionSetupAlert } from '@/components/units/SubdivisionSetupAlert';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ContactSelector } from '@/components/ContactSelector';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrencyBRL } from '@/utils/unitPricing';
import { ALL_UNIT_STATUSES, UNIT_STATUS_STYLES, getStatusLabel } from '@/utils/uiConstants';
import {
  useUnitSubdivisions,
  useCreateUnitSubdivision,
  useUpdateUnitSubdivision,
  useDeleteUnitSubdivision,
  type UnitSubdivision,
  type UnitStatus,
} from '@/hooks/useUnitSubdivisions';

interface UnitSubdivisionsPanelProps {
  unitId: string;
}

interface FormState {
  label: string;
  area: string;
  rent_price: string;
  tenant_contact_id: string | null;
  status: UnitStatus;
  notes: string;
}

const emptyForm: FormState = {
  label: '',
  area: '',
  rent_price: '',
  tenant_contact_id: null,
  status: 'available',
  notes: '',
};

export function UnitSubdivisionsPanel({ unitId }: UnitSubdivisionsPanelProps) {
  const { data: subdivisions = [], isLoading } = useUnitSubdivisions(unitId);
  const createMutation = useCreateUnitSubdivision();
  const updateMutation = useUpdateUnitSubdivision();
  const deleteMutation = useDeleteUnitSubdivision();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitSubdivision | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<UnitSubdivision | null>(null);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [contactSelectorKey, setContactSelectorKey] = useState(0);

  useEffect(() => {
    if (!dialogOpen) return;
    if (editing) {
      setForm({
        label: editing.label ?? '',
        area: editing.area != null ? String(editing.area) : '',
        rent_price: editing.rent_price != null ? String(editing.rent_price) : '',
        tenant_contact_id: editing.tenant_contact_id,
        status: editing.status,
        notes: editing.notes ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [dialogOpen, editing]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: UnitSubdivision) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleContactCreated = (newContact?: { id?: string }) => {
    setContactSelectorKey((prev) => prev + 1);
    if (newContact?.id) {
      setForm((prev) => ({ ...prev, tenant_contact_id: newContact.id as string }));
    }
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) return;

    const payload = {
      label: form.label.trim(),
      area: form.area ? parseFloat(form.area) : null,
      rent_price: form.rent_price ? parseFloat(form.rent_price) : null,
      tenant_contact_id: form.tenant_contact_id,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, unitId, data: payload });
    } else {
      await createMutation.mutateAsync({ unitId, data: payload });
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const { data: parentUnit } = useQuery({
    queryKey: ['unit-subdivision-reference', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('area_total, area, rent_price')
        .eq('id', unitId)
        .maybeSingle();
      if (error) throw error;
      return data as { area_total: number | null; area: number | null; rent_price: number | null } | null;
    },
    enabled: !!unitId,
  });

  const totalArea = parentUnit?.area_total ?? parentUnit?.area ?? null;
  const totalRent = parentUnit?.rent_price ?? null;

  const { usedArea, usedRent } = useMemo(() => {
    return subdivisions.reduce(
      (acc, item) => {
        if (editing && item.id === editing.id) return acc;
        acc.usedArea += Number(item.area) || 0;
        acc.usedRent += Number(item.rent_price) || 0;
        return acc;
      },
      { usedArea: 0, usedRent: 0 }
    );
  }, [subdivisions, editing]);

  const remainingArea = totalArea != null ? Math.max(totalArea - usedArea, 0) : null;
  const remainingRent = totalRent != null ? Math.max(totalRent - usedRent, 0) : null;

  const currentArea = form.area ? parseFloat(form.area) : 0;
  const currentRent = form.rent_price ? parseFloat(form.rent_price) : 0;
  const areaExcess =
    remainingArea != null && currentArea > remainingArea ? currentArea - remainingArea : 0;
  const rentExcess =
    remainingRent != null && currentRent > remainingRent ? currentRent - remainingRent : 0;

  const subdivisionIds = useMemo(() => subdivisions.map((s) => s.id), [subdivisions]);

  const { data: subdivisionLeases = {} } = useQuery({
    queryKey: ['subdivision-leases', unitId, subdivisionIds],
    enabled: subdivisionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select('id, unit_subdivision_id, status, created_at')
        .in('unit_subdivision_id', subdivisionIds)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, { id: string; status: string }> = {};
      (data || []).forEach((lease: any) => {
        if (lease.unit_subdivision_id && !map[lease.unit_subdivision_id]) {
          map[lease.unit_subdivision_id] = { id: lease.id, status: lease.status };
        }
      });
      return map;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Frações do imóvel</h3>
        {subdivisions.length > 0 && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Fração
          </Button>
        )}
      </div>

      <SubdivisionSetupAlert
        total={subdivisions.length}
        missing={subdivisions.filter((s) => !s.tenant_contact_id).length}
        onAction={openCreate}
        actionLabel="Nova Fração"
      />


      {subdivisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            Cadastre as frações deste imóvel para gerenciar múltiplos inquilinos e valores de aluguel separados
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Fração
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Área (m²)</TableHead>
                <TableHead>Aluguel</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contrato</TableHead>

                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subdivisions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell>{item.area != null ? `${item.area} m²` : '-'}</TableCell>
                  <TableCell>
                    {item.rent_price != null ? formatCurrencyBRL(item.rent_price) : '-'}
                  </TableCell>
                  <TableCell>{item.contacts?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={UNIT_STATUS_STYLES[item.status]?.badgeClasses}
                    >
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {subdivisionLeases[item.id] ? (
                      <Badge
                        variant={
                          LEASE_STATUS_LABELS[subdivisionLeases[item.id].status]?.variant ?? 'outline'
                        }
                      >
                        {LEASE_STATUS_LABELS[subdivisionLeases[item.id].status]?.label ??
                          subdivisionLeases[item.id].status}
                      </Badge>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Sem contrato</span>
                        <Link
                          to={`/gestao/contratos/novo?unitId=${unitId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Criar contrato
                        </Link>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">

                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar fração"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir fração"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fração' : 'Nova Fração'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdivision-label">Label *</Label>
              <Input
                id="subdivision-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex: Loja 1, Quarto A..."
              />
            </div>

            {(remainingArea != null || remainingRent != null) && (
              <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                {remainingArea != null && (
                  <p>
                    Área restante:{' '}
                    <span className="font-medium text-foreground">{remainingArea.toLocaleString('pt-BR')} m²</span>{' '}
                    de {totalArea?.toLocaleString('pt-BR')} m² total
                  </p>
                )}
                {remainingRent != null && (
                  <p>
                    Aluguel restante:{' '}
                    <span className="font-medium text-foreground">{formatCurrencyBRL(remainingRent)}</span> de{' '}
                    {formatCurrencyBRL(totalRent ?? 0)} total
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subdivision-area">Área (m²)</Label>
                <Input
                  id="subdivision-area"
                  type="number"
                  step="0.01"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="0,00"
                  className={areaExcess > 0 ? 'border-amber-500 focus-visible:ring-amber-500' : undefined}
                />
                {areaExcess > 0 && (
                  <p className="text-xs text-amber-600">
                    Excede o saldo em {areaExcess.toLocaleString('pt-BR')} m²
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subdivision-rent">Valor do aluguel</Label>
                <div className={rentExcess > 0 ? 'rounded-md ring-1 ring-amber-500' : undefined}>
                  <CurrencyInput
                    id="subdivision-rent"
                    value={form.rent_price}
                    onChange={(value) => setForm({ ...form, rent_price: value })}
                  />
                </div>
                {rentExcess > 0 && (
                  <p className="text-xs text-amber-600">
                    Excede o saldo em {formatCurrencyBRL(rentExcess)}
                  </p>
                )}
              </div>
            </div>


            <div className="space-y-2">
              <Label>Inquilino</Label>
              <ContactSelector
                key={`subdivision-tenant-${contactSelectorKey}`}
                value={form.tenant_contact_id}
                onChange={(v) => setForm({ ...form, tenant_contact_id: v })}
                placeholder="Buscar inquilino..."
                filterCategories={['Inquilino']}
                autoAddCategory="Inquilino"
                showCreateButton
                onCreateClick={() => setIsCreateContactOpen(true)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as UnitStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_UNIT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdivision-notes">Observações</Label>
              <Textarea
                id="subdivision-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.label.trim() || isSaving}>
              {isSaving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar fração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateContactDialog
        open={isCreateContactOpen}
        onOpenChange={setIsCreateContactOpen}
        onSuccess={handleContactCreated}
        defaultCategory="Inquilino"
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fração?</AlertDialogTitle>
            <AlertDialogDescription>
              A fração "{deleteTarget?.label}" será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await deleteMutation.mutateAsync({ id: deleteTarget.id, unitId });
                }
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UnitSubdivisionsPanel;
