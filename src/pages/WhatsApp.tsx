import { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AppLayout } from '@/components/AppLayout';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Settings, MessageSquare, WifiOff, PanelRightOpen } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { cn, normalizePhone } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

import { ChatSidebar } from '@/components/whatsapp/ChatSidebar';
import { ChatArea } from '@/components/whatsapp/ChatArea';
import { CrmContextPanel } from '@/components/whatsapp/CrmContextPanel';
import { AssignAgentSelect } from '@/components/whatsapp/AssignAgentSelect';
import { CreateDealFromChatDialog } from '@/components/whatsapp/CreateDealFromChatDialog';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useConversationContact,
} from '@/hooks/useWhatsApp';
import type { WhatsAppConnectionClient } from '@/hooks/useWhatsApp';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

function useWhatsAppAnyConnection() {
  const { effectiveBrokerId } = useWorkspace();
  const [connection, setConnection] = useState<WhatsAppConnectionClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveBrokerId) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('api_provider, broker_id, connected_at, connection_status, created_at, evolution_api_url, id, instance_name, phone_number, phone_number_id, qr_code, qr_code_base64, status, updated_at, waba_id, webhook_url')
        .eq('broker_id', effectiveBrokerId)
        .limit(1)
        .maybeSingle();

      if (error) console.error('Error fetching WhatsApp connection:', error);
      setConnection(data);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel(`whatsapp-connection-${effectiveBrokerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `broker_id=eq.${effectiveBrokerId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setConnection(null);
          } else {
            setConnection(payload.new as WhatsAppConnectionClient);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectiveBrokerId]);

  return { connection, loading };
}

