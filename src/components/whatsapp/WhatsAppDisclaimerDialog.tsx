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
            <DialogTitle>Termos de Uso — WhatsApp</DialogTitle>
          </div>
          <DialogDescription>
            Leia atentamente antes de conectar seu número.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Risco de Banimento pela Meta</p>
                <p className="mt-1">
                  A Meta (proprietária do WhatsApp) pode banir permanentemente números que violem suas políticas de uso. 
                  Essa ação é irreversível e está fora do controle da nossa plataforma.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Boas Práticas Obrigatórias
            </p>
            <ul className="space-y-1.5 list-disc list-inside ml-1">
              <li><strong>Não envie SPAM:</strong> mensagens em massa para contatos que não autorizaram o recebimento são proibidas.</li>
              <li><strong>Aqueça o chip:</strong> números novos devem iniciar com volume baixo de mensagens e aumentar gradualmente.</li>
              <li><strong>Respeite a frequência:</strong> evite enviar muitas mensagens em intervalos curtos.</li>
              <li><strong>Conteúdo relevante:</strong> envie apenas mensagens pertinentes ao contexto imobiliário e ao relacionamento com o cliente.</li>
              <li><strong>Permita opt-out:</strong> sempre ofereça uma forma do contato parar de receber mensagens.</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="font-medium text-foreground">Isenção de Responsabilidade</p>
            <p>
              A plataforma Sloti disponibiliza a integração com o WhatsApp como ferramenta de produtividade. 
              <strong> Não nos responsabilizamos por banimentos, suspensões ou qualquer penalidade aplicada pela Meta</strong> em 
              decorrência do uso inadequado do serviço pelo usuário. O uso do recurso implica total ciência e aceitação destes termos.
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
