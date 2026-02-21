import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquarePlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MockConversation } from './mockData';

interface ChatSidebarProps {
  conversations: MockConversation[];
  selectedId: string | null;
  onSelect: (conversation: MockConversation) => void;
  onBack?: () => void;
}

function formatTimestamp(dateStr: string): string {
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

export function ChatSidebar({ conversations, selectedId, onSelect }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filtered = conversations.filter((conv) => {
    const matchesSearch =
      conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone.includes(searchTerm);

    if (!matchesSearch) return false;
    if (activeTab === 'unread') return conv.unreadCount > 0;
    if (activeTab === 'waiting') return conv.status === 'waiting';
    return true;
  });

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
              {conversations.filter(c => c.unreadCount > 0).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px] rounded-full">
                  {conversations.filter(c => c.unreadCount > 0).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs">Aguardando</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div>
            {filtered.map((conv) => (
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
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {conv.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-card rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      'font-medium text-sm truncate',
                      conv.unreadCount > 0 && 'font-semibold text-foreground'
                    )}>
                      {conv.contactName}
                    </span>
                    <span className={cn(
                      'text-[11px] flex-shrink-0 ml-2',
                      conv.unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                    )}>
                      {formatTimestamp(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs truncate pr-2',
                      conv.unreadCount > 0 ? 'text-foreground/80' : 'text-muted-foreground'
                    )}>
                      {conv.lastMessage}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-green-500 hover:bg-green-500 text-white flex-shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
