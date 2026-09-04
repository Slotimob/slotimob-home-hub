import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { sanitizeStorageFileName } from '@/lib/utils';
import { ContactSelector } from '@/components/ContactSelector';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, X, Paperclip, Building2, Home } from 'lucide-react';
import { format } from 'date-fns';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '@/lib/activity-types';
import { todayDateOnly } from "@/lib/date-only";

export { ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from '@/lib/activity-types';

export interface AssetOption {
  id: string;
  type: 'property' | 'unit';
  label: string;
  subtitle?: string | null;
}

export interface EditingActivity {
  id: string;
  title: string;
  description?: string | null;
  activity_type?: string | null;
  scheduled_at?: string | null;
  estimated_cost?: number | null;
  assigned_contact_id?: string | null;
}

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected asset (used when opened inside an asset's Activities tab) */
  defaultAsset?: AssetOption | null;
  /** Lock the asset selector to the default asset */
  lockAsset?: boolean;
  /** When provided, the dialog updates this activity instead of creating new ones */
  editingActivity?: EditingActivity | null;
  onSaved?: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function ActivityFormDialog({
  open,
  onOpenChange,
  defaultAsset = null,
  lockAsset = false,
  editingActivity = null,
  onSaved,
}: ActivityFormDialogProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const brokerId = effectiveBrokerId || user?.id || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editingActivity;

  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<AssetOption[]>([]);
  const [activityType, setActivityType] = useState<string>('manutencao');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [date, setDate] = useState(() => todayDateOnly());
  const [time, setTime] = useState('09:00');
  const [files, setFiles] = useState<File[]>([]);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [createTransaction, setCreateTransaction] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    setAssetSearch('');
    setSelectedAssets(defaultAsset ? [defaultAsset] : []);
    setFiles([]);
    setCreateTransaction(false);

    if (editingActivity) {
      const scheduled = editingActivity.scheduled_at
        ? new Date(editingActivity.scheduled_at)
        : null;
      setActivityType(editingActivity.activity_type || 'manutencao');
      setTitle(editingActivity.title || '');
      setDescription(editingActivity.description || '');
      setContactId(editingActivity.assigned_contact_id || null);
      setDate(
        scheduled && !isNaN(scheduled.getTime())
          ? format(scheduled, 'yyyy-MM-dd')
          : todayDateOnly(),
      );
      setTime(scheduled && !isNaN(scheduled.getTime()) ? format(scheduled, 'HH:mm') : '09:00');
      setEstimatedCost(
        editingActivity.estimated_cost != null ? String(editingActivity.estimated_cost) : '',
      );
      return;
    }

    setActivityType('manutencao');
    setTitle('');
    setDescription('');
    setContactId(null);
    setDate(todayDateOnly());
    setTime('09:00');
    setEstimatedCost('');
  }, [open, defaultAsset, editingActivity]);

  // Asset search (units + properties)
  const { data: assetOptions = [], isFetching: searching } = useQuery({
    queryKey: ['activity-asset-options', brokerId, assetSearch],
    queryFn: async (): Promise<AssetOption[]> => {
      if (!brokerId) return [];

      let unitsQuery = supabase
        .from('units')
        .select('id, unit_number, address, city, state')
        .eq('broker_id', brokerId)
        .order('unit_number');
      if (assetSearch) {
        unitsQuery = unitsQuery.or(
          `unit_number.ilike.%${assetSearch}%,address.ilike.%${assetSearch}%,city.ilike.%${assetSearch}%`,
        );
      }

      let propsQuery = supabase
        .from('properties')
        .select('id, name, address, city, state')
        .eq('broker_id', brokerId)
        .order('name');
      if (assetSearch) {
        propsQuery = propsQuery.or(
          `name.ilike.%${assetSearch}%,address.ilike.%${assetSearch}%,city.ilike.%${assetSearch}%`,
        );
      }

      const [unitsRes, propsRes] = await Promise.all([
        unitsQuery.limit(30),
        propsQuery.limit(20),
      ]);
      if (unitsRes.error) throw unitsRes.error;
      if (propsRes.error) throw propsRes.error;

      const units: AssetOption[] = (unitsRes.data || []).map((u: any) => ({
        id: u.id,
        type: 'unit' as const,
        label: u.unit_number || 'Unidade',
        subtitle: [u.address, u.city, u.state].filter(Boolean).join(', ') || null,
      }));
      const properties: AssetOption[] = (propsRes.data || []).map((p: any) => ({
        id: p.id,
        type: 'property' as const,
        label: p.name || 'Empreendimento',
        subtitle: [p.address, p.city, p.state].filter(Boolean).join(', ') || null,
      }));
      return [...units, ...properties];
    },
    enabled: open && !!brokerId && !lockAsset,
    staleTime: 30_000,
  });

  const selectedKeys = useMemo(
    () => new Set(selectedAssets.map((a) => `${a.type}:${a.id}`)),
    [selectedAssets],
  );

  const toggleAsset = (asset: AssetOption) => {
    const key = `${asset.type}:${asset.id}`;
    setSelectedAssets((prev) =>
      prev.some((a) => `${a.type}:${a.id}` === key)
        ? prev.filter((a) => `${a.type}:${a.id}` !== key)
        : [...prev, asset],
    );
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const valid = picked.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: `${f.name} excede 20MB.`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const estimatedCostNumber = useMemo(() => {
    // CurrencyInput already delivers a plain numeric string ("1000.05")
    const parsed = parseFloat(estimatedCost);
    return isNaN(parsed) ? null : parsed;
  }, [estimatedCost]);

  const canSave =
    !!brokerId && selectedAssets.length > 0 && title.trim().length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSave || !brokerId) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${date}T${time || '00:00'}:00`).toISOString();

      if (isEditing && editingActivity) {
        const { error: updateError } = await (supabase as any)
          .from('property_activities')
          .update({
            activity_type: activityType,
            title: title.trim(),
            description: description.trim() || null,
            assigned_contact_id: contactId,
            scheduled_at: scheduledAt,
            estimated_cost: estimatedCostNumber,
          })
          .eq('id', editingActivity.id);
        if (updateError) throw updateError;

        toast({ title: 'Atividade atualizada' });
        queryClient.invalidateQueries({ queryKey: ['activities-list'] });
        queryClient.invalidateQueries({ queryKey: ['asset-manual-notes'] });
        onSaved?.();
        onOpenChange(false);
        return;
      }

      const groupId =
        selectedAssets.length > 1
          ? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
          : null;

      const rows = selectedAssets.map((asset) => ({
        broker_id: brokerId,
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || null,
        assigned_contact_id: contactId,
        scheduled_at: scheduledAt,
        estimated_cost: estimatedCostNumber,
        activity_group_id: groupId,
        property_id: asset.type === 'property' ? asset.id : null,
        unit_id: asset.type === 'unit' ? asset.id : null,
      }));

      const { data: created, error } = await (supabase as any)
        .from('property_activities')
        .insert(rows)
        .select('id, property_id, unit_id');
      if (error) throw error;

      const activities = created || [];

      // Optional financial transaction (one per asset), linked back to the activity
      if (createTransaction && estimatedCostNumber && estimatedCostNumber > 0) {
        for (const act of activities) {
          const { data: tx, error: txError } = await supabase
            .from('financial_transactions')
            .insert({
              broker_id: brokerId,
              type: 'expense',
              description: `${ACTIVITY_TYPE_LABELS[activityType] || 'Atividade'} - ${title.trim()}`,
              amount: estimatedCostNumber,
              transaction_date: date,
              due_date: date,
              status: 'pending',
              property_id: act.property_id,
              unit_id: act.unit_id,
              notes: description.trim() || null,
            } as any)
            .select('id')
            .single();
          if (txError) throw txError;

          const { error: linkError } = await (supabase as any)
            .from('property_activities')
            .update({ financial_transaction_id: tx.id })
            .eq('id', act.id);
          if (linkError) throw linkError;
        }
      }

      // Upload attachments (shared file, one document row per activity)
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${brokerId}/activities/${groupId || activities[0]?.id}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);
          if (uploadError) throw uploadError;

          const docRows = activities.map((act: any) => ({
            broker_id: brokerId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type || null,
            document_type: 'property_doc',
            source_type: 'upload',
            property_id: act.property_id,
            unit_id: act.unit_id,
            activity_id: act.id,
          }));
          const { error: docError } = await (supabase as any)
            .from('documents')
            .insert(docRows);
          if (docError) throw docError;
        }
      }

      toast({
        title: 'Atividade registrada',
        description:
          activities.length > 1
            ? `Aplicada a ${activities.length} imóveis.`
            : 'Atividade criada com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['activities-list'] });
      queryClient.invalidateQueries({ queryKey: ['asset-manual-notes'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar atividade',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-3 shrink-0">
          <DialogTitle>{isEditing ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
          <DialogDescription>
            Registre manutenções, vistorias, reformas e outras atividades dos seus imóveis.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4 overflow-y-auto flex-1 min-h-0">

          {/* Assets */}
          <div className="space-y-2">
            <Label className="text-sm">Imóveis / Unidades</Label>

            {selectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAssets.map((a) => (
                  <Badge key={`${a.type}:${a.id}`} variant="secondary" className="gap-1">
                    {a.type === 'unit' ? (
                      <Home className="h-3 w-3" />
                    ) : (
                      <Building2 className="h-3 w-3" />
                    )}
                    {a.label}
                    {!lockAsset && (
                      <button
                        type="button"
                        onClick={() => toggleAsset(a)}
                        className="ml-0.5 hover:text-destructive"
                        aria-label={`Remover ${a.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {!lockAsset && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Buscar por nome, endereço ou cidade..."
                    className="pl-8"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
                  {searching && (
                    <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                    </div>
                  )}
                  {!searching && assetOptions.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground">
                      Nenhum imóvel encontrado.
                    </div>
                  )}
                  {assetOptions.map((a) => {
                    const key = `${a.type}:${a.id}`;
                    const checked = selectedKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleAsset(a)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-accent/50 ${
                          checked ? 'bg-primary/5' : ''
                        }`}
                      >
                        <Checkbox checked={checked} className="pointer-events-none" />
                        {a.type === 'unit' ? (
                          <Home className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm">{a.label}</span>
                        {a.subtitle && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {a.subtitle}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Type + responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de atividade</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Responsável</Label>
              <ContactSelector
                value={contactId}
                onChange={setContactId}
                placeholder="Selecione o responsável..."
              />
            </div>
          </div>

          {/* Title / description */}
          <div className="space-y-1.5">
            <Label className="text-sm">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Troca do aquecedor"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes da atividade..."
              rows={3}
            />
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Cost + financial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Custo estimado</Label>
              <CurrencyInput
                value={estimatedCost}
                onChange={setEstimatedCost}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                <Checkbox
                  checked={createTransaction}
                  onCheckedChange={(v) => setCreateTransaction(!!v)}
                  disabled={!estimatedCostNumber || estimatedCostNumber <= 0}
                />
                Gerar lançamento financeiro
              </label>
            </div>
          </div>

          {/* Attachments */}
          {!isEditing && (
          <div className="space-y-1.5">
            <Label className="text-sm">Comprovantes / anexos</Label>
            <Input ref={fileInputRef} type="file" multiple onChange={handleFiles} />
            {files.length > 0 && (
              <div className="space-y-1 pt-1">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Paperclip className="h-3 w-3" />
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${f.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 rounded-b-lg">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Salvar atividade'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
