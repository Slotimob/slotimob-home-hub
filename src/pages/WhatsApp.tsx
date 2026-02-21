import { useState, useCallback } from 'react';
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

import { ChatSidebar } from '@/components/whatsapp/ChatSidebar';
import { ChatArea } from '@/components/whatsapp/ChatArea';
import { CrmContextPanel } from '@/components/whatsapp/CrmContextPanel';
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_CONTACT_DETAILS,
  type MockConversation,
  type MockMessage,
} from '@/components/whatsapp/mockData';

// For demo purposes we keep connection always "connected"
const DEMO_MODE = true;

export default function WhatsApp() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  const [selectedConversation, setSelectedConversation] = useState<MockConversation | null>(null);
  const [localMessages, setLocalMessages] = useState<Record<string, MockMessage[]>>(MOCK_MESSAGES);
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const handleSelectConversation = useCallback((conv: MockConversation) => {
    setSelectedConversation(conv);
    if (isMobile) setMobileView('chat');
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setMobileView('list');
    setSelectedConversation(null);
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedConversation) return;
    const newMsg: MockMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversation.id,
      direction: 'outgoing',
      content,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    setLocalMessages((prev) => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg],
    }));
    // Simulate status update
    setTimeout(() => {
      setLocalMessages((prev) => ({
        ...prev,
        [selectedConversation.id]: prev[selectedConversation.id]?.map((m) =>
          m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m
        ) || [],
      }));
    }, 1000);
    setTimeout(() => {
      setLocalMessages((prev) => ({
        ...prev,
        [selectedConversation.id]: prev[selectedConversation.id]?.map((m) =>
          m.id === newMsg.id ? { ...m, status: 'read' as const } : m
        ) || [],
      }));
    }, 2500);
  }, [selectedConversation]);

  const currentMessages = selectedConversation
    ? localMessages[selectedConversation.id] || []
    : [];

  const currentContact = selectedConversation
    ? MOCK_CONTACT_DETAILS[selectedConversation.id] || null
    : null;

  if (authLoading) {
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

  // "Not connected" state (when not in demo mode and no real connection)
  if (!DEMO_MODE) {
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
          {/* Top bar - visible only on desktop or when showing conversation list on mobile */}
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
                conversations={MOCK_CONVERSATIONS}
                selectedId={selectedConversation?.id || null}
                onSelect={handleSelectConversation}
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
                messages={currentMessages}
                onSendMessage={handleSendMessage}
                onBack={isMobile ? handleBack : undefined}
                onToggleCrm={() => setShowCrmPanel((p) => !p)}
                showCrmToggle={!!selectedConversation && !isMobile}
              />
            </div>

            {/* RIGHT: CRM Context Panel */}
            {!isMobile && showCrmPanel && selectedConversation && (
              <div className="w-72 xl:w-80 border-l flex-shrink-0 bg-card overflow-hidden">
                <CrmContextPanel
                  contact={currentContact}
                  onCreateDeal={() => {
                    // Will be integrated with CreateDealDialog later
                    console.log('Create deal for contact', currentContact?.id);
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
