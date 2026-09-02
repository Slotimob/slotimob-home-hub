import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LeaseProjectionEditor,
  type LeaseForProjection,
  type LeaseProjectionEditorHandle,
} from "./LeaseProjectionEditor";

export type { LeaseForProjection };

interface ConfirmLeaseProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: LeaseForProjection | null;
  /** Sobrescreve o valor do aluguel (ex.: logo após um reajuste). */
  overrideRentAmount?: number;
  /** Sobrescreve o início da janela (ex.: novo ciclo pós-reajuste). */
  overrideStartDate?: string;
  /**
   * Modo pós-reajuste: por padrão lança APENAS os aluguéis reajustados.
   * As obrigações (IPTU/seguro) ficam recolhidas atrás de uma ação secundária.
   */
  postAdjustment?: boolean;
  onConfirmed?: (count: number) => void;
  onSkipped?: () => void;
}

/**
 * Casca de dialog em volta do `LeaseProjectionEditor`.
 *
 * Todo o miolo (blocos, parcelas, seleção e inserção) mora no editor, que
 * também é usado embutido na Calculadora de Reajuste.
 */
export function ConfirmLeaseProjectionDialog({
  open,
  onOpenChange,
  lease,
  overrideRentAmount,
  overrideStartDate,
  postAdjustment = false,
  onConfirmed,
  onSkipped,
}: ConfirmLeaseProjectionDialogProps) {
  const { toast } = useToast();
  const editorRef = useRef<LeaseProjectionEditorHandle>(null);
  const [count, setCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSkip = () => {
    onSkipped?.();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      const created = (await editorRef.current?.submit()) ?? 0;
      onConfirmed?.(created);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao gerar lançamentos",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lease) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0"
        onInteractOutside={(e) => isGenerating && e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Gerar lançamentos do contrato
          </DialogTitle>
          <DialogDescription>
            Confira e ajuste cada parcela: o que aparece aqui é exatamente o que será lançado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <LeaseProjectionEditor
            ref={editorRef}
            lease={lease}
            overrideRentAmount={overrideRentAmount}
            overrideStartDate={overrideStartDate}
            postAdjustment={postAdjustment}
            onSelectionChange={(n) => setCount(n)}
          />
        </div>

        <div className="border-t border-border bg-card px-6 py-3 flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isGenerating}>
            Não lançar agora
          </Button>
          <Button onClick={handleConfirm} disabled={isGenerating || count === 0}>
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar lançamentos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmLeaseProjectionDialog;
