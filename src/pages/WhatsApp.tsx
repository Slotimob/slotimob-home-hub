import { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useWorkspace } from '@/hooks/useWorkspace';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare, WifiOff } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];
type WhatsAppConnection = Database['public']['Tables']['whatsapp_connections']['Row'];

function useWhatsAppAnyConnection() {
  const { effectiveBrokerId } = useWorkspace();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveBrokerId) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', effectiveBrokerId)
        .limit(1)
        .maybeSingle();

      if (error) console.error('Error fetching WhatsApp connection:', error);
      setConnection(data);
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel('whatsapp-connection-page')
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
            setConnection(payload.new as WhatsAppConnection);
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
  const [agentFilter, setAgentFilter] = useState<string>('all');

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

  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const { messages, loading: messagesLoading } = useMessages(selectedConversation?.id || null);
  const { sendMessage, sending } = useSendMessage();
  const contactId = selectedConversation?.contact_id || selectedConversation?.lead_id || null;
  const { contact, loading: contactLoading } = useConversationContact(contactId);

  const [showCrmPanel, setShowCrmPanel] = useState(true);
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', memberIds);

      setTeamMembers(
        (profiles || []).map(p => ({ id: p.id, name: p.full_name || 'Sem nome' }))
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
      toast({ title: 'Atendimento finalizado' });
      setSelectedConversation(prev => prev ? { ...prev, status: 'closed' } : prev);
    }
  }, [selectedConversation, toast]);

  const handleReturnToQueue = useCallback(async () => {
    if (!selectedConversation) return;
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ assigned_user_id: null, status: 'pending' })
      .eq('id', selectedConversation.id);
    if (error) {
      toast({ title: 'Erro ao devolver', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conversa devolvida para a fila de triagem' });
      setSelectedConversation(prev => prev ? { ...prev, assigned_user_id: null, status: 'pending' } : prev);
    }
  }, [selectedConversation, toast]);

  const canCreateDeal = isOwner || hasPermission('crm_pipeline', 'create');
  const [showDealDialog, setShowDealDialog] = useState(false);

  const handleCreateDeal = useCallback(() => {
    setShowDealDialog(true);
  }, []);

  const handleDealCreated = useCallback((dealId: string, contactId: string) => {
    // Update selectedConversation locally so CrmContextPanel re-renders with the new contact/deal
    setSelectedConversation(prev => prev ? { ...prev, contact_id: contactId, deal_id: dealId } : prev);
  }, []);

  const handleSendMedia = useCallback(async (file: File) => {
    if (!selectedConversation || !user) return;

    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${user.id}/${selectedConversation.id}/${Date.now()}.${ext}`;

    toast({ title: 'Enviando arquivo...', description: file.name });

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
      return;
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

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
  }, [selectedConversation, user, toast]);

  if (authLoading || connectionLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-[100dvh] flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6"><Skeleton className="h-[600px] w-full" /></main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!hasConnection) {
    return (
      <SidebarProvider>
        <div className="min-h-[100dvh] flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">WhatsApp</h1>
            </div>
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
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-[100dvh] flex w-full bg-background pb-16 md:pb-0 overflow-hidden">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
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

          <header className="border-b bg-card flex-shrink-0 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-2 px-3 py-2">
              <SidebarTrigger className="flex-shrink-0" />
              <h1 className="text-lg font-bold text-foreground">WhatsApp</h1>
              {canManage && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Supervisor
                </span>
              )}
              <div className="ml-auto">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/integrations"><Settings className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </header>

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
                onCloseConversation={canArchive && selectedConversation ? handleCloseConversation : undefined}
                onReturnToQueue={canManage && selectedConversation ? handleReturnToQueue : undefined}
              />
            </div>

            {!isMobile && showCrmPanel && selectedConversation && (
              <div className="w-72 xl:w-80 border-l flex-shrink-0 bg-card overflow-hidden">
                <CrmContextPanel
                  conversation={selectedConversation}
                  contact={contact}
                  contactLoading={contactLoading}
                  onCreateDeal={canCreateDeal ? handleCreateDeal : undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />

      {selectedConversation && (
        <CreateDealFromChatDialog
          open={showDealDialog}
          onOpenChange={setShowDealDialog}
          conversation={selectedConversation}
          onSuccess={handleDealCreated}
        />
      )}
    </SidebarProvider>
  );
}
