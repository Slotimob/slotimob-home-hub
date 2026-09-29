import { getEffectiveStatus, EFFECTIVE_STATUS_LABELS, EFFECTIVE_STATUS_BADGE_CLASSES } from "@/lib/transaction-status";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Check, TrendingUp, TrendingDown, Loader2, Repeat, CheckCircle2, Circle, ArrowRightLeft, Link2, Hammer, Layers } from "lucide-react";
import { useTransactionsWithImprovement } from "@/hooks/useAssetFinancials";
import { MarkAsImprovementDialog } from "./MarkAsImprovementDialog";

import { formatDateOnly, todayDateOnly } from "@/lib/date-only";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateTransactionDialog } from "./CreateTransactionDialog";
import { TransactionCard } from "./TransactionCard";
import { useSettlementGroups, useRentBalanceLines, rentMonthSummary, collectRentMonthLines, settlementBreakdown, describeSettlement, markPaidWithSettlement, settlementAnchor } from "@/lib/settlement-group";
import { rentSettlementLabel } from "@/lib/obligation-labels";
import { SettlementBreakdownPopover } from "./SettlementBreakdownPopover";
import { RegisterRentPaymentDialog } from "./RegisterRentPaymentDialog";
import { RentCompositionDialog } from "./RentCompositionDialog";
import { TransactionsBulkActionsBar } from "./TransactionsBulkActionsBar";
import { SortableTableHead } from "./SortableTableHead";
import { ReconciliationDetailsPopover } from "./ReconciliationDetailsPopover";
import { ReconciliationMatcherDialog } from "./ReconciliationMatcherDialog";
import { WhatsAppBillingButton } from "./WhatsAppBillingButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useWhatsAppBilling } from "@/hooks/useWhatsAppBilling";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { SortConfig, SortField } from "@/hooks/useInfiniteTransactions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";

const MOBILE_SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "due_date", label: "Vencimento" },
  { value: "transaction_date", label: "Emissão" },
  { value: "description", label: "Descrição" },
  { value: "amount", label: "Valor" },
  { value: "status", label: "Status" },
  { value: "category", label: "Categoria" },
  { value: "unit", label: "Unidade" },
  { value: "type", label: "Tipo" },
  { value: "is_reconciled", label: "Conciliação" },
];
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

interface TransactionsTableInfiniteProps {
  transactions: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onTransactionUpdated: () => void;
  sortConfig?: SortConfig;
  onSortChange?: (field: SortField) => void;
  onSortSet?: (config: SortConfig) => void;
}

// Helper to check if transaction is a transfer
const isTransfer = (transaction: any): boolean => {
  const categoryName = transaction.category?.name?.toLowerCase() || "";
  return (
    transaction.obligation_type === "transfer" ||
    categoryName.includes("transferência") ||
    categoryName.includes("transfer")
  );
};

