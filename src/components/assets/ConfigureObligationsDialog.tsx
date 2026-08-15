import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ObligationsConfigForm } from "./ObligationsConfigForm";

interface ConfigureObligationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  unitName: string;
  onSaved?: () => void;
}

export function ConfigureObligationsDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
  onSaved,
}: ConfigureObligationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Matriz de Responsabilidades</DialogTitle>
          <DialogDescription>
            Configure quem é responsável por cada despesa do imóvel{" "}
            <span className="font-medium">{unitName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ObligationsConfigForm
            unitId={unitId}
            unitName={unitName}
            onSaved={() => {
              onSaved?.();
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
