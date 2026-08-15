import { useState, useEffect } from "react";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Loader2, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useTerminateLease } from "@/hooks/useLeases";
import { useCountFutureProjections } from "@/hooks/useLeaseFinancialProjection";
import { toast } from "sonner";

interface TerminateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: {
    id: string;
    unit_id: string;
    unit?: { unit_number: string } | null;
    tenant_contact?: { name: string } | null;
  } | null;
  onSuccess?: () => void;
}

export function TerminateContractDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
}: TerminateContractDialogProps) {
  const terminateLease = useTerminateLease();
  const queryClient = useQueryClient();
  const { countProjections } = useCountFutureProjections();
  
  const [terminationDate, setTerminationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [terminationReason, setTerminationReason] = useState("");
  const [deleteFutureTransactions, setDeleteFutureTransactions] = useState(true);
  const [futureTransactionsCount, setFutureTransactionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCountingTransactions, setIsCountingTransactions] = useState(false);

  // Count future transactions when dialog opens or date changes
  useEffect(() => {
    if (open && lease) {
      const fetchCount = async () => {
        setIsCountingTransactions(true);
        try {
          const count = await countProjections(lease.id, terminationDate);
          setFutureTransactionsCount(count);
        } catch (error) {
          console.error("Error counting transactions:", error);
        } finally {
          setIsCountingTransactions(false);
        }
      };
      fetchCount();
    }
  }, [open, lease?.id, terminationDate]);

  const resetState = () => {
    // Reset all state
    setTerminationDate(format(new Date(), "yyyy-MM-dd"));
    setTerminationReason("");
    setDeleteFutureTransactions(true);
    setFutureTransactionsCount(0);
    setIsLoading(false);
    setIsCountingTransactions(false);
  };

  const handleTerminate = async () => {
    if (!lease || isLoading) return;

    console.log('=============================================');
    console.log('[TerminateContract] INICIANDO ENCERRAMENTO');
    console.log('LeaseId:', lease.id);
    console.log('TerminationDate:', terminationDate);
    console.log('DeleteFutureTransactions:', deleteFutureTransactions);
    console.log('=============================================');

    // Set loading immediately
    setIsLoading(true);
    
    // CRITICAL: Loading toast for async feedback
    const toastId = toast.loading("Processando encerramento...");

    try {
      const result = await terminateLease.mutateAsync({
        leaseId: lease.id,
        terminationDate,
        terminationReason: terminationReason || undefined,
        deleteFutureTransactions,
      });

      console.log('[TerminateContract] Sucesso:', result);

      await invalidateLeaseQueries(queryClient);

      toast.success("Contrato encerrado com sucesso!", {
        id: toastId,
        description: result.deletedTransactions > 0 
          ? `${result.deletedTransactions} lançamento(s) futuro(s) removido(s).`
          : "O imóvel foi liberado para nova locação.",
      });

      // Reset state and close dialog
      resetState();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("[TerminateContract] Erro no encerramento:", error);
      toast.error("Erro ao encerrar contrato", {
        id: toastId,
        description: error?.message || "Tente novamente.",
      });
      // CRITICAL: Reset loading state on error
      setIsLoading(false);
    }
  };

  if (!lease) return null;

  // CRITICAL FIX: Direct onClick handler - more reliable than form submit in Radix AlertDialog
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=============================================');
    console.log('[TerminateContract] BUTTON CLICK TRIGGERED');
    console.log('isLoading:', isLoading);
    console.log('lease:', lease?.id);
    console.log('=============================================');
    
    if (!isLoading) {
      handleTerminate();
    }
  };

  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Only allow closing if not loading
        if (!isOpen && !isLoading) {
          resetState();
          onOpenChange(false);
        }
      }}
    >
      <AlertDialogContent 
        className="max-w-md"
        // Prevent click events from bubbling to overlay
        onClick={(e) => e.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Encerrar Contrato
          </AlertDialogTitle>
          <AlertDialogDescription>
            {lease.unit?.unit_number} • {lease.tenant_contact?.name}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Warning Card */}
          <Card className="p-3 bg-destructive/10 border-destructive/30">
            <p className="text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              Esta ação encerrará o contrato e liberará o imóvel. O contrato ficará arquivado no histórico.
            </p>
          </Card>

          {/* Termination Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Data de Encerramento
            </Label>
            <Input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>

          {/* Termination Reason */}
          <div className="space-y-2">
            <Label>Motivo do Encerramento (opcional)</Label>
            <Textarea
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Ex: Término de vigência, rescisão antecipada pelo inquilino..."
              rows={2}
            />
          </div>

          {/* Delete Future Transactions Option */}
          <Card className="p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="deleteFuture"
                checked={deleteFutureTransactions}
                onCheckedChange={(checked) => setDeleteFutureTransactions(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="deleteFuture" className="text-sm font-medium cursor-pointer">
                  Excluir lançamentos futuros pendentes
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isCountingTransactions ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Contando...
                    </span>
                  ) : futureTransactionsCount > 0 ? (
                    <span className="text-destructive font-medium">
                      {futureTransactionsCount} parcela(s) será(ão) excluída(s)
                    </span>
                  ) : (
                    "Nenhum lançamento futuro pendente"
                  )}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer with direct onClick */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading}
            onClick={handleButtonClick}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Encerrar Contrato
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}