export function TransactionsTableInfinite({
  transactions,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onTransactionUpdated,
  sortConfig,
  onSortChange,
  onSortSet,
}: TransactionsTableInfiniteProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { unreconcile } = useReconciliation();
  const isReconciling = unreconcile.isPending;
  const { sendBillingReminder, isEligibleForBilling, isSending: isSendingBilling } = useWhatsAppBilling();
  const { isOwner, hasPermission } = usePermissions();
  const canEditTx = isOwner || hasPermission('finance_transactions', 'edit');
  const canDeleteTx = isOwner || hasPermission('finance_transactions', 'delete');
  const canReconcile = isOwner || hasPermission('finance_reconciliation', 'edit') || hasPermission('finance_reconciliation', 'create');
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [matcherTransaction, setMatcherTransaction] = useState<any>(null);
  const [billingTransactionId, setBillingTransactionId] = useState<string | null>(null);
  const [improvementTransaction, setImprovementTransaction] = useState<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const improvementCandidateIds = useMemo(
    () =>
      (transactions || [])
        .filter((t: any) => t.type === 'expense' && (t.unit_id || t.property_id))
        .map((t: any) => t.id),
    [transactions]
  );
  const { data: alreadyImprovementIds } = useTransactionsWithImprovement(improvementCandidateIds);
  const canMarkAsImprovement = (t: any) =>
    !!canEditTx && t.type === 'expense' && !!(t.unit_id || t.property_id);
  const isAlreadyImprovement = (t: any) => !!alreadyImprovementIds?.has(t.id);


  // Handle WhatsApp billing reminder
  const handleSendBillingReminder = async (transaction: any) => {
    setBillingTransactionId(transaction.id);
    await sendBillingReminder(
      {
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        due_date: transaction.due_date,
        contact_id: transaction.contact_id,
        unit_id: transaction.unit_id,
        status: transaction.status,
        settlement_group_id: transaction.settlement_group_id ?? null,
      },
      () => {
        onTransactionUpdated();
      }
    );
    setBillingTransactionId(null);
  };

  // Clear selection when transactions change (e.g., filters applied)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [transactions.length]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < transactions.length;
  const selectedTransactions = transactions.filter((t) => selectedIds.has(t.id));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };


  const getStatusBadge = (transaction: any) => {
    const effective = getEffectiveStatus(transaction);
    return (
      <Badge className={`${EFFECTIVE_STATUS_BADGE_CLASSES[effective]} text-[10px] px-1.5 py-0`}>
        {EFFECTIVE_STATUS_LABELS[effective]}
      </Badge>
    );
  };

  // Open reconciliation matcher dialog for pending transactions
  const handleOpenReconciliationMatcher = (transaction: any) => {
    setMatcherTransaction({
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.transaction_date,
      due_date: transaction.due_date ?? null,
      bank_account_id: transaction.bank_account_id,
    });
  };

  // Quick toggle for already reconciled transactions (to undo)
  const handleQuickReconcile = async (transaction: any) => {
    if (!transaction.is_reconciled) {
      // For pending, open the matcher dialog
      handleOpenReconciliationMatcher(transaction);
      return;
    }
    
    // For reconciled, undo both sides (lançamento + linha do extrato)
    setReconcilingId(transaction.id);
    try {
      await unreconcile.mutateAsync({ transactionId: transaction.id });
      onTransactionUpdated();
    } catch {
      // toast de erro vem do hook
    } finally {
      setReconcilingId(null);
    }
  };

  const { data: settlementGroups = {}, isPlaceholderData: groupsStale, isLoading: groupsLoading } = useSettlementGroups(
    transactions.map((t) => t.settlement_group_id)
  );
  const settlementSummaryFor = (t: any): string | null => {
    const lines = t.settlement_group_id ? settlementGroups[t.settlement_group_id] : undefined;
    return lines && lines.length > 1 ? describeSettlement(settlementBreakdown(lines)) : null;
  };

  const [rentPaymentTx, setRentPaymentTx] = useState<any | null>(null);
  const [compositionTxId, setCompositionTxId] = useState<string | null>(null);
  const groupLinesOf = (t: any) => (t.settlement_group_id ? settlementGroups[t.settlement_group_id] : undefined);
  const isRentLeaseLine = (t: any) =>
    t.type === "income" &&
    (!t.obligation_type || ["rent", "rent_balance"].includes(t.obligation_type)) &&
    (!!t.lease_id || String(t.reference || "").startsWith("lease:"));
  const canRentComposition = (t: any) => isRentLeaseLine(t) || !!t.settlement_group_id;
  const partialAnchorIds = transactions
    .filter((t: any) => t.type === "income" && (t.metadata as any)?.partial_payment)
    .map((t) => t.id);
  const { data: rentBalances = {}, isPlaceholderData: balancesStale, isLoading: balancesLoading } = useRentBalanceLines(partialAnchorIds);
  /** Dados do grupo/saldo da linha ainda não chegaram: não calcular "líquido" com grupo incompleto. */
  const groupDataPending = (t: any) =>
    (!!t.settlement_group_id && (groupsStale || groupsLoading || !settlementGroups[t.settlement_group_id])) ||
    (t.type === "income" && !!(t.metadata as any)?.partial_payment && (balancesStale || balancesLoading));
  const anchorBreakdownFor = (t: any) => {
    const lines = groupLinesOf(t);
    const extra = rentBalances[t.id];
    if (extra?.length) {
      return rentMonthSummary(t, collectRentMonthLines(t, lines || [], extra));
    }
    if (!lines || lines.length < 2 || settlementAnchor(lines)?.id !== t.id) return null;
    return settlementBreakdown(lines);
  };
  const groupBadgeFor = (t: any): string | null => {
    const lines = groupLinesOf(t);
    if (!lines || lines.length < 2 || settlementAnchor(lines)?.id === t.id) return null;
    return rentSettlementLabel(t.obligation_type);
  };

  const handleMarkAsPaid = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx && tx.type === "income" && canRentComposition(tx)) {
      setRentPaymentTx(tx);
      return;
    }
    try {
      const { count, grouped } = await markPaidWithSettlement([id], todayDateOnly());
      toast({
        title: "Lançamento marcado como pago!",
        description: grouped ? `Baixa conjunta: ${count} lançamentos` : undefined,
      });
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

  const handleDeleteGroup = async (deleteAll: boolean) => {
    if (!deleteGroupId || !deleteId) return;

    try {
      if (deleteAll) {
        const { error } = await supabase
          .from("financial_transactions")
          .delete()
          .eq("group_id", deleteGroupId);

        if (error) throw error;
        toast({ title: "Todos os lançamentos recorrentes excluídos!" });
      } else {
        const currentTransaction = transactions.find((t) => t.id === deleteId);
        if (currentTransaction) {
          const { error } = await supabase
            .from("financial_transactions")
            .delete()
            .eq("group_id", deleteGroupId)
            .gte("transaction_date", currentTransaction.transaction_date);

          if (error) throw error;
          toast({ title: "Este e os próximos lançamentos excluídos!" });
        }
      }
      onTransactionUpdated();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setShowDeleteGroupDialog(false);
      setDeleteGroupId(null);
      setDeleteId(null);
    }
  };

  const handleDeleteClick = (transaction: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (transaction.group_id) {
      setDeleteId(transaction.id);
      setDeleteGroupId(transaction.group_id);
      setShowDeleteGroupDialog(true);
    } else {
      setDeleteId(transaction.id);
    }
  };

  const handleRowClick = (transaction: any) => {
    setEditTransaction(transaction);
  };

  const handleSortClick = (field: SortField) => {
    onSortChange?.(field);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-2"></TableHead>
              <TableHead className="w-8 px-2">Tipo</TableHead>
              <TableHead className="px-2">Descrição</TableHead>
              <TableHead className="px-2 text-xs hidden md:table-cell">Unidade</TableHead>
              <TableHead className="px-2 hidden lg:table-cell">Categoria</TableHead>
              <TableHead className="px-2 w-20">Emissão</TableHead>
              <TableHead className="px-2 w-20 hidden lg:table-cell">Vencim.</TableHead>
              <TableHead className="px-2">Valor</TableHead>
              <TableHead className="px-2">Status</TableHead>
              <TableHead className="w-8 px-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(10)].map((_, j) => (
                  <TableCell
                    key={j}
                    className={cn("px-2 py-2", j === 3 && "hidden md:table-cell", (j === 4 || j === 6) && "hidden lg:table-cell")}
                  >
                    <Skeleton className="h-3 w-full" />
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
      <div className="rounded-md border p-8 flex flex-col items-center justify-center text-center">
        <TrendingDown className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">Nenhum lançamento encontrado</p>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Ajuste os filtros ou adicione um novo lançamento.
        </p>
      </div>
    );
  }

  // Única instância do matcher, usada nos layouts mobile e desktop
  const matcherDialog = matcherTransaction ? (
    <ReconciliationMatcherDialog
      open={!!matcherTransaction}
      onOpenChange={(open) => !open && setMatcherTransaction(null)}
      transaction={matcherTransaction}
      onReconciled={() => {
        setMatcherTransaction(null);
        onTransactionUpdated();
      }}
    />
  ) : null;

  // Mobile card view
  if (isMobile) {
    return (
      <>
        {onSortSet && sortConfig && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ordenar por</span>
            <Select
              value={sortConfig.field}
              onValueChange={(v) => onSortSet({ field: v as SortField, order: sortConfig.order ?? "asc" })}
            >
              <SelectTrigger className="h-9 flex-1 text-base sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOBILE_SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label={sortConfig.order === "desc" ? "Ordem decrescente" : "Ordem crescente"}
              title={sortConfig.order === "desc" ? "Decrescente" : "Crescente"}
              onClick={() =>
                onSortSet({ field: sortConfig.field, order: sortConfig.order === "desc" ? "asc" : "desc" })
              }
            >
              {sortConfig.order === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        )}
        <div className="space-y-2 pb-20">
          {transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              settlementSummary={settlementSummaryFor(transaction)}
              settlementBreakdown={anchorBreakdownFor(transaction)}
              settlementBadge={groupBadgeFor(transaction)}
              onRentComposition={canRentComposition(transaction) ? (t: any) => setCompositionTxId(t.id) : undefined}
              isSelected={selectedIds.has(transaction.id)}
              onSelect={(checked) => handleSelectOne(transaction.id, checked)}
              onEdit={canEditTx ? setEditTransaction : undefined}
              onDelete={canDeleteTx ? () => handleDeleteClick(transaction) : undefined}
              onMarkAsPaid={canEditTx ? handleMarkAsPaid : undefined}
              onReconcile={canReconcile ? handleQuickReconcile : undefined}
              onSendBillingReminder={handleSendBillingReminder}
              isReconciling={reconcilingId === transaction.id}
              isSendingBilling={billingTransactionId === transaction.id && isSendingBilling}
              isEligibleForBilling={isEligibleForBilling(transaction)}
              onMarkAsImprovement={
                canMarkAsImprovement(transaction) ? setImprovementTransaction : undefined
              }
              isAlreadyImprovement={isAlreadyImprovement(transaction)}
            />

          ))}
        </div>

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Diálogos de aluguel */}
        <RegisterRentPaymentDialog
          open={!!rentPaymentTx}
          onOpenChange={(o) => !o && setRentPaymentTx(null)}
          transaction={rentPaymentTx}
          onDone={onTransactionUpdated}
        />
        <RentCompositionDialog
          open={!!compositionTxId}
          onOpenChange={(o) => !o && setCompositionTxId(null)}
          transactionId={compositionTxId}
          onDone={onTransactionUpdated}
        />

        {/* Bulk Actions Bar */}
        <TransactionsBulkActionsBar
          selectedTransactions={selectedTransactions}
          onClearSelection={handleClearSelection}
          onSuccess={onTransactionUpdated}
        />

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

        {/* Delete Single Confirmation */}
        <AlertDialog open={!!deleteId && !showDeleteGroupDialog} onOpenChange={(open) => !open && setDeleteId(null)}>
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

        {/* Delete Group Confirmation */}
        <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Excluir lançamento recorrente
              </AlertDialogTitle>
              <AlertDialogDescription>
                Este lançamento faz parte de uma série recorrente. O que você deseja fazer?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => handleDeleteGroup(false)}
              >
                Este e próximos
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteGroup(true)}
              >
                Excluir todos
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mark as improvement */}
        {improvementTransaction && (
          <MarkAsImprovementDialog
            open={!!improvementTransaction}
            onOpenChange={(open) => !open && setImprovementTransaction(null)}
            transaction={improvementTransaction}
          />
        )}

        {matcherDialog}
      </>

    );
  }

  // Desktop table view - compact layout
  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-md border overflow-hidden w-full overflow-x-auto">
        <div className="max-h-[calc(100vh-300px)] overflow-auto" tabIndex={0} role="region" aria-label="Tabela de lançamentos">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-8 px-2">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = isIndeterminate;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                <SortableTableHead
                  field="is_reconciled"
                  label="✓"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="w-8"
                />
                <SortableTableHead
                  field="type"
                  label="Tipo"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="w-10"
                />
                <SortableTableHead
                  field="description"
                  label="Descrição"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                />
                <SortableTableHead
                  field="unit"
                  label="Unidade"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="hidden md:table-cell"
                />
                <SortableTableHead
                  field="category"
                  label="Categoria"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="hidden lg:table-cell"
                />
                <SortableTableHead
                  field="transaction_date"
                  label="Emissão"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="w-20"
                />
                <SortableTableHead
                  field="due_date"
                  label="Vencim."
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                  className="w-20 hidden lg:table-cell"
                />
                <SortableTableHead
                  field="amount"
                  label="Valor"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                />
                <SortableTableHead
                  field="status"
                  label="Status"
                  currentSort={sortConfig}
                  onSort={handleSortClick}
                />
                <TableHead className="w-8 px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const isCurrentlyReconciling = reconcilingId === transaction.id;
                const isTransferTransaction = isTransfer(transaction);
                
                return (
                  <TableRow
                    key={transaction.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      transaction.is_reconciled && "bg-blue-500/5"
                    )}
                    onClick={() => handleRowClick(transaction)}
                  >
                    <TableCell className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(transaction.id)}
                        onCheckedChange={(checked) => handleSelectOne(transaction.id, checked === true)}
                        aria-label={`Selecionar ${transaction.description}`}
                      />
                    </TableCell>
                    {/* Reconciliation Hub - Interactive */}
                    <TableCell className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {transaction.is_reconciled ? (
                        <ReconciliationDetailsPopover
                          transaction={transaction}
                          onReconciliationChange={canReconcile ? onTransactionUpdated : undefined}
                        />
                      ) : canReconcile ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 rounded-full transition-all",
                                "hover:bg-blue-500/10 border border-dashed border-blue-300/50 hover:border-blue-400"
                              )}
                              onClick={() => handleOpenReconciliationMatcher(transaction)}
                              aria-label={`Conciliar com extrato: ${transaction.description}`}
                              disabled={isCurrentlyReconciling || isReconciling}
                            >
                              {isCurrentlyReconciling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3 text-blue-500/60" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Pendente de conciliar</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div
                        className={cn(
                          "p-1 rounded-full w-fit",
                          isTransferTransaction
                            ? "bg-blue-500/10 text-blue-500"
                            : transaction.type === "income"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500"
                        )}
                      >
                        {isTransferTransaction ? (
                          <ArrowRightLeft className="h-3 w-3" />
                        ) : transaction.type === "income" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        <span className="text-xs font-medium truncate">{transaction.description}</span>
                        {transaction.group_id && (
                          <Repeat className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        )}
{(transaction as any).via_lease_share_percent != null && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-normal" title="Lançamento de contrato com vários imóveis; o valor mostrado é o cheio.">
                            via contrato (rateio {Number((transaction as any).via_lease_share_percent).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)
                          </Badge>
                        )}
                        {groupBadgeFor(transaction) && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-normal">
                            {groupBadgeFor(transaction)}
                          </Badge>
                        )}
                        {settlementSummaryFor(transaction) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Layers className="h-2.5 w-2.5 text-primary shrink-0" aria-label="Baixa conjunta" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Baixa conjunta</p>
                              <p className="text-xs">{settlementSummaryFor(transaction)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {isTransferTransaction && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ArrowRightLeft className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Transferência interna</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">
                      {transaction.unit?.unit_number || "-"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 hidden lg:table-cell">
                      {transaction.category ? (
                        <span className="text-[10px] text-muted-foreground truncate block max-w-[100px]">
                          {transaction.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                      {formatDateOnly(transaction.transaction_date, "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground hidden lg:table-cell">
                      {formatDateOnly(transaction.due_date, "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          isTransferTransaction
                            ? "text-blue-600"
                            : transaction.type === "income" 
                              ? "text-emerald-500" 
                              : "text-red-500"
                        )}
                      >
                        {isTransferTransaction ? "" : (transaction.type === "income" ? "+" : "-")}
                        {formatCurrency(Number(transaction.amount))}
                      </span>
                      {(() => {
                        if (groupDataPending(transaction)) {
                          return <Skeleton className="mt-0.5 h-2.5 w-14" aria-label="Calculando líquido" />;
                        }
                        const b = anchorBreakdownFor(transaction);
                        return b ? (
                          <SettlementBreakdownPopover breakdown={b} paid={transaction.status === "paid"}>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="block text-[10px] text-muted-foreground hover:underline tabular-nums"
                            >
                              líquido {formatCurrency(b.net)}
                            </button>
                          </SettlementBreakdownPopover>
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {getStatusBadge(transaction)}
                        {/* WhatsApp Billing Button for overdue transactions */}
                        {isEligibleForBilling(transaction) && transaction.contact_id && (
                          <WhatsAppBillingButton
                            onClick={() => handleSendBillingReminder(transaction)}
                            isLoading={billingTransactionId === transaction.id && isSendingBilling}
                            disabled={isSendingBilling && billingTransactionId !== transaction.id}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Ações do lançamento ${transaction.description}`}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* WhatsApp Billing Option */}
                          {isEligibleForBilling(transaction) && transaction.contact_id && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => handleSendBillingReminder(transaction)} 
                                className="text-xs text-emerald-600"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 mr-2">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Enviar Cobrança WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canReconcile && !transaction.is_reconciled && (
                            <>
                              <DropdownMenuItem onClick={() => handleOpenReconciliationMatcher(transaction)} className="text-xs">
                                <Link2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                                Conciliar com Extrato
                              </DropdownMenuItem>
                              {canEditTx && transaction.status === "pending" && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(transaction.id)} className="text-xs">
                                  <Check className="h-3.5 w-3.5 mr-2" />
                                  Marcar como Pago
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canReconcile && transaction.is_reconciled && (
                            <>
                              <DropdownMenuItem onClick={() => handleQuickReconcile(transaction)} className="text-xs">
                                <Circle className="h-3.5 w-3.5 mr-2" />
                                Remover Conciliação
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {canRentComposition(transaction) && (
                            <DropdownMenuItem onClick={() => setCompositionTxId(transaction.id)} className="text-xs">
                              <Layers className="h-3.5 w-3.5 mr-2" />
                              Composição do aluguel
                            </DropdownMenuItem>
                          )}
                          {canMarkAsImprovement(transaction) && (
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={isAlreadyImprovement(transaction)}
                              onClick={() => setImprovementTransaction(transaction)}
                            >
                              <Hammer className="h-3.5 w-3.5 mr-2 text-amber-700 dark:text-amber-400" />
                              {isAlreadyImprovement(transaction)
                                ? 'Já é uma benfeitoria'
                                : 'Marcar como Benfeitoria'}
                            </DropdownMenuItem>
                          )}
                          {canEditTx && (
                            <DropdownMenuItem onClick={() => setEditTransaction(transaction)} className="text-xs">
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}

                          {canDeleteTx && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive text-xs"
                                onClick={(e) => handleDeleteClick(transaction, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-3 flex justify-center border-t">
          {isFetchingNextPage ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasNextPage ? (
            <span className="text-xs text-muted-foreground">Role para carregar mais</span>
          ) : transactions.length > 0 ? (
            <span className="text-xs text-muted-foreground">Todos os lançamentos carregados</span>
          ) : null}
        </div>
      </div>

      {/* Diálogos de aluguel */}
        <RegisterRentPaymentDialog
          open={!!rentPaymentTx}
          onOpenChange={(o) => !o && setRentPaymentTx(null)}
          transaction={rentPaymentTx}
          onDone={onTransactionUpdated}
        />
        <RentCompositionDialog
          open={!!compositionTxId}
          onOpenChange={(o) => !o && setCompositionTxId(null)}
          transactionId={compositionTxId}
          onDone={onTransactionUpdated}
        />

        {/* Bulk Actions Bar */}
      <TransactionsBulkActionsBar
        selectedTransactions={selectedTransactions}
        onClearSelection={handleClearSelection}
        onSuccess={onTransactionUpdated}
      />

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

      {/* Delete Single Confirmation */}
      <AlertDialog open={!!deleteId && !showDeleteGroupDialog} onOpenChange={(open) => !open && setDeleteId(null)}>
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

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Excluir lançamento recorrente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este lançamento faz parte de uma série recorrente. O que você deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleDeleteGroup(false)}
            >
              Este e próximos
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteGroup(true)}
            >
              Excluir todos
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reconciliation Matcher Dialog */}
      {matcherDialog}

      {/* Mark as improvement */}
      {improvementTransaction && (
        <MarkAsImprovementDialog
          open={!!improvementTransaction}
          onOpenChange={(open) => !open && setImprovementTransaction(null)}
          transaction={improvementTransaction}
        />
      )}

    </TooltipProvider>
  );
}
