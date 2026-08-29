import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Search, Check, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ReconciliationMismatchDialog } from "./ReconciliationMismatchDialog";

interface ReconciliationMatcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: string;
    transaction_date: string;
    bank_account_id?: string | null;
  };
  onReconciled: () => void;
}

interface StatementEntry {
  id: string;
  description: string;
  amount: number;
  entry_date: string;
  is_credit: boolean;
  bank_account_id: string;
  bank_account?: { name: string; bank_name?: string } | null;
}

export function ReconciliationMatcherDialog({
  open,
  onOpenChange,
  transaction,
  onReconciled,
}: ReconciliationMatcherDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<StatementEntry | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(true);

  // Reset selection and options when the dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedEntry(null);
      setMarkAsPaid(true);
      setShowMismatchDialog(false);
      setSearchTerm("");
    }
  }, [open]);

  // Fetch unreconciled bank statement entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["unreconciled-statement-entries", transaction.bank_account_id],
    queryFn: async () => {
      let query = supabase
        .from("bank_statement_entries")
        .select(`
          id,
          description,
          amount,
          entry_date,
          is_credit,
          bank_account_id,
          bank_account:bank_accounts(name, bank_name)
        `)
        .is("transaction_id", null)
        .eq("is_reconciled", false)
        .order("entry_date", { ascending: false });

      // If transaction has a bank account, prioritize that account's entries
      // but still show all entries for flexibility
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StatementEntry[];
    },
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Smart suggestions: entries with matching value and close date (±3 days)
  const { suggestions, others } = useMemo(() => {
    const transactionDate = parseISO(transaction.transaction_date);
    const transactionAmount = Math.abs(transaction.amount);
    const isIncome = transaction.type === "income";

    const filtered = entries.filter((entry) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        entry.description.toLowerCase().includes(term) ||
        formatCurrency(entry.amount).toLowerCase().includes(term)
      );
    });

    const suggestions: StatementEntry[] = [];
    const others: StatementEntry[] = [];

    filtered.forEach((entry) => {
      const entryDate = parseISO(entry.entry_date);
      const daysDiff = Math.abs(differenceInDays(entryDate, transactionDate));
      const amountMatch = Math.abs(entry.amount - transactionAmount) < 0.01;
      const typeMatch = entry.is_credit === isIncome;

      // Suggest if: same value, same type (income/credit), and within ±3 days
      if (amountMatch && typeMatch && daysDiff <= 3) {
        suggestions.push(entry);
      } else {
        others.push(entry);
      }
    });

    return { suggestions, others };
  }, [entries, transaction, searchTerm]);

  const handleSelectEntry = (entry: StatementEntry) => {
    setSelectedEntry(entry);
  };

  const handleConfirmReconcile = () => {
    if (!selectedEntry) return;

    // Check for value mismatch
    const transactionAmount = Math.abs(transaction.amount);
    const entryAmount = Math.abs(selectedEntry.amount);

    if (Math.abs(transactionAmount - entryAmount) >= 0.01) {
      setShowMismatchDialog(true);
    } else {
      handleReconcile(selectedEntry);
    }
  };

  const handleReconcile = async (entry: StatementEntry) => {
    setIsReconciling(true);
    try {
      // Update the statement entry to link to the transaction
      const { error: entryError } = await supabase
        .from("bank_statement_entries")
        .update({
          transaction_id: transaction.id,
          is_reconciled: true,
        })
        .eq("id", entry.id);

      if (entryError) throw entryError;

      // Build transaction update: only reconcile by default; optionally mark as paid
      const txUpdate: Record<string, unknown> = {
        is_reconciled: true,
        reconciled_at: new Date().toISOString(),
      };

      if (markAsPaid) {
        txUpdate.status = "paid";
        txUpdate.paid_date = entry.entry_date;
      }

      // Only set bank_account_id if the transaction does not already have one
      if (!transaction.bank_account_id) {
        txUpdate.bank_account_id = entry.bank_account_id;
      }

      // Update the transaction to mark as reconciled
      const { error: txError } = await supabase
        .from("financial_transactions")
        .update(txUpdate)
        .eq("id", transaction.id);

      if (txError) throw txError;

      toast({ title: "Lançamento conciliado com sucesso!" });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["infinite-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-statement-entries"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-summaries-progressive"] });
      
      onReconciled();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
      setSelectedEntry(null);
      setShowMismatchDialog(false);
      setMarkAsPaid(true);
    }
  };

  const handleMismatchConfirm = () => {
    if (selectedEntry) {
      handleReconcile(selectedEntry);
    }
  };

  const EntryItem = ({ entry, isSuggestion = false }: { entry: StatementEntry; isSuggestion?: boolean }) => {
    const isSelected = selectedEntry?.id === entry.id;
    
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
          isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
          !isSelected && "hover:bg-muted/50 hover:border-muted-foreground/20",
          isSuggestion && !isSelected && "border-emerald-200 bg-emerald-500/5"
        )}
        onClick={() => handleSelectEntry(entry)}
      >
        <div
          className={cn(
            "p-1.5 rounded-full flex-shrink-0",
            entry.is_credit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
          )}
        >
          {entry.is_credit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entry.description}</p>
            {isSuggestion && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                Sugerido
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(parseISO(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            {entry.bank_account && (
              <>
                <span>•</span>
                <span className="truncate">{entry.bank_account.name}</span>
              </>
            )}
          </div>
        </div>
        <span
          className={cn(
            "font-semibold text-sm whitespace-nowrap",
            entry.is_credit ? "text-emerald-500" : "text-red-500"
          )}
        >
          {entry.is_credit ? "+" : "-"}{formatCurrency(Math.abs(entry.amount))}
        </span>
        {isSelected && isReconciling && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Conciliar Lançamento</DialogTitle>
            <DialogDescription>
              Selecione o item do extrato bancário correspondente a este lançamento
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Info */}
          <div className="p-3 rounded-lg bg-muted/50 border flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-1">Lançamento a conciliar:</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "p-1.5 rounded-full",
                    transaction.type === "income" 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-red-500/10 text-red-500"
                  )}
                >
                  {transaction.type === "income" ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "font-semibold",
                  transaction.type === "income" ? "text-emerald-500" : "text-red-500"
                )}
              >
                {transaction.type === "income" ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Entries List - with explicit max height for scrolling */}
          <ScrollArea className="flex-1 min-h-0 max-h-[50vh] -mx-6 px-6 pr-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum item do extrato disponível para conciliação.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Importe um extrato bancário primeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600">
                        Sugestões ({suggestions.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((entry) => (
                        <EntryItem key={entry.id} entry={entry} isSuggestion />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other entries */}
                {others.length > 0 && (
                  <div className="space-y-2">
                    {suggestions.length > 0 && (
                      <p className="text-sm font-medium text-muted-foreground">
                        Outros itens ({others.length})
                      </p>
                    )}
                    <div className="space-y-2">
                      {others.map((entry) => (
                        <EntryItem key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.length === 0 && others.length === 0 && searchTerm && (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    Nenhum resultado para "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer info */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t flex-shrink-0">
            Clique em um item do extrato para conciliar com o lançamento selecionado
          </div>
        </DialogContent>
      </Dialog>

      {/* Mismatch Dialog */}
      {selectedEntry && (
        <ReconciliationMismatchDialog
          open={showMismatchDialog}
          onOpenChange={(open) => {
            setShowMismatchDialog(open);
            if (!open) setSelectedEntry(null);
          }}
          entryValue={Math.abs(selectedEntry.amount)}
          transactionValue={Math.abs(transaction.amount)}
          onConfirm={handleMismatchConfirm}
        />
      )}
    </>
  );
}
