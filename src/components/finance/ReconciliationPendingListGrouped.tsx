import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Calendar,
  FileText,
  Receipt
} from "lucide-react";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateTransactionDialog, TransactionPrefill } from "./CreateTransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  description: string;
  entry_date: string;
  amount: number;
  is_credit: boolean;
}

interface Transaction {
  id: string;
  description: string;
  transaction_date: string;
  amount: number;
  type: string;
}

interface GroupedItem<T> {
  date: string;
  items: T[];
  isOverdue: boolean;
}

interface ReconciliationPendingListGroupedProps {
  entries: Entry[];
  transactions: Transaction[];
  selectedEntry: string | null;
  selectedTransaction: string | null;
  onSelectEntry: (id: string | null) => void;
  onSelectTransaction: (id: string | null) => void;
  isLoading: boolean;
  onTransactionCreated: () => void;
  onRefreshTransactions?: () => void;
  bankAccountId?: string;
  auditedDates?: string[];
}

export function ReconciliationPendingListGrouped({
  entries,
  transactions,
  selectedEntry,
  selectedTransaction,
  onSelectEntry,
  onSelectTransaction,
  isLoading,
  onTransactionCreated,
  onRefreshTransactions,
  bankAccountId,
  auditedDates = [],
}: ReconciliationPendingListGroupedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner, hasPermission } = usePermissions();
  const canDelete = isOwner || hasPermission("finance_reconciliation", "delete");
  const isMobile = useIsMobile();
  const [mobileStep, setMobileStep] = useState<"entry" | "transaction">("entry");
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<TransactionPrefill | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const today = startOfDay(new Date());

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        entry.description.toLowerCase().includes(term) ||
        formatCurrency(entry.amount).toLowerCase().includes(term)
      );
    });

    const groups: Record<string, Entry[]> = {};
    filtered.forEach((entry) => {
      const date = entry.entry_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    const result: GroupedItem<Entry>[] = Object.entries(groups)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
        isOverdue: isBefore(parseISO(date), today),
      }))
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    return result;
  }, [entries, searchTerm, today]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter((tx) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        tx.description.toLowerCase().includes(term) ||
        formatCurrency(tx.amount).toLowerCase().includes(term)
      );
    });

    const groups: Record<string, Transaction[]> = {};
    filtered.forEach((tx) => {
      const date = tx.transaction_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });

    const result: GroupedItem<Transaction>[] = Object.entries(groups)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => b.amount - a.amount),
        isOverdue: isBefore(parseISO(date), today),
      }))
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    return result;
  }, [transactions, searchTerm, today]);

  const overdueEntriesCount = groupedEntries.filter((g) => g.isOverdue).reduce((sum, g) => sum + g.items.length, 0);
  const overdueTransactionsCount = groupedTransactions.filter((g) => g.isOverdue).reduce((sum, g) => sum + g.items.length, 0);

  const handleCreateTransaction = (entry: Entry) => {
    setPrefillData({
      description: entry.description,
      amount: Math.abs(entry.amount),
      type: entry.is_credit ? "income" : "expense",
      dueDate: entry.entry_date,
      status: "paid",
      bankAccountId: bankAccountId,
    });
    setCreateDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    setCreateDialogOpen(false);
    setPrefillData(undefined);
    onTransactionCreated();
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transactionToDelete.id);

      if (error) throw error;

      toast({ title: "Lançamento excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir lançamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const isDateAudited = (date: string) => auditedDates.includes(date);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="py-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pb-4">
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-14 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Minimalist Empty State Component
  const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );

  // Date header component - more compact
  const DateHeader = ({ date, isOverdue, count, isAudited }: { date: string; isOverdue: boolean; count: number; isAudited: boolean }) => (
    <div
      className={cn(
        "flex items-center justify-between px-1.5 py-1 rounded mb-1 text-xs",
        isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {isOverdue ? (
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        ) : (
          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
        <span className={cn("font-medium truncate", isOverdue && "text-destructive")}>
          {format(parseISO(date), "EEE, dd MMM", { locale: ptBR })}
        </span>
        {isAudited && (
          <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-primary/10 text-primary border-primary/30 flex-shrink-0">
            ✔️
          </Badge>
        )}
      </div>
      <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[9px] h-3.5 px-1 flex-shrink-0 ml-1">
        {count}
      </Badge>
    </div>
  );

  // Entry item component - compact, no horizontal overflow
  const EntryItem = ({ entry, showCreateButton = true }: { entry: Entry; showCreateButton?: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-1.5 p-2 rounded-md border transition-colors cursor-pointer text-xs",
        selectedEntry === entry.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={() => {
        onSelectEntry(entry.id === selectedEntry ? null : entry.id);
        if (entry.id !== selectedEntry && isMobile) {
          setMobileStep("transaction");
        }
      }}
    >
      <div
        className={cn(
          "p-0.5 rounded-full flex-shrink-0",
          entry.is_credit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}
      >
        {entry.is_credit ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="font-medium truncate text-xs leading-tight">{entry.description}</p>
      </div>
      <span
        className={cn(
          "font-semibold text-[11px] flex-shrink-0",
          entry.is_credit ? "text-emerald-600" : "text-red-600"
        )}
      >
        {entry.is_credit ? "+" : ""}
        {formatCurrency(entry.is_credit ? entry.amount : -Math.abs(entry.amount))}
      </span>
      {showCreateButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateTransaction(entry);
          }}
          title="Criar Lançamento"
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  // Transaction item component - compact, no horizontal overflow
  const TransactionItem = ({ transaction }: { transaction: Transaction }) => (
    <div
      className={cn(
        "flex items-center gap-1.5 p-2 rounded-md border transition-colors cursor-pointer text-xs",
        selectedTransaction === transaction.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      )}
      onClick={() =>
        onSelectTransaction(transaction.id === selectedTransaction ? null : transaction.id)
      }
    >
      <div
        className={cn(
          "p-0.5 rounded-full flex-shrink-0",
          transaction.type === "income"
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-red-500/10 text-red-500"
        )}
      >
        {transaction.type === "income" ? (
          <TrendingUp className="h-2.5 w-2.5" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5" />
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="font-medium truncate text-xs leading-tight">{transaction.description}</p>
      </div>
      <span
        className={cn(
          "font-semibold text-[11px] flex-shrink-0",
          transaction.type === "income" ? "text-emerald-600" : "text-red-600"
        )}
      >
        {transaction.type === "income" ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </span>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(transaction);
          }}
          title="Excluir"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  // Search input component
  const SearchInput = () => (
    <div className="relative mb-3">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-8 h-9"
      />
    </div>
  );

  // Overdue alert - compact inline badge
  const OverdueIndicator = ({ count }: { count: number }) =>
    count > 0 ? (
      <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 h-4">
        <AlertTriangle className="h-2.5 w-2.5" />
        {count}
      </Badge>
    ) : null;

  // Mobile: Accordion step-by-step view
  if (isMobile) {
    return (
      <>
        <SearchInput />
        <Accordion
          type="single"
          collapsible
          value={mobileStep}
          onValueChange={(val) => setMobileStep(val as "entry" | "transaction")}
          className="space-y-3"
        >
          <AccordionItem value="entry" className="border rounded-lg">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <span className="font-medium text-sm">
                  Extrato
                  {selectedEntry && <span className="ml-1 text-xs text-emerald-600">(✓)</span>}
                </span>
                <OverdueIndicator count={overdueEntriesCount} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {groupedEntries.length === 0 ? (
                <EmptyState icon={FileText} message="Nenhuma entrada pendente" />
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-2">
                    {groupedEntries.map((group) => (
                      <div key={group.date}>
                        <DateHeader
                          date={group.date}
                          isOverdue={group.isOverdue}
                          count={group.items.length}
                          isAudited={isDateAudited(group.date)}
                        />
                        <div className="space-y-1.5">
                          {group.items.map((entry) => (
                            <EntryItem key={entry.id} entry={entry} showCreateButton={false} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transaction" className="border rounded-lg">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span className="font-medium text-sm">
                  Lançamento
                  {selectedTransaction && <span className="ml-1 text-xs text-emerald-600">(✓)</span>}
                </span>
                <OverdueIndicator count={overdueTransactionsCount} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              {selectedEntry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-2 gap-1.5 text-xs"
                  onClick={() => {
                    const entry = entries.find((e) => e.id === selectedEntry);
                    if (entry) handleCreateTransaction(entry);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar a partir do extrato
                </Button>
              )}
              {groupedTransactions.length === 0 ? (
                <EmptyState icon={Receipt} message="Nenhum lançamento pendente" />
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-2">
                    {groupedTransactions.map((group) => (
                      <div key={group.date}>
                        <DateHeader
                          date={group.date}
                          isOverdue={group.isOverdue}
                          count={group.items.length}
                          isAudited={isDateAudited(group.date)}
                        />
                        <div className="space-y-1.5">
                          {group.items.map((transaction) => (
                            <TransactionItem key={transaction.id} transaction={transaction} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <CreateTransactionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleTransactionSuccess}
          prefill={prefillData}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja excluir "{transactionToDelete?.description}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTransaction} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop: Side-by-side view
  return (
    <>
      <SearchInput />
      <div className="grid gap-3 lg:grid-cols-2 overflow-hidden">
        {/* Statement Entries */}
        <Card className="overflow-hidden min-w-0">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between border-b">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-xs font-medium truncate">Extrato Bancário</CardTitle>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <OverdueIndicator count={overdueEntriesCount} />
              <Badge variant="secondary" className="text-[9px] h-4 px-1">{entries.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {groupedEntries.length === 0 ? (
              <EmptyState icon={FileText} message={searchTerm ? "Nenhuma entrada encontrada" : "Nenhuma entrada pendente"} />
            ) : (
              <ScrollArea className="h-[350px]" type="always">
                <div className="space-y-2 p-2 pr-3">
                  {groupedEntries.map((group) => (
                    <div key={group.date}>
                      <DateHeader
                        date={group.date}
                        isOverdue={group.isOverdue}
                        count={group.items.length}
                        isAudited={isDateAudited(group.date)}
                      />
                      <div className="space-y-1">
                        {group.items.map((entry) => (
                          <EntryItem key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="overflow-hidden min-w-0">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between border-b">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <Receipt className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-xs font-medium truncate">Lançamentos</CardTitle>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <OverdueIndicator count={overdueTransactionsCount} />
              <Badge variant="secondary" className="text-[9px] h-4 px-1">{transactions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {groupedTransactions.length === 0 ? (
              <EmptyState icon={Receipt} message={searchTerm ? "Nenhum lançamento encontrado" : "Nenhum lançamento pendente"} />
            ) : (
              <ScrollArea className="h-[350px]" type="always">
                <div className="space-y-2 p-2 pr-3">
                  {groupedTransactions.map((group) => (
                    <div key={group.date}>
                      <DateHeader
                        date={group.date}
                        isOverdue={group.isOverdue}
                        count={group.items.length}
                        isAudited={isDateAudited(group.date)}
                      />
                      <div className="space-y-1">
                        {group.items.map((transaction) => (
                          <TransactionItem key={transaction.id} transaction={transaction} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTransactionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleTransactionSuccess}
        prefill={prefillData}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir "{transactionToDelete?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
