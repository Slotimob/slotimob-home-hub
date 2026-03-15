import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, Link2, Wand2, Loader2, Calculator } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { ReconciliationPendingListGrouped } from "./ReconciliationPendingListGrouped";
import { ReconciliationHistoryTable } from "./ReconciliationHistoryTable";
import { ReconciliationMismatchDialog } from "./ReconciliationMismatchDialog";
import { BalanceAuditPanel } from "./balance-checker";

interface ReconciliationPanelProps {
  bankAccountId: string;
  bankAccountName?: string;
  initialBalance?: number;
}

export function ReconciliationPanel({ bankAccountId, bankAccountName, initialBalance = 0 }: ReconciliationPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOwner, hasPermission } = usePermissions();
  const hasReconcilePermission = isOwner || hasPermission('finance_reconciliation', 'edit') || hasPermission('finance_reconciliation', 'create');
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [mismatchDialog, setMismatchDialog] = useState<{
    open: boolean;
    entryValue: number;
    transactionValue: number;
  }>({ open: false, entryValue: 0, transactionValue: 0 });

  // Fetch unreconciled statement entries
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ["bank-statement-entries", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_entries")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", false)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch unreconciled transactions
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["unreconciled-transactions", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", false)
        .eq("status", "paid")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch reconciled entries with transaction details
  const { data: reconciledEntries = [], isLoading: reconciledLoading } = useQuery({
    queryKey: ["reconciled-entries", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_entries")
        .select(`
          *,
          transaction:financial_transactions!bank_statement_entries_transaction_id_fkey(
            id,
            description,
            amount,
            type
          )
        `)
        .eq("bank_account_id", bankAccountId)
        .eq("is_reconciled", true)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch audited dates for this account
  const { data: auditedDates = [] } = useQuery({
    queryKey: ["audited-dates", bankAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_audits")
        .select("audit_date")
        .eq("bank_account_id", bankAccountId)
        .eq("is_matched", true);

      if (error) throw error;
      return data?.map((a) => a.audit_date) || [];
    },
  });

  const getSelectedEntry = () => entries.find((e) => e.id === selectedEntry);
  const getSelectedTransaction = () => transactions.find((t) => t.id === selectedTransaction);

  const handleReconcileClick = () => {
    if (!selectedEntry || !selectedTransaction) return;

    const entry = getSelectedEntry();
    const transaction = getSelectedTransaction();

    if (!entry || !transaction) return;

    const entryValue = entry.is_credit ? Number(entry.amount) : -Number(entry.amount);
    const transactionValue =
      transaction.type === "income" ? Number(transaction.amount) : -Number(transaction.amount);

    if (Math.abs(Math.abs(entryValue) - Math.abs(transactionValue)) > 0.01) {
      setMismatchDialog({
        open: true,
        entryValue: Math.abs(Number(entry.amount)),
        transactionValue: Number(transaction.amount),
      });
      return;
    }

    executeReconciliation();
  };

  const executeReconciliation = async () => {
    if (!selectedEntry || !selectedTransaction) return;

    setIsReconciling(true);
    try {
      await supabase
        .from("bank_statement_entries")
        .update({
          is_reconciled: true,
          transaction_id: selectedTransaction,
        })
        .eq("id", selectedEntry);

      await supabase
        .from("financial_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
        })
        .eq("id", selectedTransaction);

      toast({ title: "Conciliação realizada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
      queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reconciled-entries"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-totals"] });
      setSelectedEntry(null);
      setSelectedTransaction(null);
    } catch (error: any) {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleAutoReconcile = async () => {
    setIsReconciling(true);
    let matched = 0;

    try {
      for (const entry of entries) {
        const match = transactions.find((t) => {
          const entryAmount = entry.is_credit ? Number(entry.amount) : -Number(entry.amount);
          const transactionAmount = t.type === "income" ? Number(t.amount) : -Number(t.amount);
          return Math.abs(entryAmount - transactionAmount) < 0.01;
        });

        if (match) {
          try {
            await supabase
              .from("bank_statement_entries")
              .update({ is_reconciled: true, transaction_id: match.id })
              .eq("id", entry.id);

            await supabase
              .from("financial_transactions")
              .update({ is_reconciled: true, reconciled_at: new Date().toISOString() })
              .eq("id", match.id);

            matched++;
          } catch (error) {
            console.error("Error reconciling:", error);
          }
        }
      }

      if (matched > 0) {
        toast({ title: `${matched} lançamento(s) conciliado(s) automaticamente!` });
        queryClient.invalidateQueries({ queryKey: ["bank-statement-entries"] });
        queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] });
        queryClient.invalidateQueries({ queryKey: ["reconciled-entries"] });
        queryClient.invalidateQueries({ queryKey: ["reconciliation-totals"] });
      } else {
        toast({
          title: "Nenhuma correspondência encontrada",
          description: "Tente conciliar manualmente",
        });
      }
    } finally {
      setIsReconciling(false);
    }
  };

  const isLoading = entriesLoading || transactionsLoading;
  const canReconcile = selectedEntry && selectedTransaction;
  const hasData = entries.length > 0 && transactions.length > 0;

  return (
    <div className="w-full max-w-full overflow-hidden space-y-3">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs px-2">
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pendentes</span>
            <span className="sm:hidden">Pend.</span>
            {entries.length > 0 && (
              <span className="bg-amber-500/10 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {entries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reconciled" className="flex items-center gap-1.5 text-xs px-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conciliados</span>
            <span className="sm:hidden">Conc.</span>
            {reconciledEntries.length > 0 && (
              <span className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {reconciledEntries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-1.5 text-xs px-2">
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conferência</span>
            <span className="sm:hidden">Conf.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-3">
          {canReconcile && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoReconcile}
                disabled={!hasData || isReconciling}
                className="h-8 text-xs"
              >
                {isReconciling ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                <span className="hidden sm:inline">Conciliar Auto</span>
                <span className="sm:hidden">Auto</span>
              </Button>
              <Button
                size="sm"
                onClick={handleReconcileClick}
                disabled={!canReconcileSelection || isReconciling}
                className="h-8 text-xs"
              >
                {isReconciling ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                <span className="hidden sm:inline">Vincular Selecionados</span>
                <span className="sm:hidden">Vincular</span>
              </Button>
            </div>
          )}

          <ReconciliationPendingListGrouped
            entries={entries}
            transactions={transactions}
            selectedEntry={selectedEntry}
            selectedTransaction={selectedTransaction}
            onSelectEntry={setSelectedEntry}
            onSelectTransaction={setSelectedTransaction}
            isLoading={isLoading}
            onTransactionCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["unreconciled-transactions"] });
            }}
            onRefreshTransactions={() => refetchTransactions()}
            bankAccountId={bankAccountId}
            auditedDates={auditedDates}
          />
        </TabsContent>

        <TabsContent value="reconciled" className="mt-3">
          <Card className="overflow-hidden">
            <CardContent className="pt-4 pb-4 overflow-hidden">
              <ReconciliationHistoryTable
                entries={reconciledEntries}
                isLoading={reconciledLoading}
                bankAccountId={bankAccountId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-3">
          <BalanceAuditPanel
            bankAccountId={bankAccountId}
            bankAccountName={bankAccountName}
            initialBalance={initialBalance}
          />
        </TabsContent>
      </Tabs>

      <ReconciliationMismatchDialog
        open={mismatchDialog.open}
        onOpenChange={(open) => setMismatchDialog((prev) => ({ ...prev, open }))}
        entryValue={mismatchDialog.entryValue}
        transactionValue={mismatchDialog.transactionValue}
        onConfirm={() => {
          setMismatchDialog({ open: false, entryValue: 0, transactionValue: 0 });
          executeReconciliation();
        }}
      />
    </div>
  );
}
