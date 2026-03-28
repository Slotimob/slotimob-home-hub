import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Mail, Phone, Tag, Plus, Calendar, StickyNote,
  PhoneCall, FileText, MessageCircle, TrendingUp, Loader2,
  UserPlus, ArrowDown, FileSignature, CheckCircle2, Link2, UserX, Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { useContactDeals, useContactActivities } from '@/hooks/useWhatsApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { normalizePhone, formatWhatsAppToCrm } from '@/lib/utils';
import { useWorkspace } from '@/hooks/useWorkspace';
import { CreateDealFromChatDialog } from './CreateDealFromChatDialog';
import { CreateContactDialog } from '@/components/contacts/CreateContactDialog';
import { CreateProposalSheet } from '@/components/proposals/CreateProposalSheet';
import { useProposals } from '@/hooks/useProposals';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface CrmContextPanelProps {
  conversation: WhatsAppConversation | null;
  contact: any | null;
  contactLoading?: boolean;
  onCreateDeal?: () => void;
  onDealCreated?: (dealId: string, contactId: string) => void;
  onContactCreated?: () => void;
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
    case 'proposal': case 'Proposta': return <FileSignature className="h-3.5 w-3.5 text-blue-500" />;
    case 'message': case 'Mensagem': return <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function isPhoneNumber(str: string): boolean {
  return /^[\d+\s()-]+$/.test(str.trim());
}

function StepArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
    </div>
  );
}

