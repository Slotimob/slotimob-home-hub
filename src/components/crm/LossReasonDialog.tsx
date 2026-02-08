import { useState } from 'react';
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

interface LossReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes: string) => void;
  onCancel: () => void;
  dealName?: string;
}

const LOSS_REASONS = [
  { value: 'price', label: 'Preço acima do orçamento' },
  { value: 'competitor', label: 'Escolheu concorrente' },
  { value: 'timing', label: 'Timing ruim / não está pronto' },
  { value: 'location', label: 'Localização não agradou' },
  { value: 'financing', label: 'Não conseguiu financiamento' },
  { value: 'no_response', label: 'Sem resposta / perdeu contato' },
  { value: 'other', label: 'Outro motivo' },
];

export const LossReasonDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  dealName,
}: LossReasonDialogProps) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    const reasonLabel = LOSS_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
    onConfirm(reasonLabel, notes);
    setSelectedReason('');
    setNotes('');
  };

  const handleCancel = () => {
    setSelectedReason('');
    setNotes('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Motivo da Perda</DialogTitle>
          <DialogDescription>
            {dealName && <span className="font-medium">{dealName}</span>}
            <br />
            Selecione o motivo pelo qual este deal foi perdido. Isso ajuda a melhorar suas estratégias futuras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Por que este deal foi perdido?</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {LOSS_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações adicionais (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione mais detalhes sobre a perda..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedReason}>
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
