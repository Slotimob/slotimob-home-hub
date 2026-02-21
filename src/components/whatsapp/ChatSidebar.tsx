import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface ChatSidebarProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
  loading?: boolean;
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffHours < 48) {
    return 'Ontem';
  }
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

export function ChatSidebar({ conversations, selectedId, onSelect, loading }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filtered = conversations.filter((conv) => {
    const displayName = conv.contact_name || conv.contact_phone;
    const matchesSearch =
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone.includes(searchTerm);

    if (!matchesSearch) return false;
    if (activeTab === 'unread') return conv.unread_count > 0;
    if (activeTab === 'waiting') return conv.status === 'waiting';
    return true;
  });

  const unreadTotal = conversations.filter(c => c.unread_count > 0).length;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Mensagens</h2>
          <Button size="sm" variant="default" className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Conversa</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Não lidas
              {unreadTotal > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px] rounded-full">
                  {unreadTotal}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs">Aguardando</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div>
            {filtered.map((conv) => {
              const displayName = conv.contact_name || conv.contact_phone;
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    'w-full p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors border-b border-border/50',
                    selectedId === conv.id && 'bg-accent/40'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-11 w-11">
                      {conv.contact_profile_pic && (
                        <AvatarImage src={conv.contact_profile_pic} alt={displayName} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(conv.contact_name, conv.contact_phone)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        'font-medium text-sm truncate',
                        conv.unread_count > 0 && 'font-semibold text-foreground'
                      )}>
                        {displayName}
                      </span>
                      <span className={cn(
                        'text-[11px] flex-shrink-0 ml-2',
                        conv.unread_count > 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}>
                        {formatTimestamp(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-xs truncate pr-2',
                        conv.unread_count > 0 ? 'text-foreground/80' : 'text-muted-foreground'
                      )}>
                        {conv.last_message || 'Sem mensagens'}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-green-500 hover:bg-green-500 text-white flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
