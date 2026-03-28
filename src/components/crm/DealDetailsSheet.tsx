import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Building2, User, Phone, Mail, DollarSign, CalendarDays, Percent, Save, MessageSquare, CheckSquare, History, Link2, Flame, Thermometer, Snowflake, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { DealActivities } from './DealActivities';
import { DealTasks } from './DealTasks';
import { DealStageHistory } from './DealStageHistory';
import type { Deal } from '@/pages/Pipeline';

interface LinkedContact {
  id: string;
  name: string;
  phone: string | null;
}

// Helper function to convert probability number to label
const getProbabilityLabel = (probability: number): string => {
  if (probability >= 70) return 'high';
  if (probability >= 40) return 'medium';
  return 'low';
};

// Helper function to convert probability label to number
const getProbabilityValue = (label: string): number => {
  switch (label) {
    case 'high': return 80;
    case 'medium': return 50;
    case 'low': return 20;
    default: return 50;
  }
};

interface DealDetailsSheetProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const DealDetailsSheet = ({ deal, open, onOpenChange, onUpdate }: DealDetailsSheetProps) => {
  const { toast } = useToast();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('crm_pipeline', 'edit');
  const canDelete = isOwner || hasPermission('crm_pipeline', 'delete');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkedContact, setLinkedContact] = useState<LinkedContact | null>(null);
  const [editedDeal, setEditedDeal] = useState<{
    title: string;
    estimated_value: number | null;
    commission_rate: number;
    notes: string | null;
    priority: string;
    probability: string;
    expected_close_date: Date | null;
    temperature: 'hot' | 'warm' | 'cold';
    lead_id: string | null;
    contact_id: string | null;
    unit_id: string | null;
    property_id: string | null;
  }>({
    title: (deal as any)?.title ?? '',
    estimated_value: deal?.estimated_value ?? null,
    commission_rate: deal?.estimated_commission && deal?.estimated_value 
      ? (deal.estimated_commission / deal.estimated_value) * 100 
      : 5,
    notes: deal?.notes ?? null,
    priority: (deal as any)?.priority ?? 'medium',
    probability: getProbabilityLabel((deal as any)?.probability ?? 50),
    expected_close_date: (deal as any)?.expected_close_date ? new Date((deal as any).expected_close_date) : null,
    temperature: (deal as any)?.temperature ?? 'warm',
    lead_id: deal?.lead_id ?? null,
    contact_id: (deal as any)?.contact_id ?? null,
    unit_id: (deal as any)?.unit_id ?? null,
    property_id: (deal as any)?.property_id ?? null,
  });

  // Load linked contact from unit
  useEffect(() => {
    if (deal?.unit?.id) {
      loadLinkedContact();
    } else {
      setLinkedContact(null);
    }
  }, [deal?.unit?.id]);

  const loadLinkedContact = async () => {
    if (!deal?.unit?.id) return;
    
    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('lead_id')
        .eq('id', deal.unit.id)
        .single();

      if (error || !unit?.lead_id) {
        setLinkedContact(null);
        return;
      }

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('id', unit.lead_id)
        .single();

      if (leadError || !lead) {
        setLinkedContact(null);
        return;
      }

      setLinkedContact(lead);
    } catch (error) {
      console.error('Error loading linked contact:', error);
      setLinkedContact(null);
    }
  };

  // Calculate estimated commission based on value and rate
  const calculatedCommission = editedDeal.estimated_value 
    ? (editedDeal.estimated_value * editedDeal.commission_rate) / 100 
    : 0;

  // Reset form when deal changes
  useEffect(() => {
    if (deal && open) {
      setEditedDeal({
        title: (deal as any).title ?? '',
        estimated_value: deal.estimated_value,
        commission_rate: deal.estimated_commission && deal.estimated_value 
          ? (deal.estimated_commission / deal.estimated_value) * 100 
          : 5,
        notes: deal.notes,
        priority: (deal as any).priority ?? 'medium',
        probability: getProbabilityLabel((deal as any).probability ?? 50),
        expected_close_date: (deal as any).expected_close_date ? new Date((deal as any).expected_close_date) : null,
        temperature: (deal as any).temperature ?? 'warm',
        lead_id: deal.lead_id ?? null,
        contact_id: (deal as any).contact_id ?? null,
        unit_id: (deal as any).unit_id ?? null,
        property_id: (deal as any).property_id ?? null,
      });
    }
  }, [deal?.id, open]);

  const handleSave = async () => {
    if (!deal) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          title: editedDeal.title || null,
          estimated_value: editedDeal.estimated_value,
          estimated_commission: calculatedCommission,
          notes: editedDeal.notes,
          priority: editedDeal.priority,
          probability: getProbabilityValue(editedDeal.probability),
          expected_close_date: editedDeal.expected_close_date?.toISOString().split('T')[0] ?? null,
          temperature: editedDeal.temperature,
          contact_id: editedDeal.contact_id,
          unit_id: editedDeal.unit_id,
          property_id: editedDeal.property_id,
        })
        .eq('id', deal.id);

      if (error) throw error;

      toast({
        title: 'Negociação atualizada!',
        description: 'As informações foram salvas com sucesso.',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('deals').delete().eq('id', deal.id);
      if (error) throw error;
      toast({ title: 'Negociação excluída com sucesso!' });
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!deal) return null;

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    high: 'bg-destructive/20 text-destructive',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-left">{deal.lead?.name || 'Contato não atribuído'}</SheetTitle>
              <p className="text-sm text-muted-foreground">{deal.property?.name || 'Sem imóvel'}</p>
            </div>
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir negociação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A negociação será permanentemente removida do pipeline.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Contact Info */}
          <div className="flex flex-wrap gap-3">
            {deal.lead?.phone && (
              <a href={`tel:${deal.lead.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                {deal.lead.phone}
              </a>
            )}
            {deal.lead?.email && (
              <a href={`mailto:${deal.lead.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
                {deal.lead.email}
              </a>
            )}
          </div>

          {deal.unit && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Unidade {deal.unit.unit_number}</span>
            </div>
          )}

          {/* Linked Contact Badge */}
          {linkedContact && (
            <div className="p-3 rounded-lg bg-accent/50 border">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Contato vinculado ao imóvel</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{linkedContact.name}</span>
                {linkedContact.phone && (
                  <a href={`tel:${linkedContact.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Phone className="h-3 w-3" />
                    {linkedContact.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="details" className="text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Atividades
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                <CheckSquare className="h-3 w-3 mr-1" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 pt-4">
              {/* Temperature */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Temperatura do Lead
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editedDeal.temperature === 'hot' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1 gap-2",
                      editedDeal.temperature === 'hot' && "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={() => setEditedDeal({ ...editedDeal, temperature: 'hot' })}
                    disabled={!canEdit}
                  >
                    <Flame className="h-4 w-4" />
                    Quente
                  </Button>
                  <Button
                    type="button"
                    variant={editedDeal.temperature === 'warm' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1 gap-2",
                      editedDeal.temperature === 'warm' && "bg-amber-500 hover:bg-amber-600"
                    )}
                    onClick={() => setEditedDeal({ ...editedDeal, temperature: 'warm' })}
                    disabled={!canEdit}
                  >
                    <Thermometer className="h-4 w-4" />
                    Morno
                  </Button>
                  <Button
                    type="button"
                    variant={editedDeal.temperature === 'cold' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1 gap-2",
                      editedDeal.temperature === 'cold' && "bg-blue-500 hover:bg-blue-600"
                    )}
                    onClick={() => setEditedDeal({ ...editedDeal, temperature: 'cold' })}
                    disabled={!canEdit}
                  >
                    <Snowflake className="h-4 w-4" />
                    Frio
                  </Button>
                </div>
              </div>

              {/* Priority and Probability */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={editedDeal.priority}
                    onValueChange={(value) => setEditedDeal({ ...editedDeal, priority: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select
                    value={editedDeal.probability}
                    onValueChange={(value) => setEditedDeal({ ...editedDeal, probability: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expected Close Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Previsão de Fechamento
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !editedDeal.expected_close_date && 'text-muted-foreground'
                      )}
                      disabled={!canEdit}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {editedDeal.expected_close_date
                        ? format(editedDeal.expected_close_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editedDeal.expected_close_date ?? undefined}
                      onSelect={(date) => setEditedDeal({ ...editedDeal, expected_close_date: date ?? null })}
                      locale={ptBR}
                      disabled={!canEdit}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Valor Estimado
                  </Label>
                  <Input
                    type="number"
                    value={editedDeal.estimated_value ?? ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, estimated_value: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0,00"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Comissão (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editedDeal.commission_rate}
                    onChange={(e) => setEditedDeal({ ...editedDeal, commission_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="5"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Calculated Commission Display */}
              {editedDeal.estimated_value && editedDeal.commission_rate > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Comissão Estimada:</span>
                    <span className="font-semibold text-primary">
                      {calculatedCommission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={editedDeal.notes ?? ''}
                  onChange={(e) => setEditedDeal({ ...editedDeal, notes: e.target.value || null })}
                  placeholder="Adicione observações sobre este deal..."
                  rows={3}
                  disabled={!canEdit}
                />
              </div>

              {/* Save Button - only shown when user can edit */}
              {canEdit && (
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="activities" className="pt-4">
              <DealActivities dealId={deal.id} />
            </TabsContent>

            <TabsContent value="tasks" className="pt-4">
              <DealTasks dealId={deal.id} />
            </TabsContent>

            <TabsContent value="history" className="pt-4">
              <DealStageHistory dealId={deal.id} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
