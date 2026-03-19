import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Lock, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAICredits } from '@/hooks/useAICredits';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WhatsAppMessage = Database['public']['Tables']['whatsapp_messages']['Row'];

interface AISuggestButtonProps {
  messages: WhatsAppMessage[];
  contactName: string;
  onSuggestion: (text: string) => void;
  onOpenBuyCredits?: () => void;
}

export function AISuggestButton({ messages, contactName, onSuggestion, onOpenBuyCredits }: AISuggestButtonProps) {
  const { credits, refetch } = useAICredits();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const hasCredits = credits && credits.total_available > 0;

  const handleClick = async () => {
    if (!hasCredits) {
      if (onOpenBuyCredits) {
        onOpenBuyCredits();
      } else {
        toast({
          title: 'Sem créditos de IA',
          description: 'Adquira créditos para usar a sugestão inteligente.',
          variant: 'destructive',
        });
      }
      return;
    }

    setLoading(true);
    try {
      const recentMessages = messages.slice(-10).map(m => ({
        direction: m.direction,
        content: m.content,
        message_type: m.message_type,
      }));

      const { data, error } = await supabase.functions.invoke('chat-ai-suggest', {
        body: { messages: recentMessages, contactName },
      });

      if (error) throw error;

      if (data?.error === 'NO_CREDITS') {
        if (onOpenBuyCredits) onOpenBuyCredits();
        else toast({ title: 'Sem créditos de IA', variant: 'destructive' });
        return;
      }

      if (data?.suggestion) {
        onSuggestion(data.suggestion);
        refetch();
        toast({ title: 'Sugestão gerada!', description: 'Revise e envie a mensagem.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao gerar sugestão', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasCredits ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <div className="relative">
                <Sparkles className="h-5 w-5 opacity-50" />
                <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasCredits
            ? `Sugerir com IA (${credits?.total_available} créditos)`
            : 'Adquira créditos para usar a IA'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
