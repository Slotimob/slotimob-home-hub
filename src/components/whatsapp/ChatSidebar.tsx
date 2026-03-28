import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Search, MessageSquarePlus, MessageCircle, RefreshCw, Users, User, Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { NewConversationDialog } from './NewConversationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppTags } from '@/hooks/useWhatsAppTags';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface ChatSidebarProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
  loading?: boolean;
  connectionId?: string | null;
  isConnected?: boolean;
  isOwner?: boolean;
  teamMembers?: { id: string; name: string }[];
  agentFilter?: string;
  onAgentFilterChange?: (value: string) => void;
  showTriageTabs?: boolean;
  deepLinkNewConv?: { phone: string; text: string } | null;
  onDeepLinkConsumed?: () => void;
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

function getDisplayName(conv: any): string {
  return conv.contacts?.name || conv.contact_name || conv.contact_phone;
}

function getInitials(displayName: string): string {
  if (/^\d/.test(displayName)) return '';
  return displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function ChatSidebar({ conversations, selectedId, onSelect, loading, connectionId, isConnected = true, isOwner = false, teamMembers = [], agentFilter = 'all', onAgentFilterChange, showTriageTabs = false, deepLinkNewConv, onDeepLinkConsumed }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvInitialPhone, setNewConvInitialPhone] = useState('');
  const [newConvInitialMessage, setNewConvInitialMessage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [convTagMap, setConvTagMap] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const { tags: allTags } = useWhatsAppTags();

  // Load conversation<->tag mapping
  useEffect(() => {
    if (conversations.length === 0) return;
    const convIds = conversations.map(c => c.id);
    supabase
      .from('whatsapp_conversation_tags')
      .select('conversation_id, tag_id')
      .in('conversation_id', convIds)
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        for (const row of (data as any[] || [])) {
          if (!map[row.conversation_id]) map[row.conversation_id] = [];
          map[row.conversation_id].push(row.tag_id);
        }
        setConvTagMap(map);
      });
  }, [conversations]);

  // Handle deep link new conversation
  useEffect(() => {
    if (deepLinkNewConv) {
      setNewConvInitialPhone(deepLinkNewConv.phone);
      setNewConvInitialMessage(deepLinkNewConv.text);
      setNewConvOpen(true);
      onDeepLinkConsumed?.();
    }
  }, [deepLinkNewConv]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'sync_history' },
      });
      if (error) throw error;
      toast({ title: 'Sincronização concluída', description: data?.message || 'Conversas atualizadas.' });
    } catch (err: any) {
      toast({ title: 'Erro ao sincronizar', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const filtered = useMemo(() => {
    return [...conversations]
      .sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      })
      .filter((conv) => {
        const displayName = conv.contact_name || conv.contact_phone;
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          displayName.toLowerCase().includes(search) ||
          conv.contact_phone.includes(searchTerm) ||
          (conv.last_message || '').toLowerCase().includes(search);

        if (!matchesSearch) return false;

        // Filter by selected tags (AND logic: conversation must have ALL selected tags)
        if (selectedTagIds.length > 0) {
          const convTags = convTagMap[conv.id] || [];
          return selectedTagIds.every(tid => convTags.includes(tid));
        }

        return true;
      });
  }, [conversations, searchTerm, selectedTagIds, convTagMap]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Mensagens</h2>
            {isConnected && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sincronizar conversas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {isConnected && (
            <Button size="sm" variant="default" className="gap-1.5" onClick={() => setNewConvOpen(true)}>
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Conversa</span>
            </Button>
          )}
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

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {allTags.map(tag => {
              const isActive = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    isActive
                      ? 'font-semibold'
                      : 'opacity-70 hover:opacity-100'
                  )}
                  style={{
                    backgroundColor: isActive ? tag.color + '25' : 'transparent',
                    color: tag.color,
                    borderColor: tag.color + '50',
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                className="text-[10px] px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {isOwner && teamMembers.length > 0 && onAgentFilterChange && (
          <Select value={agentFilter} onValueChange={onAgentFilterChange}>
            <SelectTrigger className="h-8 text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por agente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os agentes</SelectItem>
              {teamMembers.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        ) : filtered.length === 0 && conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="font-medium text-foreground">
              {isConnected ? 'Seu WhatsApp está conectado!' : 'Nenhuma conversa ainda'}
            </p>
            <p className="text-sm">
              {isConnected ? 'Aguardando novas mensagens...' : 'Conecte seu WhatsApp para começar.'}
            </p>
            <p className="text-xs opacity-70 max-w-[220px]">
              Sincronizamos as mensagens a partir do momento da conexão. Envie uma nova mensagem para iniciar.
            </p>
            {isConnected && (
              <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => setNewConvOpen(true)}>
                <MessageSquarePlus className="h-4 w-4" />
                Nova Conversa
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
            {selectedTagIds.length > 0 && (
              <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setSelectedTagIds([])}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((conv) => {
              const displayName = getDisplayName(conv);
              const initials = getInitials(displayName);
              const convTags = (convTagMap[conv.id] || [])
                .map(tid => allTags.find(t => t.id === tid))
                .filter(Boolean);

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
                        {initials || <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        'font-bold text-sm truncate',
                        conv.unread_count > 0 && 'font-extrabold text-foreground'
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
                      {(conv as any).last_message_body || conv.last_message || 'Sem mensagens'}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-primary hover:bg-primary text-primary-foreground flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    {convTags.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {convTags.slice(0, 3).map(tag => (
                          <span
                            key={tag!.id}
                            className="text-[9px] px-1 py-0 rounded"
                            style={{
                              backgroundColor: tag!.color + '20',
                              color: tag!.color,
                            }}
                          >
                            {tag!.name}
                          </span>
                        ))}
                        {convTags.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{convTags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={(open) => {
          setNewConvOpen(open);
          if (!open) {
            setNewConvInitialPhone('');
            setNewConvInitialMessage('');
          }
        }}
        connectionId={connectionId || null}
        initialPhone={newConvInitialPhone}
        initialMessage={newConvInitialMessage}
      />
    </div>
  );
}
