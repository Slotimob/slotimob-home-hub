import { useState, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Mail, Phone, Tag, Plus, Calendar, StickyNote,
  PhoneCall, FileText, MessageCircle, TrendingUp, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { useContactDeals, useContactActivities } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateDealFromChatDialog } from './CreateDealFromChatDialog';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface CrmContextPanelProps {
  conversation: WhatsAppConversation | null;
  contact: any | null;
  contactLoading?: boolean;
  onCreateDeal?: () => void;
  onDealCreated?: (dealId: string, contactId: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'Novo Lead',
  contacted: 'Contactado',
  visit_scheduled: 'Visita Agendada',
  visit_done: 'Visita Realizada',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

function getActivityIcon(type: string) {
  switch (type) {
    case 'visit': case 'Visita': return <Calendar className="h-3.5 w-3.5 text-primary" />;
    case 'note': case 'Anotação': return <StickyNote className="h-3.5 w-3.5 text-amber-500" />;
    case 'call': case 'Ligação': return <PhoneCall className="h-3.5 w-3.5 text-green-500" />;
    case 'proposal': case 'Proposta': return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'message': case 'Mensagem': return <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

/** Check if a string looks like a raw phone number (digits only, possibly with +) */
function isPhoneNumber(str: string): boolean {
  return /^[\d+\s()-]+$/.test(str.trim());
}

export function CrmContextPanel({ conversation, contact, contactLoading, onCreateDeal, onDealCreated }: CrmContextPanelProps) {
  const contactId = contact?.id || conversation?.contact_id || null;
  const dealId = (conversation as any)?.deal_id || null;
  const [dealRefetchKey, setDealRefetchKey] = useState(0);
  const { deals, loading: dealsLoading } = useContactDeals(contactId, dealRefetchKey);
  const { activities, loading: activitiesLoading } = useContactActivities(contactId);
  const { toast } = useToast();
  const [updatingStage, setUpdatingStage] = useState(false);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);
  const [directDeal, setDirectDeal] = useState<any>(null);

  // If conversation has deal_id, always fetch it directly as backup
  useEffect(() => {
    if (!dealId) {
      setDirectDeal(null);
      return;
    }
    supabase
      .from('deals')
      .select('*, custom_stage:pipeline_stages(name, color), property:properties(name), unit:units(title)')
      .eq('id', dealId)
      .maybeSingle()
      .then(({ data }) => setDirectDeal(data));
  }, [dealId, dealRefetchKey]);

  const activeDeal = deals.length > 0 ? deals[0] : directDeal;

  // Identity gate: contact must have a real name (not just phone digits)
  const contactName = (contact?.name || (conversation as any)?.contacts?.name || conversation?.contact_name || '').trim();
  const hasValidName = !!contactName && !isPhoneNumber(contactName);

  const handleStageChange = useCallback(async (newStage: string) => {
    if (!activeDeal) return;
    setUpdatingStage(true);
    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage as any })
        .eq('id', activeDeal.id);
      if (error) throw error;

      if (conversation?.id) {
        const stageLabel = STAGE_LABELS[newStage] || newStage;
        await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversation.id,
            message_id: `stage-change-${Date.now()}`,
            direction: 'outgoing' as const,
            message_type: 'text' as const,
            is_internal_note: true,
            content: `📋 Estágio alterado para "${stageLabel}"`,
            status: 'read' as const,
            sent_at: new Date().toISOString(),
          });
      }

      toast({ title: 'Estágio atualizado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar estágio', description: err.message, variant: 'destructive' });
    } finally {
      setUpdatingStage(false);
    }
  }, [activeDeal, conversation, toast]);

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-6">
        <p className="text-sm text-center">Selecione uma conversa para ver os detalhes do CRM</p>
      </div>
    );
  }

  const displayName = contact?.name || conversation.contact_name || conversation.contact_phone;
  const initials = (contact?.name || conversation.contact_name || '')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        {contactLoading ? (
          <div className="flex flex-col items-center space-y-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center space-y-2">
              <Avatar className="h-16 w-16">
                {(contact?.avatar_url || conversation.contact_profile_pic) && (
                  <AvatarImage src={contact?.avatar_url || conversation.contact_profile_pic} alt={displayName} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-foreground">{displayName}</h3>
              </div>
            </div>

            <div className="space-y-2">
              {contact?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{contact?.phone || conversation.contact_phone}</span>
              </div>
              {contact?.categories && contact.categories.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {contact.categories.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        {/* Create Deal Button - ALWAYS visible */}
        <div>
          {hasValidName ? (
            <Button
              variant={activeDeal ? 'outline' : 'default'}
              className={`w-full gap-2 ${activeDeal ? 'border-dashed border-primary/40 text-primary hover:bg-primary/5' : ''}`}
              onClick={() => {
                if (onCreateDeal) {
                  onCreateDeal();
                } else {
                  setIsDealDialogOpen(true);
                }
              }}
            >
              <Plus className="h-4 w-4" />
              {activeDeal ? 'Nova Negociação' : 'Criar Negociação'}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed opacity-60 cursor-not-allowed"
                  disabled
                >
                  <Plus className="h-4 w-4" />
                  Criar Negociação
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cadastre o nome do contato antes de criar uma negociação.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Active Deal Section */}
        {dealsLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : activeDeal ? (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Negociação Atual
            </h4>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm text-foreground">
                  {activeDeal.property?.name || 'Negociação'}
                  {activeDeal.unit?.title ? ` - ${activeDeal.unit.title}` : ''}
                </p>

                {/* Stage Selector */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Estágio</span>
                  <Select
                    value={activeDeal.custom_stage_id ? undefined : activeDeal.stage}
                    onValueChange={handleStageChange}
                    disabled={updatingStage || !!activeDeal.custom_stage_id}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={activeDeal.custom_stage?.name || STAGE_LABELS[activeDeal.stage] || activeDeal.stage} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STAGE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingStage && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Atualizando...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor</span>
                    <p className="font-semibold text-foreground">
                      {activeDeal.estimated_value
                        ? activeDeal.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previsão</span>
                    <p className="font-semibold text-foreground">
                      {activeDeal.expected_close_date
                        ? format(new Date(activeDeal.expected_close_date), "dd/MM/yyyy", { locale: ptBR })
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Separator />

        {/* Activities Timeline */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Últimas Atividades
          </h4>

          {activitiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-0">
              {activities.slice(0, 5).map((activity: any, idx: number) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    {idx < Math.min(activities.length, 5) - 1 && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      {activity.title || activity.description || activity.activity_type}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(activity.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
          )}
        </div>
      </div>

      {conversation && (
        <CreateDealFromChatDialog
          open={isDealDialogOpen}
          onOpenChange={setIsDealDialogOpen}
          conversation={conversation}
          onSuccess={(dealId, cId) => {
            setDealRefetchKey(k => k + 1);
            onDealCreated?.(dealId, cId);
          }}
        />
      )}
    </ScrollArea>
  );
}
