import { useState, useRef, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { PermissionGate } from '@/components/subscription/PermissionGate';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIChat() {
  const { user } = useAuth();
  const { isOwner } = usePermissions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      broker_id: user.id,
      role,
      content,
    });
  }, [user?.id]);

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

    let assistantContent = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ messages: contextMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast.error(errData.error || 'Erro ao enviar mensagem');
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.trim() === '') continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            // Claude SSE format
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              assistantContent += parsed.delta.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            // partial JSON, skip
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        saveMessage('assistant', assistantContent);
      }
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
      .eq('broker_id', user.id);

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
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
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
                  'max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                )}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-secondary" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
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
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
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
  );

  // Owners always have access; members need chat.use permission
  const gatedContent = isOwner ? chatContent : (
    <PermissionGate
      permission="chat.use"
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
