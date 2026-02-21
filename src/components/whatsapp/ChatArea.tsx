import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  MessageSquare, Send, Paperclip, FileText, Phone, MoreVertical,
  Check, CheckCheck, ArrowLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MockConversation, MockMessage } from './mockData';
import { QUICK_REPLIES } from './mockData';

interface ChatAreaProps {
  conversation: MockConversation | null;
  messages: MockMessage[];
  onSendMessage: (content: string) => void;
  onBack?: () => void;
  onToggleCrm?: () => void;
  showCrmToggle?: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-white/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-white/60" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    default:
      return null;
  }
}

export function ChatArea({ conversation, messages, onSendMessage, onBack, onToggleCrm, showCrmToggle }: ChatAreaProps) {
  const [messageText, setMessageText] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
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
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {conversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {conversation.isOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-card rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">{conversation.contactName}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {conversation.contactPhone}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showCrmToggle && (
            <Button variant="ghost" size="icon" onClick={onToggleCrm} className="hidden lg:flex">
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
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
          {messages.map((msg) => {
            const isOutgoing = msg.direction === 'outgoing';
            return (
              <div key={msg.id} className={cn('flex', isOutgoing ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative',
                    isOutgoing
                      ? 'bg-[hsl(142,70%,40%)] text-white rounded-br-sm'
                      : 'bg-card text-foreground border border-border/50 rounded-bl-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={cn(
                    'flex items-center justify-end gap-1 mt-1 -mb-0.5',
                    isOutgoing ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    <span className="text-[10px]">{formatTime(msg.sentAt)}</span>
                    {isOutgoing && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-3 py-2.5 border-t bg-card flex-shrink-0">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9">
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
            disabled={!messageText.trim()}
            size="icon"
            className="flex-shrink-0 h-9 w-9 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
