import { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { AgentSelector } from '@/components/shared/AgentSelector';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

const STAGE_OPTIONS = [
  { value: 'new_lead', label: 'Novo Lead' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'visit_scheduled', label: 'Visita Agendada' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'negotiation', label: 'Negociação' },
];

const PIPELINE_OPTIONS = [
  { value: 'sale', label: '🏷️ Vendas' },
  { value: 'rental', label: '🏠 Locações' },
  { value: 'acquisition', label: '📋 Captações' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppConversation;
  onSuccess?: (dealId: string, contactId: string) => void;
}

interface AssetOption {
  id: string;
  name: string;
  type: 'property' | 'unit';
}

export function CreateDealFromChatDialog({ open, onOpenChange, conversation, onSuccess }: Props) {
  const { effectiveBrokerId } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [pipelineType, setPipelineType] = useState('sale');

  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState('new_lead');
  const [propertyId, setPropertyId] = useState<string>('');
  const [properties, setProperties] = useState<AssetOption[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<'property' | 'unit' | null>(null);

  const contactName = conversation.contact_name || conversation.contact_phone;
  const contactPhone = conversation.contact_phone;

  // Fetch properties + units when dialog opens
  useEffect(() => {
    if (!open || !effectiveBrokerId) return;
    setPropertiesLoading(true);

    Promise.all([
      supabase
        .from('properties')
        .select('id, name')
        .eq('broker_id', effectiveBrokerId)
        .order('name'),
      supabase
        .from('units')
        .select('id, unit_number, property_id')
        .eq('broker_id', effectiveBrokerId)
        .order('unit_number'),
    ]).then(([propRes, unitRes]) => {
      const assets: AssetOption[] = [];

      // Properties (empreendimentos)
      const propsMap = new Map<string, string>();
      (propRes.data || []).forEach(p => {
        assets.push({ id: p.id, name: `🏢 ${p.name}`, type: 'property' });
        propsMap.set(p.id, p.name);
      });

      // Units (unidades individuais)
      (unitRes.data || []).forEach((u: any) => {
        const propName = u.property_id ? propsMap.get(u.property_id) : null;
        const label = propName ? `🏠 ${u.unit_number} (${propName})` : `🏠 ${u.unit_number}`;
        assets.push({ id: u.id, name: label, type: 'unit' });
      });

      setProperties(assets);
      setPropertiesLoading(false);
    });
  }, [open, effectiveBrokerId]);

  const handleSave = useCallback(async () => {
    if (!effectiveBrokerId) return;
    setSaving(true);

    try {
      // 1. Check if contact with this phone already exists
      const normalizedPhone = contactPhone.replace(/\D/g, '');
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('broker_id', effectiveBrokerId)
        .or(`phone.eq.${normalizedPhone},whatsapp.eq.${normalizedPhone},phone.eq.${contactPhone},whatsapp.eq.${contactPhone}`)
        .limit(1)
        .maybeSingle();

      let contactId = existingContact?.id;

      // 2. Create contact if not exists
      if (!contactId) {
        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert({
            broker_id: effectiveBrokerId,
            name: contactName,
            phone: normalizedPhone,
            whatsapp: normalizedPhone,
            categories: ['WhatsApp'],
          })
          .select('id')
          .single();

        if (contactErr) throw contactErr;
        contactId = newContact.id;
      }

      // 3. Create lead (required for deal)
      const { data: newLead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          broker_id: effectiveBrokerId,
          name: contactName,
          phone: normalizedPhone,
          origin: 'whatsapp',
        })
        .select('id')
        .single();

      if (leadErr) throw leadErr;

      // 4. Create deal
      const parsedValue = value ? parseFloat(value.replace(/\D/g, '')) / 100 : null;
      const dealPayload: any = {
        broker_id: effectiveBrokerId,
        lead_id: newLead.id,
        contact_id: contactId,
        stage: stage as any,
        estimated_value: parsedValue,
        assigned_user_id: assignedUserId || user?.id || null,
        initial_task: title || `Negociação via WhatsApp - ${contactName}`,
      };
      if (propertyId && propertyId !== 'none') {
        const selected = properties.find(p => p.id === propertyId);
        if (selected?.type === 'unit') {
          dealPayload.unit_id = propertyId;
        } else {
          dealPayload.property_id = propertyId;
        }
      }

      const { data: newDeal, error: dealErr } = await supabase
        .from('deals')
        .insert(dealPayload)
        .select('id')
        .single();

      if (dealErr) throw dealErr;

      // 5. Link conversation to contact + deal + update contact_name
      await supabase
        .from('whatsapp_conversations')
        .update({ contact_id: contactId, deal_id: newDeal.id, contact_name: contactName })
        .eq('id', conversation.id);

      // Invalidate deals cache
      queryClient.invalidateQueries({ queryKey: ['deals'] });

      // Invalidate and deep-refetch the current conversation so the UI updates instantly
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      const { data: updatedConv } = await supabase
        .from('whatsapp_conversations')
        .select('*, contacts(*), deals(*)')
        .eq('id', conversation.id)
        .single();
      if (updatedConv) {
        queryClient.setQueryData(['whatsapp-conversations'], (old: any) =>
          Array.isArray(old)
            ? old.map((c: any) => (c.id === conversation.id ? updatedConv : c))
            : old
        );
      }

      toast({ title: 'Negociação e Contato criados com sucesso!' });
      onOpenChange(false);
      setTitle('');
      setValue('');
      setStage('new_lead');
      setPropertyId('');
      onSuccess?.(newDeal.id, contactId!);
    } catch (err: any) {
      console.error('Create deal error:', err);
      toast({ title: 'Erro ao criar negociação', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [effectiveBrokerId, contactName, contactPhone, title, value, stage, propertyId, conversation.id, toast, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Negociação</DialogTitle>
          <DialogDescription>
            Crie um contato e negociação a partir desta conversa do WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={contactName} disabled className="bg-muted/50 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={contactPhone} disabled className="bg-muted/50 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Título da Negociação</Label>
            <Input
              id="deal-title"
              placeholder={`Negociação - ${contactName}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Property Selector */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Imóvel de Interesse
            </Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={propertiesLoading ? 'Carregando...' : 'Selecione um imóvel (opcional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-sm text-muted-foreground">
                  Nenhum
                </SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-sm">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Valor Estimado (R$)</Label>
              <Input
                id="deal-value"
                placeholder="0,00"
                value={value}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const formatted = (parseInt(raw || '0') / 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  });
                  setValue(formatted);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estágio</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AgentSelector
            value={assignedUserId}
            onValueChange={setAssignedUserId}
          />

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Criar Negociação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
