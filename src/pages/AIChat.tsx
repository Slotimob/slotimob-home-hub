import { useState, useRef, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { PermissionGate } from '@/components/subscription/PermissionGate';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAICredits } from '@/hooks/useAICredits';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Trash2, Loader2, Sparkles, Zap, Paperclip, X, FileUp, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { AssetSelectorDialog, SelectedAsset } from '@/components/chat/AssetSelectorDialog';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/hooks/useWorkspace';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { isOwner } = usePermissions();
  const { credits, isLoading: isLoadingCredits, refetch: refetchCredits } = useAICredits();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; base64: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history
  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('broker_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })));
      }
      setIsLoadingHistory(false);
    };
    load();
  }, [user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!user?.id) return;
    await supabase.from('chat_messages').insert({
      broker_id: effectiveBrokerId || user.id,
      role,
      content,
    });
  }, [user?.id, effectiveBrokerId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Save user message
    saveMessage('user', trimmed);

    // Build messages for API (last 20 for context)
    const contextMessages = [...messages.slice(-19), userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          messages: contextMessages,
          selected_assets: selectedAssets.map(a => ({ id: a.id, type: a.type })),
          attached_file: attachedFile ? { name: attachedFile.name, type: attachedFile.type, data: attachedFile.base64 } : null,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(errData.error || 'Erro ao enviar mensagem');
        setIsLoading(false);
        return;
      }

      // Stream SSE response
      const reader = resp.body?.getReader();
      if (!reader) { setIsLoading(false); return; }

      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              assistantSoFar += parsed.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && !last.id) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* skip */ }
        }
      }

      if (assistantSoFar) {
        saveMessage('assistant', assistantSoFar);
      }

      refetchCredits();
      setAttachedFile(null);
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('broker_id', effectiveBrokerId || user.id);

    if (!error) {
      setMessages([]);
      toast.success('Histórico limpo');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderCreditsBadge = () => {
    if (isLoadingCredits) {
      return <Skeleton className="h-6 w-20 rounded-full" />;
    }

    if (!credits) return null;

    const used = credits.used;
    const total = credits.limit;
    const pct = total > 0 ? Math.round((used / total) * 100) : 100;
    const remaining = credits.remaining + credits.bonus_credits;
    const badgeColor = pct > 90 ? 'border-red-500/50 text-red-500 bg-red-500/5' : pct >= 70 ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5';

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80', badgeColor)}>
            <Zap className="h-3 w-3" />
            {remaining} / {total + credits.bonus_credits}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm" side="bottom" align="end">
          <div className="space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              Cada interação consome créditos com base no tamanho da pergunta e da resposta. Você ganha {total} créditos todo mês.
              {credits.bonus_credits > 0 && (
                <span className="block mt-1 font-medium text-foreground">
                  + {credits.bonus_credits} créditos bônus comprados
                </span>
              )}
            </p>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => navigate('/settings')}
            >
              <Zap className="h-3.5 w-3.5" />
              Fazer Recarga de Créditos
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // For members: wrap in PermissionGate; for owners: just show
  const chatContent = (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Chat IA</h1>
            <p className="text-xs text-muted-foreground">Assistente imobiliário inteligente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderCreditsBadge()}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Olá! Sou seu assistente IA</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Posso ajudar com dúvidas sobre imóveis, cálculos financeiros, redação de anúncios e estratégias de vendas.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {[
                'Como calcular a rentabilidade de um aluguel?',
                'Escreva um anúncio para um apartamento',
                'Quais documentos preciso para uma locação?',
                'Dicas de negociação com clientes',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                  className="text-left text-xs p-3 rounded-lg border bg-card hover:bg-muted/50 text-muted-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap'
                    : 'bg-muted text-foreground rounded-bl-md prose prose-sm dark:prose-invert max-w-none'
                )}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-semibold mt-2.5 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
                      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes('language-');
                        return isBlock
                          ? <code className="block bg-black/10 dark:bg-white/10 rounded p-2 my-1.5 text-xs overflow-x-auto whitespace-pre">{children}</code>
                          : <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-xs">{children}</code>;
                      },
                      table: ({ children }) => <div className="overflow-x-auto my-1.5"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                      th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted font-medium text-left">{children}</th>,
                      td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-secondary" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {(selectedAssets.length > 0 || attachedFile) && (
            <div className="flex flex-wrap gap-1.5">
              {selectedAssets.map(asset => (
                <Badge
                  key={`${asset.type}-${asset.id}`}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  <span className="max-w-[120px] truncate">{asset.label}</span>
                  <button
                    onClick={() => setSelectedAssets(prev => prev.filter(a => !(a.id === asset.id && a.type === asset.type)))}
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {attachedFile && (
                <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                  <FileUp className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{attachedFile.name}</span>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                  title="Anexar ao contexto"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onClick={() => setAssetDialogOpen(true)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Imóvel cadastrado
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Arquivo local (imagem ou PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Arquivo muito grande. Limite: 5MB.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const result = ev.target?.result as string;
                  setAttachedFile({ name: file.name, type: file.type, base64: result.split(',')[1] });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AssetSelectorDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        selected={selectedAssets}
        onConfirm={setSelectedAssets}
      />
    </div>
  );

  // Owners always have access; members need chat.view permission
  const gatedContent = isOwner ? chatContent : (
    <PermissionGate
      permission="chat.view"
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center p-6">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acesso não autorizado</h2>
            <p className="text-muted-foreground">Solicite ao administrador a permissão para usar o Chat IA.</p>
          </div>
        </div>
      }
    >
      {chatContent}
    </PermissionGate>
  );

  return (
    <AppLayout>
      <FeatureGate feature="ai_chat" requiredPlan="pro">
        {gatedContent}
      </FeatureGate>
    </AppLayout>
  );
}
