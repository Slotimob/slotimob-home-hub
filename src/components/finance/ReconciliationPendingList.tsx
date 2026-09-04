import { useState } from "react";
import { formatDateOnly } from "@/lib/date-only";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Plus, Search, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateTransactionDialog, TransactionPrefill } from "./CreateTransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

interface ReconciliationPendingListProps {
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
}

export function ReconciliationPendingList({
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
}: ReconciliationPendingListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Filter entries and transactions based on search term
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.description.toLowerCase().includes(term) ||
      formatCurrency(entry.amount).toLowerCase().includes(term)
    );
  });

  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(term) ||
      formatCurrency(transaction.amount).toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-16 w-full mb-3" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Search input component
  const SearchInput = () => (
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por descrição ou valor..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10"
      />
    </div>
  );

  // Entry item component with create button - selection via row click only (no checkbox)
  const EntryItem = ({ entry, showCreateButton = true }: { entry: Entry; showCreateButton?: boolean }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        selectedEntry === entry.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={() => {
        onSelectEntry(entry.id === selectedEntry ? null : entry.id);
        if (entry.id !== selectedEntry && isMobile) {
          setMobileStep("transaction");
        }
      }}
    >
      <div
        className={`p-1.5 rounded-full flex-shrink-0 ${
          entry.is_credit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        }`}
      >
        {entry.is_credit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateOnly(entry.entry_date, "dd/MM/yyyy")}
        </p>
      </div>
      <span
        className={`font-semibold text-sm whitespace-nowrap ${
          entry.is_credit ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {entry.is_credit ? "+" : "-"}
        {formatCurrency(Math.abs(entry.amount))}
      </span>
      {showCreateButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateTransaction(entry);
          }}
          title="Criar Lançamento"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Transaction item component - keeps checkbox for visual feedback as selection is via row click
  const TransactionItem = ({ transaction }: { transaction: Transaction }) => (
    <div
      className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
        selectedTransaction === transaction.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={() =>
        onSelectTransaction(transaction.id === selectedTransaction ? null : transaction.id)
      }
    >
      <div
        className={`p-1.5 rounded-full flex-shrink-0 ${
          transaction.type === "income"
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-red-500/10 text-red-500"
        }`}
      >
        {transaction.type === "income" ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
            locale: ptBR,
          })}
        </p>
      </div>
      <span
        className={`font-semibold text-sm whitespace-nowrap ${
          transaction.type === "income" ? "text-emerald-500" : "text-red-500"
        }`}
      >
        {transaction.type === "income" ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteClick(transaction);
        }}
        title="Excluir Lançamento"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

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
          className="space-y-4"
        >
          <AccordionItem value="entry" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <span className="font-medium">
                  Selecionar Extrato
                  {selectedEntry && (
                    <span className="ml-2 text-xs text-emerald-600">(✓ Selecionado)</span>
                  )}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {filteredEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {searchTerm ? "Nenhuma entrada encontrada" : "Nenhuma entrada pendente"}
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredEntries.map((entry) => (
                    <EntryItem key={entry.id} entry={entry} showCreateButton={false} />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transaction" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span className="font-medium">
                  Selecionar Lançamento
                  {selectedTransaction && (
                    <span className="ml-2 text-xs text-emerald-600">(✓ Selecionado)</span>
                  )}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {/* Quick create button for selected entry */}
              {selectedEntry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-3 gap-2"
                  onClick={() => {
                    const entry = entries.find((e) => e.id === selectedEntry);
                    if (entry) handleCreateTransaction(entry);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Criar Lançamento a partir do Extrato
                </Button>
              )}
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {searchTerm ? "Nenhum lançamento encontrado" : "Nenhum lançamento pendente"}
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredTransactions.map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} />
                  ))}
                </div>
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
      </>
    );
  }

  // Desktop: Two-column layout
  return (
    <>
      <SearchInput />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Statement Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extrato Bancário</CardTitle>
            <CardDescription>
              {filteredEntries.length} entrada(s) não conciliada(s)
              {searchTerm && ` (filtrado)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? "Nenhuma entrada encontrada" : "Nenhuma entrada pendente"}
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredEntries.map((entry) => (
                  <EntryItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Lançamentos</CardTitle>
                <CardDescription>
                  {filteredTransactions.length} lançamento(s) não conciliado(s)
                  {searchTerm && ` (filtrado)`}
                </CardDescription>
              </div>
              {onRefreshTransactions && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRefreshTransactions}
                  title="Atualizar lançamentos"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? "Nenhum lançamento encontrado" : "Nenhum lançamento pendente"}
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredTransactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </div>
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
            <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir esse lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
