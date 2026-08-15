import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, Check } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { useUpdateLease } from "@/hooks/useLeases";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EditAdjustmentDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: {
    id: string;
    unit_id: string;
    next_adjustment_date: string | null;
    unit?: { unit_number: string } | null;
    tenant_contact?: { name: string } | null;
  } | null;
  onSuccess?: () => void;
}

const resetDialogState = (
  setAdjustmentDate: (v: string) => void,
  setError: (v: string | null) => void,
  setIsSubmitting: (v: boolean) => void
) => {
  setAdjustmentDate(format(new Date(), "yyyy-MM-dd"));
  setError(null);
  setIsSubmitting(false);
};

export function EditAdjustmentDateDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
}: EditAdjustmentDateDialogProps) {
  const updateLease = useUpdateLease();
  const queryClient = useQueryClient();

  const [adjustmentDate, setAdjustmentDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with current date when dialog opens
  useEffect(() => {
    if (open && lease) {
      const initialDate = lease.next_adjustment_date 
        ? format(parseISO(lease.next_adjustment_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
      setAdjustmentDate(initialDate);
      setError(null);
    }
  }, [open, lease?.next_adjustment_date]);

  const validateDate = useCallback((dateStr: string): boolean => {
    if (!dateStr) {
      setError("Por favor, selecione uma data.");
      return false;
    }

    const selectedDate = parseISO(dateStr);
    const today = startOfDay(new Date());

    if (isBefore(selectedDate, today)) {
      setError("A data não pode ser no passado.");
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleClose = useCallback(() => {
    resetDialogState(setAdjustmentDate, setError, setIsSubmitting);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!lease || !validateDate(adjustmentDate)) return;
    
    setIsSubmitting(true);
    try {
      await updateLease.mutateAsync({
        id: lease.id,
        data: { next_adjustment_date: adjustmentDate },
      });

      // Refetch antes do toast para a tela já refletir a mudança
      await invalidateLeaseQueries(queryClient);

      toast.success("Data de reajuste atualizada!", {
        description: `Próximo reajuste: ${format(parseISO(adjustmentDate), "dd/MM/yyyy")}`,
      });

      onSuccess?.();
      handleClose();
    } catch (err: any) {
      toast.error("Erro ao atualizar data", {
        description: err.message || "Tente novamente.",
      });
    } finally {
      // CRITICAL: Always reset loading state to prevent UI freeze
      setIsSubmitting(false);
    }
  };

  if (!lease) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !isSubmitting) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Editar Data de Reajuste
          </DialogTitle>
          <DialogDescription>
            {lease.unit?.unit_number} • {lease.tenant_contact?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Próximo Reajuste</Label>
            <Input
              type="date"
              value={adjustmentDate}
              onChange={(e) => {
                setAdjustmentDate(e.target.value);
                if (error) validateDate(e.target.value);
              }}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Esta data será usada para calcular quando o próximo reajuste de aluguel deve ser aplicado.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !!error}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}