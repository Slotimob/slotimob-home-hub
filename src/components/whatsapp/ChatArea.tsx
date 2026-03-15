import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare, Send, Paperclip, FileText, Phone, MoreVertical,
  Check, CheckCheck, ArrowLeft, ChevronRight, Loader2, WifiOff,
  Image as ImageIcon, Mic, Film, File, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { QUICK_REPLIES } from './mockData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];
type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

interface ChatAreaProps {
  conversation: WhatsAppConversation | null;
  messages: WhatsAppMessage[];
  onSendMessage: (content: string) => void;
  onSendMedia?: (file: File) => void;
  onBack?: () => void;
  onToggleCrm?: () => void;
  showCrmToggle?: boolean;
  loadingMessages?: boolean;
  sending?: boolean;
  isConnected?: boolean;
  assignedUserId?: string | null;
  teamMembers?: { id: string; name: string }[];
  isOwner?: boolean;
  onReassign?: (conversationId: string, newUserId: string) => void;
  conversationId?: string | null;
  onCloseConversation?: () => void;
  onReturnToQueue?: () => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status, isOutgoing }: { status: string; isOutgoing: boolean }) {
  if (!isOutgoing) return null;
  switch (status) {
    case 'pending':
      return <Loader2 className="h-3 w-3 text-white/60 animate-spin" />;
    case 'sent':
      return <Check className="h-3 w-3 text-white/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-white/60" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    case 'failed':
      return <span className="text-[10px] text-red-300">!</span>;
    default:
      return null;
  }
}

function MediaContent({ msg }: { msg: WhatsAppMessage }) {
  const mediaUrl = msg.media_url;
  const [mediaError, setMediaError] = useState(false);
  
  if (mediaError && mediaUrl) {
    return (
      <div className="flex items-center gap-2 p-3 rounded bg-muted/50 border border-border/50 mb-1 text-xs text-muted-foreground">
        <ImageIcon className="h-4 w-4 flex-shrink-0 opacity-60" />
        <span>Mídia expirada no servidor. Consulte no seu aparelho celular.</span>
      </div>
    );
  }

  if (msg.message_type === 'image' && mediaUrl) {
    return (
      <div className="mb-1">
        <img
          src={mediaUrl}
          alt={msg.content || 'Imagem'}
          className="rounded-md max-w-full max-h-64 object-contain cursor-pointer"
          loading="lazy"
          onError={() => setMediaError(true)}
        />
      </div>
    );
  }

  if (msg.message_type === 'audio' && mediaUrl) {
    return (
      <div className="mb-1 min-w-[200px]">
        <audio controls preload="none" className="w-full h-8">
          <source src={mediaUrl} type={msg.media_mime_type || 'audio/ogg'} />
        </audio>
      </div>
    );
  }

  if (msg.message_type === 'video' && mediaUrl) {
    return (
      <div className="mb-1">
        <video
          controls
          preload="none"
          className="rounded-md max-w-full max-h-64"
          poster=""
        >
          <source src={mediaUrl} type={msg.media_mime_type || 'video/mp4'} />
        </video>
      </div>
    );
  }

  if (msg.message_type === 'document' && mediaUrl) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded bg-black/10 dark:bg-white/10 mb-1 hover:opacity-80 transition-opacity"
      >
        <File className="h-5 w-5 flex-shrink-0" />
        <span className="text-xs truncate">{msg.media_filename || 'Documento'}</span>
      </a>
    );
  }

  if (['image', 'audio', 'video', 'sticker'].includes(msg.message_type) && !mediaUrl) {
    const icons: Record<string, any> = { image: ImageIcon, audio: Mic, video: Film, sticker: ImageIcon };
    const Icon = icons[msg.message_type] || ImageIcon;
    const labels: Record<string, string> = { image: 'Imagem', audio: 'Áudio', video: 'Vídeo', sticker: 'Sticker' };
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-70 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span>{labels[msg.message_type] || msg.message_type}</span>
      </div>
    );
  }

  return null;
}

// Small hook to resolve agent name from ID
function useAgentName(userId: string | null, teamMembers: { id: string; name: string }[]) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setName(null); return; }
    const found = teamMembers.find(m => m.id === userId);
    if (found) { setName(found.name); return; }

    // Fallback: fetch from profiles
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
      .then(({ data }) => setName(data?.full_name || 'Agente'));
  }, [userId, teamMembers]);

  return name;
}

