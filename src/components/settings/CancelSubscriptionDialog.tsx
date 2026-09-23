import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCancelSubscription } from '@/hooks/useCancelSubscription';
import { toast } from 'sonner';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string;
  accessUntil: string | null;
  isPendingPayment: boolean;
  onCanceled?: () => void;
}

const REASONS: { value: string; label: string }[] = [
  { value: 'caro', label: 'Está caro para mim' },
  { value: 'pouco_uso', label: 'Não estou usando o suficiente' },
  { value: 'falta_funcionalidade', label: 'Falta uma funcionalidade' },
  { value: 'outra_ferramenta', label: 'Vou usar outra ferramenta' },
  { value: 'problema_tecnico', label: 'Tive problemas técnicos' },
  { value: 'outro', label: 'Outro motivo' },
];

const MAX_FEEDBACK_LENGTH = 500;

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  planLabel,
  accessUntil,
  isPendingPayment,
  onCanceled,
}: CancelSubscriptionDialogProps) {
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const cancelSubscription = useCancelSubscription();

  const keepsAccessUntil = !!accessUntil && !isPendingPayment;
  const accessDate = accessUntil ? new Date(accessUntil) : null;
  const accessDateLabel =
    accessDate && !isNaN(accessDate.getTime())
      ? format(accessDate, "dd/MM/yyyy", { locale: ptBR })
      : null;

  // Reabrir sempre volta ao passo 1 com o formulário limpo
  useEffect(() => {
    if (open) {
      setStep('confirm');
      setReason('');
      setFeedback('');
    }
  }, [open]);

  const accessSentence = keepsAccessUntil
    ? `Você continua com o ${planLabel} até ${accessDateLabel ?? 'o fim do período pago'}. Depois disso sua conta passa para o plano Start, gratuito.`
    : 'O cancelamento é imediato e sua conta volta para o plano Start, gratuito.';

  const handleConfirm = async () => {
    try {
      await cancelSubscription.mutateAsync({
        reason: reason || undefined,
        feedback: feedback || undefined,
      });
      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cancelar. Tente novamente.');
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && step === 'success') {
      onCanceled?.();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>Cancelar assinatura {planLabel}</DialogTitle>
              <DialogDescription>Confirme as condições do cancelamento antes de prosseguir.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto">
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Nenhuma nova cobrança será feita. Cobranças em aberto desta assinatura serão removidas.</li>
                <li>{accessSentence}</li>
                <li>Seus dados não são apagados.</li>
              </ul>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
                  {REASONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem value={option.value} id={`reason-${option.value}`} />
                      <Label htmlFor={`reason-${option.value}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-feedback">Quer contar mais? (opcional)</Label>
                <Textarea
                  id="cancel-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                  maxLength={MAX_FEEDBACK_LENGTH}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {feedback.length}/{MAX_FEEDBACK_LENGTH}
                </p>
              </div>

              <a
                href="/planos"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Prefere um plano menor? Ver planos
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancelSubscription.isPending}>
                Manter assinatura
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar cancelamento'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Assinatura cancelada</DialogTitle>
              <DialogDescription className="text-center">
                {cancelSubscription.data?.protocol ? (
                  <>Protocolo: {cancelSubscription.data.protocol}</>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                {cancelSubscription.data?.immediate
                  ? 'O cancelamento é imediato e sua conta volta para o plano Start, gratuito.'
                  : `Você continua com o ${planLabel} até ${accessDateLabel ?? 'o fim do período pago'}. Depois disso sua conta passa para o plano Start, gratuito.`}
              </p>
              <p>Enviamos o comprovante para o seu e-mail.</p>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  onCanceled?.();
                  onOpenChange(false);
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
