import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Check, TrendingUp, TrendingDown, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateTransactionDialog } from "./CreateTransactionDialog";
import { useProgressiveBalance } from "@/hooks/useProgressiveBalance";
import { cn } from "@/lib/utils";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionsTableProps {
  transactions: any[];
  isLoading: boolean;
  onTransactionUpdated: () => void;
}

export function TransactionsTable({ transactions, isLoading, onTransactionUpdated }: TransactionsTableProps) {
  const { toast } = useToast();
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const { reconcileTransaction, isReconciling } = useProgressiveBalance();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (transaction: any) => {
    // Priority: is_reconciled first (Blue)
    if (transaction.is_reconciled) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Conciliado
        </Badge>
      );
    }

    // Status-based badges with semantic colors
    const variants: Record<string, { label: string; className: string }> = {
      paid: { 
        label: transaction.type === "income" ? "Recebido" : "Pago", 
        className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-800" 
      },
      pending: { 
        label: "Pendente", 
        className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800" 
      },
      overdue: { 
        label: "Vencido", 
        className: "bg-amber-200 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-600/20 dark:text-amber-300 dark:border-amber-700" 
      },
      cancelled: { 
        label: "Cancelado", 
        className: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-800" 
      },
    };
    const config = variants[transaction.status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleQuickReconcile = async (transaction: any) => {
    setReconcilingId(transaction.id);
    try {
      reconcileTransaction({
        transactionId: transaction.id,
        reconcile: !transaction.is_reconciled,
      });
      // Wait a bit then refresh
      setTimeout(() => {
        onTransactionUpdated();
        setReconcilingId(null);
      }, 300);
    } catch (error) {
      setReconcilingId(null);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .update({ 
          status: "paid", 
          paid_date: new Date().toISOString().split("T")[0] 
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Lançamento marcado como pago!" });
      onTransactionUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast({ title: "Lançamento excluído!" });
      onTransactionUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(8)].map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Nenhum lançamento encontrado</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">✓</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Clique para conciliar rapidamente</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="w-[50px]">Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const isCurrentlyReconciling = reconcilingId === transaction.id;
              
              return (
                <TableRow 
                  key={transaction.id}
                  className={cn(
                    transaction.is_reconciled && "bg-blue-500/5"
                  )}
                >
                  {/* Quick Reconcile Toggle */}
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-full transition-all",
                            transaction.is_reconciled 
                              ? "bg-blue-500 text-white hover:bg-blue-600" 
                              : "hover:bg-muted border border-dashed border-muted-foreground/30"
                          )}
                          onClick={() => handleQuickReconcile(transaction)}
                          disabled={isCurrentlyReconciling || isReconciling}
                        >
                          {isCurrentlyReconciling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : transaction.is_reconciled ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {transaction.is_reconciled 
                            ? "Remover conciliação" 
                            : "Marcar como conciliado"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {transaction.is_reconciled 
                            ? "O valor sairá do saldo em conta" 
                            : "O valor entrará no saldo em conta"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <div
                      className={cn(
                        "p-1.5 rounded-full w-fit",
                        transaction.type === "income"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>
                    {transaction.category ? (
                      <span className="text-xs text-muted-foreground">
                        {transaction.category.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-semibold",
                        transaction.type === "income" ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount))}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!transaction.is_reconciled && (
                          <>
                            <DropdownMenuItem onClick={() => handleQuickReconcile(transaction)}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-blue-500" />
                              Conciliar
                            </DropdownMenuItem>
                            {transaction.status === "pending" && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(transaction.id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Marcar como Pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {transaction.is_reconciled && (
                          <>
                            <DropdownMenuItem onClick={() => handleQuickReconcile(transaction)}>
                              <Circle className="h-4 w-4 mr-2" />
                              Remover Conciliação
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => setEditTransaction(transaction)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editTransaction && (
        <CreateTransactionDialog
          open={!!editTransaction}
          onOpenChange={(open) => !open && setEditTransaction(null)}
          onSuccess={() => {
            setEditTransaction(null);
            onTransactionUpdated();
          }}
          editTransaction={editTransaction}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
