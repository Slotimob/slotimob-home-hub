import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Search, MessageSquarePlus, MessageCircle, RefreshCw, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
import { NewConversationDialog } from './NewConversationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  // If displayName looks like a phone number (starts with digits), return empty for icon fallback
  if (/^\d/.test(displayName)) return '';
  return displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function ChatSidebar({ conversations, selectedId, onSelect, loading, connectionId, isConnected = true, isOwner = false, teamMembers = [], agentFilter = 'all', onAgentFilterChange, showTriageTabs = false }: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

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

  const filtered = [...conversations]
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
      if (activeTab === 'unread') return conv.unread_count > 0;
      if (activeTab === 'waiting') return conv.status === 'waiting';

      // Triage status filter (manager view)
      if (showTriageTabs && statusFilter !== 'all') {
        if (statusFilter === 'pending') return conv.status === 'pending' || !conv.assigned_user_id;
        if (statusFilter === 'active') return conv.status === 'active' || (conv.assigned_user_id && conv.status !== 'closed');
        if (statusFilter === 'closed') return conv.status === 'closed';
      }

      return true;
    });

  const unreadTotal = conversations.filter(c => c.unread_count > 0).length;
  const pendingCount = showTriageTabs ? conversations.filter(c => c.status === 'pending' || !c.assigned_user_id).length : 0;

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

        {/* Triage status tabs for managers */}
        {showTriageTabs && (
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'pending', label: 'Triagem', count: pendingCount },
              { value: 'active', label: 'Atendimento' },
              { value: 'closed', label: 'Fechados' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-2 py-1 text-[11px] rounded-md transition-colors font-medium',
                  statusFilter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
                {tab.count && tab.count > 0 ? (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] px-1 rounded-full">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
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
          </div>
        ) : (
          <div>
            {filtered.map((conv) => {
              const displayName = getDisplayName(conv);
              const initials = getInitials(displayName);
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
                      {(conv as any).last_message_body || conv.last_message || 'Sem mensagens'}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-primary hover:bg-primary text-primary-foreground flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    {((conv as any).tags as string[] | undefined)?.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {((conv as any).tags as string[]).slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
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
        onOpenChange={setNewConvOpen}
        connectionId={connectionId || null}
      />
    </div>
  );
}
