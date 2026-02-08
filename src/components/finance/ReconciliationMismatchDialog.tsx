import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ReconciliationMismatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryValue: number;
  transactionValue: number;
  onConfirm: () => void;
}

export function ReconciliationMismatchDialog({
  open,
  onOpenChange,
  entryValue,
  transactionValue,
  onConfirm,
}: ReconciliationMismatchDialogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const difference = Math.abs(entryValue - transactionValue);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle>Divergência Detectada</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>
                Os valores selecionados não coincidem. Você está vinculando:
              </p>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Extrato Bancário</p>
                  <p className="text-lg font-bold">{formatCurrency(entryValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lançamento Sistema</p>
                  <p className="text-lg font-bold">{formatCurrency(transactionValue)}</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-sm text-destructive font-medium">
                  Diferença: {formatCurrency(difference)}
                </span>
              </div>
              <p className="text-sm">
                Deseja confirmar este vínculo mesmo assim?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar Vínculo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
