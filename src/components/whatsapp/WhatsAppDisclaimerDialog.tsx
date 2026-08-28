import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Shield, MessageSquare, Loader2 } from 'lucide-react';

interface WhatsAppDisclaimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => Promise<void>;
}

export const WhatsAppDisclaimerDialog = ({ open, onOpenChange, onAccept }: WhatsAppDisclaimerDialogProps) => {
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!accepted) return;
    setIsSubmitting(true);
    try {
      await onAccept();
      onOpenChange(false);
    } catch {
      // error handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Aviso de risco — Conexão do WhatsApp</DialogTitle>
          </div>
          <DialogDescription>
            Leia antes de conectar seu número. Este aviso aparece a cada nova conexão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">A conexão usa uma API não oficial do WhatsApp</p>
                <p className="mt-1">
                  A Slotimob conecta seu número por uma integração que não é a API oficial do WhatsApp.
                  Por isso, o WhatsApp pode <strong>bloquear ou banir seu número</strong> se identificar uso fora das regras dele.
                  Esse bloqueio é feito pelo WhatsApp e não pode ser revertido pela Slotimob.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              O que aumenta o risco de bloqueio
            </p>
            <ul className="space-y-1.5 list-disc list-inside ml-1">
              <li><strong>Disparo em massa e spam:</strong> enviar muitas mensagens de uma vez ou para quem não pediu contato.</li>
              <li><strong>Mensagem não solicitada:</strong> falar com quem nunca autorizou receber contato seu.</li>
              <li><strong>Número novo com volume alto:</strong> comece devagar e aumente aos poucos.</li>
              <li><strong>Muitas mensagens em pouco tempo:</strong> respeite intervalos entre os envios.</li>
              <li><strong>Sem opção de sair:</strong> sempre permita que a pessoa peça para não receber mais mensagens.</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="font-medium text-foreground">De quem é o risco</p>
            <p>
              O número conectado é seu e o uso é feito por você. O risco de bloqueio pelo WhatsApp é seu, não da Slotimob.
              A plataforma oferece a integração como ferramenta de trabalho, mas não controla as decisões do WhatsApp sobre o seu número.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="whatsapp-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            disabled={isSubmitting}
          />
          <label htmlFor="whatsapp-terms" className="text-sm leading-tight cursor-pointer select-none">
            Li o aviso, entendi que a API não é oficial e assumo o risco de bloqueio do meu número.
          </label>
        </div>


        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="whatsapp-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            disabled={isSubmitting}
          />
          <label htmlFor="whatsapp-terms" className="text-sm leading-tight cursor-pointer select-none">
            Estou ciente dos riscos e aceito os termos de uso do WhatsApp conforme descrito acima.
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!accepted || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Continuar e Gerar QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