export function CrmContextPanel({ conversation, contact, contactLoading, onCreateDeal, onDealCreated, onContactCreated }: CrmContextPanelProps) {
  const navigate = useNavigate();
  const { effectiveBrokerId } = useWorkspace();
  const contactId = contact?.id || conversation?.contact_id || null;
  const dealId = (conversation as any)?.deal_id || null;
  const [dealRefetchKey, setDealRefetchKey] = useState(0);
  const { deals, loading: dealsLoading } = useContactDeals(contactId, dealRefetchKey);
  const { activities, loading: activitiesLoading } = useContactActivities(contactId);
  const { proposals, isLoading: proposalsLoading } = useProposals();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingStage, setUpdatingStage] = useState(false);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [directDeal, setDirectDeal] = useState<any>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);

  // ── Manual contact linking via Sheet ──
  const [isLinkingSheetOpen, setIsLinkingSheetOpen] = useState(false);
  const [linkingContact, setLinkingContact] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Load contacts when linking sheet opens
  useEffect(() => {
    if (!isLinkingSheetOpen || contactsLoaded) return;
    if (!effectiveBrokerId) return;

    supabase
      .from('contacts')
      .select('id, name, phone, email, whatsapp')
      .eq('broker_id', effectiveBrokerId)
      .order('name')
      .limit(500)
      .then(({ data }) => {
        setAllContacts(data || []);
        setContactsLoaded(true);
      });
  }, [isLinkingSheetOpen, effectiveBrokerId, contactsLoaded]);

  // Filter contacts: phone match suggestions + text search
  const conversationPhone = normalizePhone(conversation?.contact_phone);
  const filteredContacts = allContacts.filter(c => {
    // Text search filter
    if (linkSearchQuery) {
      const q = linkSearchQuery.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(q);
      const phoneMatch = c.phone?.includes(q);
      const emailMatch = c.email?.toLowerCase().includes(q);
      return nameMatch || phoneMatch || emailMatch;
    }
    // Default: show phone matches first, then all
    return true;
  });

  // Sort: phone-matching contacts first
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    const aMatch = normalizePhone(a.phone) === conversationPhone || normalizePhone(a.whatsapp) === conversationPhone;
    const bMatch = normalizePhone(b.phone) === conversationPhone || normalizePhone(b.whatsapp) === conversationPhone;
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  }).slice(0, 20);

  const phoneMatchCount = allContacts.filter(c =>
    normalizePhone(c.phone) === conversationPhone || normalizePhone(c.whatsapp) === conversationPhone
  ).length;

  const handleLinkContact = useCallback(async (selectedContact: any) => {
    if (!selectedContact?.id || !conversation?.id) return;
    setLinkingContact(true);
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ contact_id: selectedContact.id, contact_name: selectedContact.name })
        .eq('id', conversation.id);
      toast({ title: 'Contato vinculado com sucesso!' });
      setIsLinkingSheetOpen(false);
      onContactCreated?.();
    } catch (e: any) {
      toast({ title: 'Erro ao vincular', description: e.message, variant: 'destructive' });
    } finally {
      setLinkingContact(false);
    }
  }, [conversation, toast, onContactCreated]);

  useEffect(() => {
    if (!dealId) {
      setDirectDeal(null);
      return;
    }
    supabase
      .from('deals')
      .select('*, custom_stage:pipeline_stages(name, color), property:properties(name), unit:units(unit_number)')
      .eq('id', dealId)
      .maybeSingle()
      .then(({ data }) => setDirectDeal(data));
  }, [dealId, dealRefetchKey]);

  const activeDeal = deals.length > 0 ? deals[0] : directDeal;

  const contactName = (contact?.name || (conversation as any)?.contacts?.name || conversation?.contact_name || '').trim();
  const hasValidName = !!contactName && !isPhoneNumber(contactName);

  const contactPhone = contact?.phone || conversation?.contact_phone || '';

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

  const handleContactCreated = useCallback(async (newContact?: any) => {
    if (newContact?.id && conversation?.id) {
      try {
        await supabase
          .from('whatsapp_conversations')
          .update({ contact_id: newContact.id, contact_name: newContact.name })
          .eq('id', conversation.id);
      } catch (e) {
        console.error('Error linking contact to conversation:', e);
      }
    }
    toast({ title: 'Contato criado com sucesso!' });
    onContactCreated?.();
  }, [toast, onContactCreated, conversation]);

  const handleDealCreated = useCallback(async (newDealId: string, cId: string) => {
    if (conversation?.id && newDealId) {
      try {
        await supabase
          .from('whatsapp_conversations')
          .update({ deal_id: newDealId } as any)
          .eq('id', conversation.id);
      } catch (e) {
        console.error('Error saving deal_id to conversation:', e);
      }
    }
    setDealRefetchKey(k => k + 1);
    // Invalidate contact-deals cache for instant UI update
    if (cId) {
      queryClient.invalidateQueries({ queryKey: ['contact-deals', cId] });
    }
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    onDealCreated?.(newDealId, cId);
  }, [conversation, onDealCreated, queryClient]);

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

  const activeDealsCount = deals.filter((d: any) => !['won', 'lost'].includes(d.stage)).length;
  const allDealsForDisplay = deals.filter((d: any) => !['won', 'lost'].includes(d.stage));

  // Filter proposals for this contact
  const contactProposals = proposals.filter((p: any) => {
    if (!contactId) return false;
    // Match by contact_id first, then deal_id, then lead_name
    if (p.contact_id === contactId) return true;
    const contactDealsIds = deals.map((d: any) => d.id);
    if (p.deal_id && contactDealsIds.includes(p.deal_id)) return true;
    return p.lead_name && contact?.name && p.lead_name.toLowerCase() === contact.name.toLowerCase();
  });

  return (
    <TooltipProvider>
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
                {contact && activeDealsCount > 0 && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                     {activeDealsCount} negociaç{activeDealsCount > 1 ? 'ões ativas' : 'ão ativa'}
                  </Badge>
                )}
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

        {/* Unlinked contact banner */}
        {!contact && !contactLoading && (
          <button
            onClick={() => {
              setContactsLoaded(false);
              setLinkSearchQuery('');
              setIsLinkingSheetOpen(true);
            }}
            className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
          >
            <UserX className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800">Contato não identificado</p>
              <p className="text-[10px] text-amber-600">Toque para vincular a um contato existente</p>
            </div>
            <Link2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          </button>
        )}

        <Separator />

        {/* === VERTICAL FUNNEL === */}
        <div className="space-y-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Esteira Comercial
          </p>

          {/* STEP 1: Contact */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${contact ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
              {contact ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">1</span>}
            </div>
            <div className="flex-1 min-w-0">
              {contact ? (
                <div className="p-2 rounded-md bg-green-50 border border-green-200">
                  <p className="text-xs font-medium text-green-800">{contact.name || 'Contato criado'}</p>
                  <p className="text-[10px] text-green-600">Contato vinculado</p>
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 h-8 text-xs"
                    onClick={() => setIsCreateContactOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Criar Contato
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">Primeiro passo para iniciar o funil</p>
                </div>
              )}
            </div>
          </div>

          <StepArrow />

          {/* STEP 2: Deal */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${activeDeal ? 'bg-green-100 text-green-600' : contact ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {activeDeal ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">2</span>}
            </div>
            <div className="flex-1 min-w-0">
              {activeDealsCount > 0 ? (
                <div className="space-y-1.5">
                  <div className="p-2 rounded-md bg-green-50 border border-green-200">
                    <p className="text-xs font-medium text-green-800">
                      {activeDealsCount} negociaç{activeDealsCount > 1 ? 'ões ativas' : 'ão ativa'}
                    </p>
                  </div>
                  {allDealsForDisplay.slice(0, 3).map((deal: any) => (
                    <div key={deal.id} className="p-2 rounded-md border border-border/50 bg-muted/30">
                      <p className="text-[11px] font-medium text-foreground truncate">
                        {deal.title || deal.property?.name || 'Negociação'}
                        {deal.unit?.unit_number ? ` - ${deal.unit.unit_number}` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          {deal.custom_stage?.name || STAGE_LABELS[deal.stage] || deal.stage}
                        </p>
                        {deal.estimated_value && (
                          <p className="text-[10px] font-medium text-foreground">
                            {deal.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {hasValidName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 h-7 text-[10px] text-muted-foreground"
                      onClick={() => {
                        if (onCreateDeal) onCreateDeal();
                        else setIsDealDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      Nova Negociação
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 h-8 text-xs"
                    disabled={!contact || !hasValidName}
                    onClick={() => {
                      if (onCreateDeal) onCreateDeal();
                      else setIsDealDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar Negociação
                  </Button>
                  {!contact && (
                    <p className="text-[10px] text-muted-foreground mt-1">(Requer um contato criado)</p>
                  )}
                  {contact && !hasValidName && (
                    <p className="text-[10px] text-muted-foreground mt-1">(Cadastre o nome do contato)</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <StepArrow />

          {/* STEP 3: Proposal — requires only contact_id */}
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${contactId ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <span className="text-xs font-bold">3</span>
            </div>
            <div className="flex-1 min-w-0">
              {contactId ? (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full gap-2 h-8 text-xs"
                  onClick={() => setIsProposalOpen(true)}
                >
                  <FileSignature className="h-3.5 w-3.5" />
                  Gerar Proposta
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 h-8 text-xs pointer-events-none opacity-50"
                        disabled
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        Gerar Proposta
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Vincule um contato para liberar</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Active Deal Details */}
        {dealsLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : activeDeal ? (
          <div>
            <Separator className="mb-3" />
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Negociação Atual
            </h4>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-2">
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

        {/* Proposals History */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <FileSignature className="h-4 w-4" />
            Propostas
            {contactProposals.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                {contactProposals.length}
              </Badge>
            )}
          </h4>

          {proposalsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : contactProposals.length > 0 ? (
            <div className="space-y-1.5">
              {contactProposals.slice(0, 5).map((proposal: any) => (
                <div key={proposal.id} className="p-2 rounded-md border border-border/50 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {proposal.property?.name || proposal.lead_name || 'Proposta'}
                    </p>
                    <Badge
                      variant={proposal.status === 'sent' ? 'default' : 'secondary'}
                      className="text-[9px] px-1.5 py-0 h-4"
                    >
                      {proposal.status === 'sent' ? 'Enviada' : proposal.status === 'draft' ? 'Rascunho' : proposal.status === 'accepted' ? 'Aceita' : proposal.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(proposal.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma proposta ainda</p>
          )}
        </div>

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
          onSuccess={handleDealCreated}
        />
      )}

      <CreateContactDialog
        open={isCreateContactOpen}
        onOpenChange={setIsCreateContactOpen}
        onSuccess={handleContactCreated}
        initialPhone={formatWhatsAppToCrm(contactPhone)}
      />

      {/* Manual Contact Linking Sheet */}
      <Sheet open={isLinkingSheetOpen} onOpenChange={setIsLinkingSheetOpen}>
        <SheetContent side="right" className="w-[340px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-base">Vincular Contato</SheetTitle>
            <SheetDescription className="text-xs">
              Selecione um contato existente para vincular a esta conversa.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou e-mail..."
                value={linkSearchQuery}
                onChange={e => setLinkSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {phoneMatchCount > 0 && !linkSearchQuery && (
              <p className="text-[10px] text-amber-600 font-medium">
                📌 {phoneMatchCount} contato{phoneMatchCount > 1 ? 's' : ''} com telefone correspondente
              </p>
            )}

            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="space-y-1 pr-2">
                {!contactsLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhum contato encontrado.
                  </p>
                ) : (
                  sortedContacts.map(c => {
                    const isMatch = normalizePhone(c.phone) === conversationPhone || normalizePhone(c.whatsapp) === conversationPhone;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isMatch ? 'border-amber-200 bg-amber-50' : 'border-transparent hover:bg-muted/50'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.phone || c.email || '—'}
                            {isMatch && <span className="ml-1 text-amber-600 font-medium">• Telefone correspondente</span>}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isMatch ? 'default' : 'outline'}
                          className="h-7 text-xs px-3 flex-shrink-0"
                          disabled={linkingContact}
                          onClick={() => handleLinkContact(c)}
                        >
                          {linkingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <Separator />

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => {
                setIsLinkingSheetOpen(false);
                setIsCreateContactOpen(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Criar novo contato
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Proposal Sheet (embedded) */}
      <CreateProposalSheet
        open={isProposalOpen}
        onOpenChange={setIsProposalOpen}
        preSelectedUnitId={activeDeal?.unit_id || activeDeal?.unit?.id || undefined}
        initialLeadName={contact?.name || conversation?.contact_name || ''}
        dealId={activeDeal?.id || undefined}
        contactId={contactId || undefined}
        onProposalGenerated={async (pdfBlob, proposalId) => {
          // Log a note in the chat
          if (conversation?.id) {
            try {
              await supabase
                .from('whatsapp_messages')
                .insert({
                  conversation_id: conversation.id,
                  message_id: `proposal-${Date.now()}`,
                  direction: 'outgoing' as const,
                  message_type: 'text' as const,
                  is_internal_note: true,
                  content: `📄 Proposta gerada (ID: ${proposalId?.slice(0, 8)}...)`,
                  status: 'read' as const,
                  sent_at: new Date().toISOString(),
                });
            } catch (e) {
              console.error('Error logging proposal note:', e);
            }
          }
        }}
      />
    </ScrollArea>
    </TooltipProvider>
  );
}
