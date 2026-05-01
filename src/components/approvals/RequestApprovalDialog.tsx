import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert } from 'lucide-react';
import { useBulkActionGate, type BulkGateInput } from '@/hooks/useBulkActionGate';
import { ACTION_TYPE_LABELS } from '@/utils/approvalConstants';
import { toast } from 'sonner';

interface RequestApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  gateInput: BulkGateInput;
  thresholdValue: number;
  onSubmitted?: (id: string) => void;
}

export function RequestApprovalDialog({
  open,
  onClose,
  gateInput,
  thresholdValue,
  onSubmitted,
}: RequestApprovalDialogProps) {
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestApproval } = useBulkActionGate();

  const actionLabel = ACTION_TYPE_LABELS[gateInput.actionType] || gateInput.actionType;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const id = await requestApproval(gateInput, justification);
      toast.success('Solicitação enviada. Você receberá uma notificação após a decisão.', {
        duration: 1000,
      });
      onSubmitted?.(id);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar solicitação', { duration: 1000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Esta ação requer aprovação
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Você está tentando executar <strong>{actionLabel}</strong> com{' '}
                <strong>{gateInput.itemCount} itens</strong>. O limite sem aprovação é{' '}
                <strong>{thresholdValue}</strong>.
              </p>
              <p>Envie sua solicitação para o administrador do workspace.</p>
              <Textarea
                placeholder="Justificativa (opcional)"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