export function ChatArea({
  conversation,
  messages,
  onSendMessage,
  onBack,
  onToggleCrm,
  showCrmToggle,
  loadingMessages,
  sending,
  isConnected = true,
  assignedUserId,
  teamMembers = [],
  isOwner = false,
  onReassign,
  conversationId,
  onCloseConversation,
  onReturnToQueue,
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentName = useAgentName(assignedUserId || null, teamMembers);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || sending || !isConnected) return;
    onSendMessage(messageText.trim());
    setMessageText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const handleQuickReply = (content: string) => {
    setMessageText(content);
    setTemplatesOpen(false);
    textareaRef.current?.focus();
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-3">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">Selecione uma conversa</h3>
            <p className="text-sm text-muted-foreground mt-1">Escolha um contato para iniciar o atendimento</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = conversation.contact_name || conversation.contact_phone;
  const initials = conversation.contact_name
    ? conversation.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : conversation.contact_phone.slice(-2);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b bg-card flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            {conversation.contact_profile_pic && (
              <AvatarImage src={conversation.contact_profile_pic} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{displayName}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {conversation.contact_phone}
            </p>
          </div>
        </div>

        {/* Agent Badge + Reassignment */}
        {assignedUserId && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && teamMembers.length > 0 && onReassign && conversationId ? (
              <Select
                value={assignedUserId}
                onValueChange={(val) => onReassign(conversationId, val)}
              >
                <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs border-border/50 bg-muted/50">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3 w-3 text-primary" />
                    <SelectValue placeholder="Responsável" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <UserCheck className="h-3 w-3" />
                {agentName || 'Agente'}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {showCrmToggle && (
            <Button variant="ghost" size="icon" onClick={onToggleCrm} className="hidden lg:flex">
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end" side="bottom">
              {onCloseConversation && (
                <button
                  onClick={onCloseConversation}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 rounded-md transition-colors text-destructive"
                >
                  Finalizar Atendimento
                </button>
              )}
              {onReturnToQueue && (
                <button
                  onClick={onReturnToQueue}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 rounded-md transition-colors"
                >
                  Devolver para Fila
                </button>
              )}
              {!onCloseConversation && !onReturnToQueue && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Sem ações disponíveis</p>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="p-4 space-y-2 min-h-full"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        >
          {loadingMessages ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                  <Skeleton className={cn('h-12 rounded-lg', i % 2 === 0 ? 'w-3/5' : 'w-2/5')} />
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOutgoing = msg.direction === 'outgoing';
                const isNote = msg.is_internal_note;
                const hasMedia = msg.media_url && ['image', 'audio', 'video', 'document'].includes(msg.message_type);
                return (
                  <div key={msg.id} className={cn('flex', isOutgoing ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative',
                        isNote
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-br-sm'
                          : isOutgoing
                            ? 'bg-[hsl(142,70%,40%)] text-white rounded-br-sm'
                            : 'bg-card text-foreground border border-border/50 rounded-bl-sm',
                        hasMedia && 'p-1.5'
                      )}
                    >
                      {isNote && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 block mb-0.5">
                          Nota interna
                        </span>
                      )}
                      <MediaContent msg={msg} />
                      {msg.content && (
                        <p className={cn("text-sm whitespace-pre-wrap break-words", hasMedia && "px-1.5")}>{msg.content}</p>
                      )}
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1 -mb-0.5',
                        isNote ? 'text-amber-700 dark:text-amber-300' : isOutgoing ? 'text-white/70' : 'text-muted-foreground',
                        hasMedia && 'px-1.5'
                      )}>
                        <span className="text-[10px]">{formatTime(msg.sent_at)}</span>
                        <StatusIcon status={msg.status} isOutgoing={isOutgoing && !isNote} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-3 py-2.5 border-t bg-card flex-shrink-0">
        {!isConnected ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span>Conecte seu WhatsApp para enviar novas mensagens</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
              onClick={() => toast({ title: 'Em breve', description: 'Envio de anexos estará disponível em breve.' })}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9">
                  <FileText className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start" side="top">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-sm">Respostas Rápidas</h4>
                </div>
                <ScrollArea className="max-h-60">
                  <div className="p-1">
                    {QUICK_REPLIES.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => handleQuickReply(qr.content)}
                        className="w-full text-left px-3 py-2.5 hover:bg-accent/50 rounded-md transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground">{qr.title}</span>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{qr.content}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="flex-1 min-w-0 relative">
              <textarea
                ref={textareaRef}
                placeholder="Digite uma mensagem..."
                value={messageText}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{ maxHeight: '120px' }}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              size="icon"
              className="flex-shrink-0 h-9 w-9 rounded-full"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
