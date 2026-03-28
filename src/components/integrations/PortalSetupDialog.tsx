import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, ExternalLink, Globe, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PortalSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedUrl: string;
  publishedCount: number;
}

export function PortalSetupDialog({ open, onOpenChange, feedUrl, publishedCount }: PortalSetupDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    if (!feedUrl) return;
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast({ title: 'URL copiada para a área de transferência!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Configurar Integração com Portais
          </DialogTitle>
          <DialogDescription>
            Siga os passos abaixo para conectar seu feed XML aos portais imobiliários.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Rss className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Status do Feed</p>
              <p className="text-xs text-muted-foreground">
                {publishedCount > 0
                  ? `${publishedCount} ${publishedCount === 1 ? 'imóvel pronto' : 'imóveis prontos'} para publicação`
                  : 'Nenhum imóvel marcado para publicação'}
              </p>
            </div>
            <Badge className={publishedCount > 0
              ? 'bg-green-500/10 text-green-600 border-green-500/20'
              : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
            }>
              {publishedCount > 0 ? 'Ativo' : 'Sem imóveis'}
            </Badge>
          </div>

          {/* Feed URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL do Feed XML</label>
            <div className="flex gap-2">
              <Input
                value={feedUrl || 'Carregando...'}
                readOnly
                className="font-mono text-xs bg-muted"
              />
              <Button variant="outline" size="icon" onClick={handleCopy} disabled={!feedUrl} className="shrink-0">
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Step-by-step guide */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              Passo a Passo
            </h4>
            <div className="space-y-3">
              {[
                {
                  step: 1,
                  title: 'Copie a URL do Feed',
                  desc: 'Clique no botão de copiar acima para copiar a URL do seu feed XML.'
                },
                {
                  step: 2,
                  title: 'Acesse o Portal do Anunciante',
                  desc: 'Entre no painel do portal desejado (Zap, VivaReal, OLX, etc.) e vá em Configurações > Carga de Dados / Integração.'
                },
                {
                  step: 3,
                  title: 'Selecione o modelo XML',
                  desc: 'Escolha o modelo "Zap/VivaReal" ou "Padrão XML" no portal.'
                },
                {
                  step: 4,
                  title: 'Cole a URL fornecida',
                  desc: 'Insira a URL do SlotiMob no campo indicado. A atualização ocorre em ciclos de 6h a 24h dependendo do portal.'
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {step}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>Dica:</strong> Para que um imóvel apareça no feed, marque-o como "Publicar no Portal" na edição da unidade. Somente imóveis marcados serão enviados aos portais.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