export default function WhatsApp() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, hasPermission } = usePermissions();
  const { effectiveBrokerId } = useWorkspace();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [deepLinkText, setDeepLinkText] = useState<string>('');

  // Permission checks for crm_whatsapp
  const canView = isOwner || hasPermission('crm_whatsapp', 'view');
  const canManage = isOwner || hasPermission('crm_whatsapp', 'edit'); // Triage manager
  const canCreate = isOwner || hasPermission('crm_whatsapp', 'create');
  const canArchive = isOwner || hasPermission('crm_whatsapp', 'delete');

  const { connection, loading: connectionLoading } = useWhatsAppAnyConnection();
  const isConnected = connection?.status === 'connected';
  const hasConnection = !!connection;

  const { conversations: allConversations, loading: conversationsLoading } = useConversations(connection?.id || null);

  // Visibility: managers see all, agents see only assigned
  const conversations = useMemo(() => {
    let filtered = allConversations;
    if (!canManage && user) {
      // Agent: only assigned conversations
      filtered = filtered.filter(c => c.assigned_user_id === user.id);
    }
    // Owner/manager agent filter
    if (canManage && agentFilter !== 'all') {
      filtered = filtered.filter(c => c.assigned_user_id === agentFilter);
    }
    return filtered;
  }, [allConversations, canManage, user, agentFilter]);

  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // Keep selectedConversation in sync with conversations list (deep-fetched data)
  useEffect(() => {
    if (!selectedConversation) return;
    const updated = allConversations.find(c => c.id === selectedConversation.id);
    if (updated && updated !== selectedConversation) {
      setSelectedConversation(updated);
    }
  }, [allConversations, selectedConversation]);

  // ── Deep Link: intercept ?phone=X&text=Y ──
  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    const textParam = searchParams.get('text') || '';
    if (!phoneParam || conversationsLoading) return;

    // Extract only digits for flexible matching
    const digits = phoneParam.replace(/\D/g, '');
    if (digits.length < 8) {
      setSearchParams({}, { replace: true });
      return;
    }

    // Use last 8-9 digits for flexible match (handles 55 prefix / extra 9 variations)
    const lastDigits = digits.slice(-9);
    const lastDigits8 = digits.slice(-8);

    const match = allConversations.find(c => {
      const cDigits = (c.contact_phone || '').replace(/\D/g, '');
      return cDigits.endsWith(lastDigits) || cDigits.endsWith(lastDigits8);
    });

    if (match) {
      handleSelectConversation(match);
      if (textParam) setDeepLinkText(textParam);
    } else {
      // Ensure the phone passed to NewConversationDialog starts with 55
      let sanitized = digits;
      if (sanitized.startsWith('0')) sanitized = sanitized.substring(1);
      if (sanitized.length <= 11) sanitized = '55' + sanitized;
      setDeepLinkNewConv({ phone: sanitized, text: textParam });
    }

    // Clear params to prevent loops
    setSearchParams({}, { replace: true });
  }, [searchParams, allConversations, conversationsLoading]);

  const [deepLinkNewConv, setDeepLinkNewConv] = useState<{ phone: string; text: string } | null>(null);

  const { messages, loading: messagesLoading } = useMessages(selectedConversation?.id || null, selectedConversation?.remote_jid || null);
  const { sendMessage, sending } = useSendMessage();
  const contactId = selectedConversation?.contact_id || selectedConversation?.lead_id || null;
  const { contact, loading: contactLoading } = useConversationContact(contactId);

  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [mobileCrmOpen, setMobileCrmOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Fetch team members (manager only)
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!canManage || !effectiveBrokerId) return;
    const fetchTeam = async () => {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_owner_id', effectiveBrokerId)
        .eq('is_active', true);

      if (!members || members.length === 0) return;

      const memberIds = [effectiveBrokerId, ...members.map(m => m.user_id)];
      const { data: profiles } = await (supabase as any)
        .from('profile_directory')
        .select('id, full_name')
        .in('id', memberIds);

      setTeamMembers(
        (profiles || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Sem nome' }))
      );
    };
    fetchTeam();
  }, [canManage, effectiveBrokerId]);

  const handleSelectConversation = useCallback((conv: WhatsAppConversation) => {
    setSelectedConversation(conv);
    if (isMobile) setMobileView('chat');

    if (conv.unread_count > 0) {
      supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conv.id)
        .then(({ error }) => {
          if (error) console.error('Error marking as read:', error);
        });
    }
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setMobileView('list');
    setSelectedConversation(null);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedConversation) return;
    await sendMessage(selectedConversation.id, content);
  }, [selectedConversation, sendMessage]);

  const handleReassign = useCallback(async (conversationId: string, newUserId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ assigned_user_id: newUserId, assigned_at: new Date().toISOString(), status: 'active' })
      .eq('id', conversationId);
    if (error) console.error('Reassignment error:', error);
    else {
      setSelectedConversation(prev =>
        prev?.id === conversationId ? { ...prev, assigned_user_id: newUserId, status: 'active' } : prev
      );
    }
  }, []);

  const handleCloseConversation = useCallback(async () => {
    if (!selectedConversation) return;
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ status: 'closed' })
      .eq('id', selectedConversation.id);
    if (error) {
      toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' });
    } else {
      setSelectedConversation(prev => prev ? { ...prev, status: 'closed' } : prev);
    }
  }, [selectedConversation, toast]);

  const canCreateDeal = isOwner || hasPermission('crm_pipeline', 'create');
  const [showDealDialog, setShowDealDialog] = useState(false);

  const handleCreateDeal = useCallback(() => {
    setShowDealDialog(true);
  }, []);

  const handleDealCreated = useCallback(async (dealId: string, contactId: string) => {
    if (!selectedConversation) return;
    
    // Optimistic local update
    setSelectedConversation((prev: any) =>
      prev ? { ...prev, contact_id: contactId, deal_id: dealId } : prev
    );

    // Deep fetch with relations to fully hydrate state
    const { data: fresh, error } = await supabase
      .from('whatsapp_conversations')
      .select('*, contacts(*), deals(*)')
      .eq('id', selectedConversation.id)
      .maybeSingle();

    if (!error && fresh) {
      setSelectedConversation(fresh);
    }
  }, [selectedConversation]);

  const handleSendMedia = useCallback(async (file: File) => {
    if (!selectedConversation || !user || !effectiveBrokerId) return;

    const ext = file.name.split('.').pop() || 'bin';

    // path determinístico por conteúdo (hash SHA-256): reenviar o mesmo arquivo
    // (ex: retry manual após falha de rede) reaproveita o mesmo path via upsert,
    // em vez de criar um blob novo e órfão no storage a cada tentativa
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const filePath = `${effectiveBrokerId}/${selectedConversation.id}/${hashHex}.${ext}`;

    toast({ title: 'Enviando arquivo...', description: file.name });

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
      return;
    }

    // 2. Get signed URL (private bucket)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('whatsapp-media')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year — stored in DB for Evolution API
    if (signedError || !signedData?.signedUrl) {
      toast({ title: 'Erro ao gerar URL do arquivo', description: signedError?.message, variant: 'destructive' });
      return;
    }
    const publicUrl = signedData.signedUrl;

    // 3. Determine message type
    let msgType: 'image' | 'document' = 'document';
    if (file.type.startsWith('image/')) msgType = 'image';

    // 4. Send via Edge Function
    const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
      body: {
        conversationId: selectedConversation.id,
        messageType: msgType,
        content: msgType === 'image' ? '' : file.name,
        mediaUrl: publicUrl,
        mediaMimeType: file.type,
        mediaFilename: file.name,
      },
    });

    if (sendError) {
      toast({ title: 'Erro ao enviar', description: sendError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Arquivo enviado!' });
    }
  }, [selectedConversation, user, effectiveBrokerId, toast]);

  if (authLoading || connectionLoading) {
    return (
      <AppLayout title="WhatsApp">
        <Skeleton className="h-[600px] w-full" />
      </AppLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!hasConnection) {
    return (
      <AppLayout title="WhatsApp" titleExtra={<HelpTooltip featureKey="whatsapp.overview" />}>
        {canManage ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <MessageSquare className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Conecte seu WhatsApp</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Integração inteligente para gestão de conversas e leads de forma centralizada.
            </p>
            <Button asChild>
              <Link to="/integrations"><Settings className="h-4 w-4 mr-2" />Configurar WhatsApp</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <WifiOff className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold">WhatsApp não conectado</h2>
            <p className="text-muted-foreground text-center max-w-md">
              O WhatsApp da imobiliária ainda não foi conectado. Solicite ao administrador que realize a conexão.
            </p>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout
      fullBleed
      title="WhatsApp"
      titleExtra={
        canManage ? (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Supervisor
          </span>
        ) : undefined
      }
      headerActions={
        <Button variant="ghost" size="icon" asChild>
          <Link to="/integrations"><Settings className="h-4 w-4" /></Link>
        </Button>
      }
    >
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {!isConnected && (
            <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <WifiOff className="h-4 w-4" />
                <span>WhatsApp desconectado. Você pode ler o histórico, mas não enviar mensagens.</span>
              </div>
              <Button variant="outline" size="sm" asChild className="border-destructive/30 text-destructive hover:bg-destructive/10">
                <Link to="/integrations">Reconectar</Link>
              </Button>
            </div>
          )}




          <div className="flex-1 flex overflow-hidden min-h-0">
            <div
              className={cn(
                'border-r flex-shrink-0 overflow-hidden',
                isMobile
                  ? mobileView === 'list' ? 'w-full' : 'hidden'
                  : 'w-80 xl:w-96'
              )}
            >
              <ChatSidebar
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={handleSelectConversation}
                loading={conversationsLoading}
                connectionId={connection?.id}
                isConnected={isConnected}
                isOwner={canManage}
                teamMembers={teamMembers}
                agentFilter={agentFilter}
                onAgentFilterChange={setAgentFilter}
                showTriageTabs={canManage}
                deepLinkNewConv={deepLinkNewConv}
                onDeepLinkConsumed={() => setDeepLinkNewConv(null)}
              />
            </div>

            <div
              className={cn(
                'flex-1 flex min-w-0',
                isMobile && mobileView === 'list' && 'hidden'
              )}
            >
              <ChatArea
                conversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendMedia={isConnected ? handleSendMedia : undefined}
                onBack={isMobile ? handleBack : undefined}
                onToggleCrm={() => setShowCrmPanel((p) => !p)}
                showCrmToggle={!!selectedConversation && !isMobile}
                loadingMessages={messagesLoading}
                sending={sending}
                isConnected={isConnected}
                assignedUserId={selectedConversation?.assigned_user_id || null}
                teamMembers={canManage ? teamMembers : []}
                isOwner={canManage}
                onReassign={handleReassign}
                conversationId={selectedConversation?.id || null}
              />
            </div>

            {!isMobile && showCrmPanel && selectedConversation && (
              <div className="w-72 xl:w-80 border-l flex-shrink-0 bg-card overflow-hidden">
                <CrmContextPanel
                  conversation={selectedConversation}
                  contact={contact}
                  contactLoading={contactLoading}
                  onCreateDeal={canCreateDeal ? handleCreateDeal : undefined}
                  onDealCreated={handleDealCreated}
                  onContactCreated={() => {
                    if (selectedConversation?.id) {
                      supabase
                        .from('whatsapp_conversations')
                        .select('*, contacts(*), deals(*)')
                        .eq('id', selectedConversation.id)
                        .maybeSingle()
                        .then(({ data }) => {
                          if (data) setSelectedConversation(data as any);
                        });
                    }
                  }}
                />
              </div>
            )}
          </div>
      </div>


      {/* Mobile CRM floating button */}
      {isMobile && selectedConversation && mobileView === 'chat' && (
        <Button
          size="icon"
          variant="secondary"
          className="fixed bottom-20 right-4 z-40 h-10 w-10 rounded-full shadow-lg"
          onClick={() => setMobileCrmOpen(true)}
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile CRM Sheet */}
      <Sheet open={mobileCrmOpen} onOpenChange={setMobileCrmOpen}>
        <SheetContent side="right" className="w-[320px] p-0">
          {selectedConversation && (
            <CrmContextPanel
              conversation={selectedConversation}
              contact={contact}
              contactLoading={contactLoading}
              onCreateDeal={canCreateDeal ? handleCreateDeal : undefined}
              onDealCreated={handleDealCreated}
              onContactCreated={() => {
                if (selectedConversation?.id) {
                  supabase
                    .from('whatsapp_conversations')
                    .select('*, contacts(*), deals(*)')
                    .eq('id', selectedConversation.id)
                    .maybeSingle()
                    .then(({ data }) => {
                      if (data) setSelectedConversation(data as any);
                    });
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {selectedConversation && (
        <CreateDealFromChatDialog
          open={showDealDialog}
          onOpenChange={setShowDealDialog}
          conversation={selectedConversation}
          onSuccess={handleDealCreated}
        />
      )}
    </AppLayout>

  );
}
