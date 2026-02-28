import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings, MessageSquare } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

import { ChatSidebar } from '@/components/whatsapp/ChatSidebar';
import { ChatArea } from '@/components/whatsapp/ChatArea';
import { CrmContextPanel } from '@/components/whatsapp/CrmContextPanel';
import {
  useWhatsAppConnection,
  useConversations,
  useMessages,
  useSendMessage,
  useConversationContact,
} from '@/hooks/useWhatsApp';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

export default function WhatsApp() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  const { connection, loading: connectionLoading } = useWhatsAppConnection();
  const { conversations, loading: conversationsLoading } = useConversations(connection?.id || null);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const { messages, loading: messagesLoading } = useMessages(selectedConversation?.id || null);
  const { sendMessage, sending } = useSendMessage();
  // Use contact_id (which is now synced with lead_id in the webhook)
  const contactId = selectedConversation?.contact_id || selectedConversation?.lead_id || null;
  const { contact, loading: contactLoading } = useConversationContact(contactId);

  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleSelectConversation = useCallback((conv: WhatsAppConversation) => {
    setSelectedConversation(conv);
    if (isMobile) setMobileView('chat');

    // Mark as read — optimistic + DB update
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

  // "Not connected" state
  if (!connection) {
    return (
      <SidebarProvider>
        <div className="min-h-[100dvh] flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">WhatsApp</h1>
            </div>
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Conecte seu WhatsApp</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Integração via API Oficial da Meta para gestão de conversas e leads centralizada.
              </p>
              <Button asChild>
                <Link to="/integrations"><Settings className="h-4 w-4 mr-2" />Configurar WhatsApp</Link>
              </Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-background pb-16 md:pb-0">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b bg-card flex-shrink-0 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-2 px-3 py-2">
              <SidebarTrigger className="flex-shrink-0" />
              <h1 className="text-lg font-bold text-foreground">WhatsApp</h1>
              <div className="ml-auto">
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/whatsapp-settings"><Settings className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </header>

          {/* 3-Panel Layout */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* LEFT: Conversation List */}
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
              />
            </div>

            {/* CENTER: Chat Area */}
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
                onBack={isMobile ? handleBack : undefined}
                onToggleCrm={() => setShowCrmPanel((p) => !p)}
                showCrmToggle={!!selectedConversation && !isMobile}
                loadingMessages={messagesLoading}
                sending={sending}
              />
            </div>

            {/* RIGHT: CRM Context Panel */}
            {!isMobile && showCrmPanel && selectedConversation && (
              <div className="w-72 xl:w-80 border-l flex-shrink-0 bg-card overflow-hidden">
                <CrmContextPanel
                  conversation={selectedConversation}
                  contact={contact}
                  contactLoading={contactLoading}
                  onCreateDeal={() => {
                    console.log('Create deal for contact', contact?.id);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </SidebarProvider>
  );
}
