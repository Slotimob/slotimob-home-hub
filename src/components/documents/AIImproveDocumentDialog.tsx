import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ENV } from '@/config/env';
import { toast } from 'sonner';

const CHAT_URL = `${ENV.SUPABASE_URL}/functions/v1/ai-chat`;

const SYSTEM_PROMPT = `Você é um redator jurídico especializado em documentos imobiliários no Brasil.
Sua tarefa é REVISAR e MELHORAR a redação do documento enviado, em português do Brasil.

REGRAS OBRIGATÓRIAS:
1. Melhore apenas clareza, correção gramatical, ortografia, pontuação e linguagem adequada a contrato.
2. NÃO invente cláusula nova. NÃO remova cláusula existente.
3. NÃO altere nenhum valor, prazo, data, percentual, nome de pessoa ou endereço.
4. Os marcadores no formato {{campo}} são PLACEHOLDERS dinâmicos: preserve TODOS exatamente como estão, com as mesmas chaves duplas e o mesmo nome interno. Nunca traduza, renomeie, remova nem preencha um placeholder.
5. Mantenha a estrutura, a ordem e a numeração das cláusulas.
6. Responda APENAS com o texto final do documento, sem comentários, sem markdown e sem explicações.`;

interface AIImproveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onApply: (improved: string) => void;
}

/** Extrai os placeholders {{campo}} de um texto. */
const extractPlaceholders = (text: string): string[] =>
  (text.match(/\{\{[^}]+\}\}/g) || []).sort();

export const AIImproveDocumentDialog = ({
  open,
  onOpenChange,
  content,
  onApply,
}: AIImproveDocumentDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      setSuggestion('');
      setLoading(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      setLoading(true);
      setSuggestion('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'user', content: `${SYSTEM_PROMPT}\n\n--- DOCUMENTO ---\n${content}` },
            ],
            selected_assets: [],
            attached_file: null,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
          const isCredit = resp.status === 402 || /cr[ée]dito/i.test(errData.error || '');
          if (isCredit) {
            toast.error(errData.error || 'Créditos de IA esgotados', {
              description: 'Adquira mais créditos para continuar usando a IA.',
              action: { label: 'Ver planos', onClick: () => navigate('/plans') },
            });
          } else {
            toast.error(errData.error || 'Erro ao consultar a IA');
          }
          setLoading(false);
          onOpenChange(false);
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          setLoading(false);
          return;
        }
        const decoder = new TextDecoder();
        let soFar = '';
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
                soFar += parsed.text;
                setSuggestion(soFar);
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        console.error('AI improve error:', err);
        toast.error('Erro de conexão com a IA. Tente novamente.');
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [open, content, navigate, onOpenChange]);

  const originalPlaceholders = extractPlaceholders(content);
  const suggestionPlaceholders = extractPlaceholders(suggestion);
  const missingPlaceholders = originalPlaceholders.filter(
    (p) => !suggestionPlaceholders.includes(p)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Sugestão da IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Compare o texto original com a sugestão. Nada é alterado até você aplicar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          <div className="border-r flex flex-col min-h-0">
            <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium shrink-0">
              Original
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                {content}
              </pre>
            </div>
          </div>
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium flex items-center gap-2 shrink-0">
              Sugestão
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
                {suggestion || (loading ? 'Gerando...' : '')}
              </pre>
            </div>
          </div>
        </div>

        {missingPlaceholders.length > 0 && !loading && (
          <div className="px-4 sm:px-6 py-2 border-t bg-destructive/10 text-xs flex items-start gap-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-destructive font-medium">
                A IA removeu {missingPlaceholders.length} marcador(es):
              </span>
              {missingPlaceholders.slice(0, 6).map((p) => (
                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-t flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Descartar
          </Button>
          <Button
            disabled={loading || !suggestion.trim()}
            onClick={() => {
              onApply(suggestion.trim());
              onOpenChange(false);
              toast.success('Sugestão aplicada ao documento');
            }}
          >
            <Check className="mr-2 h-4 w-4" />
            Usar sugestão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
