import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useBulkActionGate, type BulkGateInput } from "@/hooks/useBulkActionGate";
import { RequestApprovalDialog } from "@/components/approvals/RequestApprovalDialog";
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
import { TransactionsBulkEditDialog } from "./TransactionsBulkEditDialog";

interface TransactionsBulkActionsBarProps {
  selectedTransactions: any[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function TransactionsBulkActionsBar({
  selectedTransactions,
  onClearSelection,
  onSuccess,
}: TransactionsBulkActionsBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const gate = useBulkActionGate();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pendingGateInput, setPendingGateInput] = useState<BulkGateInput | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState(0);

  const selectedCount = selectedTransactions.length;
  const hasRecurring = selectedTransactions.some((t) => t.group_id);

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const ids = selectedTransactions.map((t) => t.id);

      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Lançamentos excluídos!",
        description: `${selectedCount} lançamento${selectedCount > 1 ? "s foram excluídos" : " foi excluído"} com sucesso.`,
      });

      onClearSelection();
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onClearSelection();
    onSuccess();
  };

  return (
    <>
      {/* Floating bulk actions bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
        <div className="bg-card border rounded-lg shadow-xl p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="secondary" className="text-sm px-2 sm:px-3 py-1 shrink-0">
              {selectedCount}
            </Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline truncate">
              selecionado{selectedCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditDialog(true)}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir {selectedCount} lançamento{selectedCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta ação não pode ser desfeita. Os lançamentos selecionados serão removidos permanentemente.</p>
              {hasRecurring && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md mt-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm">
                    Alguns lançamentos fazem parte de séries recorrentes. Apenas as instâncias selecionadas serão excluídas.
                  </span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir Todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Dialog */}
      <TransactionsBulkEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selectedTransactions={selectedTransactions}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
