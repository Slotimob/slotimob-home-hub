import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, FileSpreadsheet, Calendar, Package, Trash2, Loader2 } from "lucide-react";

interface StatementImportHistoryDialogProps {
  bankAccountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRecord {
  id: string;
  file_name: string;
  file_type: string;
  entries_count: number;
  imported_at: string;
}

export function StatementImportHistoryDialog({
  bankAccountId,
  open,
  onOpenChange,
}: StatementImportHistoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; importId: string; fileName: string }>({
    open: false,
    importId: "",
    fileName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["statement-imports", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_imports")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return data as ImportRecord[];
    },
    enabled: open && !!bankAccountId,
  });

  // Stable function to close dialog and reset all states
  const resetDialogState = () => {
    setIsDeleting(false);
    setDeleteConfirm({ open: false, importId: "", fileName: "" });
  };

  const handleDelete = async () => {
    const { importId } = deleteConfirm;
    
    if (!importId) {
      resetDialogState();
      return;
    }

    setIsDeleting(true);

    try {
      // First, unreconcile any transactions linked to entries from this import
      const { data: entries } = await supabase
        .from("bank_statement_entries")
        .select("transaction_id")
        .eq("import_id", importId)
        .not("transaction_id", "is", null);

      if (entries && entries.length > 0) {
        const transactionIds = entries.map((e) => e.transaction_id).filter(Boolean);
        if (transactionIds.length > 0) {
          await supabase
            .from("financial_transactions")
            .update({ is_reconciled: false, reconciled_at: null })
            .in("id", transactionIds as string[]);
        }
      }

      // Delete entries first to avoid FK issues
      await supabase
        .from("bank_statement_entries")
        .delete()
        .eq("import_id", importId);

      // Delete the import record
      const { error } = await supabase
        .from("bank_statement_imports")
        .delete()
        .eq("id", importId);

      if (error) throw error;

      // Success: Show toast first, then reset state, then invalidate
      toast({ title: "Importação excluída com sucesso!" });
      
    } catch (error: any) {
      toast({
        title: "Erro ao excluir importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      // CRITICAL: Always reset state in finally block to prevent UI freeze
      resetDialogState();
      
      // Invalidate queries AFTER state is reset (no await to prevent blocking)
      queryClient.invalidateQueries({ queryKey: ["statement-imports"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-totals"] });
      queryClient.invalidateQueries({ queryKey: ["reconciled-entries"] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] });
    }
  };

  // Safe handler for dialog open change
  const handleAlertDialogOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      resetDialogState();
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    const types: Record<string, string> = {
      csv: "CSV",
      xlsx: "Excel",
      xls: "Excel",
      ofx: "OFX",
    };
    return types[fileType.toLowerCase()] || fileType.toUpperCase();
  };

  const getFileTypeColor = (fileType: string): "default" | "secondary" | "outline" => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      csv: "default",
      xlsx: "secondary",
      xls: "secondary",
      ofx: "outline",
    };
    return colors[fileType.toLowerCase()] || "outline";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Importações
            </DialogTitle>
            <DialogDescription>
              Visualize e gerencie os extratos bancários importados
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma importação realizada</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    O histórico aparecerá aqui após você importar extratos
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-sm truncate">{record.file_name}</h4>
                              <Badge variant={getFileTypeColor(record.file_type)} className="text-xs">
                                {getFileTypeLabel(record.file_type)}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5" />
                                <span>
                                  {record.entries_count} entrada{record.entries_count !== 1 ? "s" : ""}{" "}
                                  importada{record.entries_count !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {format(new Date(record.imported_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              importId: record.id,
                              fileName: record.file_name,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="pt-4 border-t text-sm text-muted-foreground">
              Total: {history.reduce((acc, record) => acc + record.entries_count, 0)} entradas em{" "}
              {history.length} importaç{history.length === 1 ? "ão" : "ões"}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={handleAlertDialogOpenChange}>
        <AlertDialogContent onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Você está prestes a excluir a importação <strong>"{deleteConfirm.fileName}"</strong>.
                </p>
                <p className="text-destructive font-medium">
                  Esta ação irá remover todas as entradas do extrato associadas e desconciliar quaisquer
                  transações vinculadas a elas.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => !isDeleting && resetDialogState()}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Importação"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
