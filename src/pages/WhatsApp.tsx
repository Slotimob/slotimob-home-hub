import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Send, 
  Settings, 
  MessageSquare, 
  Phone, 
  User, 
  Check, 
  CheckCheck,
  Clock,
  AlertCircle,
  Paperclip,
  Image as ImageIcon
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Conversation = {
  id: string;
  connection_id: string;
  lead_id: string | null;
  remote_jid: string;
  contact_name: string | null;
  contact_phone: string;
  contact_profile_pic: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_archived: boolean;
};

type Message = {
  id: string;
  conversation_id: string;
  message_id: string;
  direction: 'incoming' | 'outgoing';
  message_type: string;
  content: string | null;
  media_url: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
};

type Connection = {
  id: string;
  status: string;
};

export default function WhatsApp() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // DISABLED: WhatsApp connection query - causing 406 errors that block network
  // TODO: Re-enable once whatsapp_connections table RLS is fixed
  const connection: Connection | null = null;
  const connectionLoading = false;

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['whatsapp-conversations', connection?.id],
    queryFn: async () => {
      if (!connection?.id) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('connection_id', connection.id)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!connection?.id,
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['whatsapp-messages', selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('sent_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation?.id,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error('No conversation selected');

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: selectedConversation.id,
          messageType: 'text',
          content,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark conversation as read
  const markAsRead = async (conversationId: string) => {
    await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
    
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
  };

  // Setup realtime subscription
  useEffect(() => {
    if (!connection?.id) return;

    const messagesChannel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('whatsapp-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [connection?.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unread_count > 0) {
      markAsRead(conversation.id);
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessage.mutate(messageText.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter conversations
  const filteredConversations = conversations?.filter(conv => 
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact_phone.includes(searchTerm)
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-destructive" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (authLoading || connectionLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)] flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <Skeleton className="h-[600px] w-full" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no connection, show setup prompt
  if (!connection) {
    return (
      <SidebarProvider>
        <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)] flex w-full bg-background">
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
                Para começar a gerenciar suas conversas, você precisa conectar seu WhatsApp Business.
              </p>
              <Button asChild>
                <Link to="/whatsapp/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar WhatsApp
                </Link>
              </Button>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] pt-[env(safe-area-inset-top)] flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-xl font-bold">WhatsApp</h1>
            <div className="ml-auto">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/whatsapp/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Conversations List */}
            <div className="w-80 border-r flex flex-col">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {conversationsLoading ? (
                  <div className="p-3 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`w-full p-3 flex items-start gap-3 hover:bg-accent/50 transition-colors border-b ${
                        selectedConversation?.id === conv.id ? 'bg-accent' : ''
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={conv.contact_profile_pic || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {conv.contact_name || conv.contact_phone}
                          </span>
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground truncate">
                            {conv.last_message || 'Sem mensagens'}
                          </span>
                          {conv.unread_count > 0 && (
                            <Badge variant="default" className="ml-2 h-5 min-w-5 rounded-full">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center gap-3 bg-card">
                    <Avatar>
                      <AvatarImage src={selectedConversation.contact_profile_pic || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">
                        {selectedConversation.contact_name || selectedConversation.contact_phone}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.contact_phone}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-2/3" />
                        ))}
                      </div>
                    ) : messages?.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Nenhuma mensagem ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.direction === 'outgoing'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-accent'
                              }`}
                            >
                              {msg.message_type === 'image' && msg.media_url && (
                                <img 
                                  src={msg.media_url} 
                                  alt="Imagem" 
                                  className="max-w-full rounded mb-2"
                                />
                              )}
                              {msg.content && <p className="text-sm">{msg.content}</p>}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${
                                msg.direction === 'outgoing' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                <span className="text-xs">
                                  {format(new Date(msg.sent_at), 'HH:mm', { locale: ptBR })}
                                </span>
                                {msg.direction === 'outgoing' && getStatusIcon(msg.status)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-3 border-t bg-card">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" disabled>
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled>
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <Input
                        placeholder="Digite uma mensagem..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!messageText.trim() || sendMessage.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3" />
                    <p>Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
