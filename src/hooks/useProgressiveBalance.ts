import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BankAccountWithBalance {
  id: string;
  name: string;
  bank_name: string | null;
  color: string | null;
  initial_balance: number;
  // Calculated values
  realBalance: number;
  projectedBalance: number;
  pendingIncome: number;
  pendingExpenses: number;
  reconciledIncome: number;
  reconciledExpenses: number;
  hasCashFlowRisk: boolean;
}

interface TransactionSummary {
  bank_account_id: string;
  type: string;
  is_reconciled: boolean;
  total: number;
}

/**
 * Progressive Balance Hook
 * 
 * Calculates bank account balances dynamically:
 * - Real Balance = Initial Balance + Reconciled Income - Reconciled Expenses
 * - Projected Balance = Real Balance + Pending Income - Pending Expenses
 * 
 * This ensures the real balance matches the bank app cent-for-cent.
 */
export function useProgressiveBalance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["bank-accounts-progressive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name, color, initial_balance, balance, is_default")
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: transactionSummaries, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["transaction-summaries-progressive"],
    queryFn: async () => {
      // Get aggregated transaction data per account, type, and reconciliation status
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("bank_account_id, type, is_reconciled, amount, status");

      if (error) throw error;

      // Group and sum transactions
      const summaries: Record<string, TransactionSummary[]> = {};
      
      data?.forEach((tx) => {
        if (!tx.bank_account_id) return;
        
        if (!summaries[tx.bank_account_id]) {
          summaries[tx.bank_account_id] = [];
        }
        
        // Consider reconciled OR paid as "confirmed" for balance calculation
        const isConfirmed = tx.is_reconciled || tx.status === 'paid';
        
        // Find or create summary entry
        const key = `${tx.type}-${isConfirmed}`;
        let existing = summaries[tx.bank_account_id].find(
          s => `${s.type}-${s.is_reconciled}` === key
        );
        
        if (!existing) {
          existing = {
            bank_account_id: tx.bank_account_id,
            type: tx.type,
            is_reconciled: isConfirmed,
            total: 0,
          };
          summaries[tx.bank_account_id].push(existing);
        }
        
        existing.total += Number(tx.amount);
      });

      return summaries;
    },
    enabled: !!accounts && accounts.length > 0,
  });

  // Calculate progressive balances for each account
  const accountsWithBalances: BankAccountWithBalance[] = accounts?.map((account) => {
    const accountSummaries = transactionSummaries?.[account.id] || [];
    const initialBalance = Number(account.initial_balance) || 0;

    // Reconciled (confirmed) transactions
    const reconciledIncome = accountSummaries
      .filter(s => s.type === 'income' && s.is_reconciled)
      .reduce((sum, s) => sum + s.total, 0);
    
    const reconciledExpenses = accountSummaries
      .filter(s => s.type === 'expense' && s.is_reconciled)
      .reduce((sum, s) => sum + s.total, 0);

    // Pending transactions
    const pendingIncome = accountSummaries
      .filter(s => s.type === 'income' && !s.is_reconciled)
      .reduce((sum, s) => sum + s.total, 0);
    
    const pendingExpenses = accountSummaries
      .filter(s => s.type === 'expense' && !s.is_reconciled)
      .reduce((sum, s) => sum + s.total, 0);

    // Calculate balances
    const realBalance = initialBalance + reconciledIncome - reconciledExpenses;
    const projectedBalance = realBalance + pendingIncome - pendingExpenses;

    // Cash flow risk: positive real balance but negative projected
    const hasCashFlowRisk = realBalance >= 0 && projectedBalance < 0;

    return {
      id: account.id,
      name: account.name,
      bank_name: account.bank_name,
      color: account.color,
      initial_balance: initialBalance,
      realBalance,
      projectedBalance,
      pendingIncome,
      pendingExpenses,
      reconciledIncome,
      reconciledExpenses,
      hasCashFlowRisk,
    };
  }) || [];

  // Quick reconciliation mutation
  const reconcileMutation = useMutation({
    mutationFn: async ({ transactionId, reconcile }: { transactionId: string; reconcile: boolean }) => {
      const updates: any = {
        is_reconciled: reconcile,
        reconciled_at: reconcile ? new Date().toISOString() : null,
      };

      // If reconciling, also mark as paid if pending
      if (reconcile) {
        updates.status = 'paid';
        updates.paid_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from("financial_transactions")
        .update(updates)
        .eq("id", transactionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.reconcile ? "Lançamento conciliado!" : "Conciliação removida",
        description: variables.reconcile 
          ? "O saldo em conta foi atualizado." 
          : "O lançamento voltou para pendente.",
      });
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-summaries-progressive"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-progressive"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao conciliar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Total balances across all accounts
  const totals = accountsWithBalances.reduce(
    (acc, account) => ({
      realBalance: acc.realBalance + account.realBalance,
      projectedBalance: acc.projectedBalance + account.projectedBalance,
      pendingIncome: acc.pendingIncome + account.pendingIncome,
      pendingExpenses: acc.pendingExpenses + account.pendingExpenses,
    }),
    { realBalance: 0, projectedBalance: 0, pendingIncome: 0, pendingExpenses: 0 }
  );

  const hasCashFlowRisk = totals.realBalance >= 0 && totals.projectedBalance < 0;

  return {
    accounts: accountsWithBalances,
    totals: { ...totals, hasCashFlowRisk },
    isLoading: isLoadingAccounts || isLoadingTransactions,
    reconcileTransaction: reconcileMutation.mutate,
    isReconciling: reconcileMutation.isPending,
  };
}
