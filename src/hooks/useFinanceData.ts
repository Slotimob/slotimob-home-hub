/**
 * Finance Service Layer
 * ---------------------
 * Centralizes Supabase queries/mutations for the Finance overview module.
 * Components in `src/components/finance/*` should consume these hooks
 * instead of issuing inline `supabase.from(...)` calls.
 *
 * QueryKeys, queryFns and invalidation patterns mirror what previously lived
 * inside the components, so cache behavior is unchanged.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type {
  BankAccount,
  FinanceOverview,
  Transaction,
  TransactionInput,
  TransactionUpdate,
  TransactionWithRelations,
} from "@/types/finance";

/* ─── useFinanceOverview ───────────────────────────────────────────── */

/**
 * Aggregated income/expense/balance/pending totals for the dashboard's
 * "Overview Cards". Matches the legacy queryKey
 * `["finance-overview", monthStart, monthEnd, unitId]` so cache hits are
 * preserved during the refactor.
 *
 * `bankAccountId` is accepted as a future-friendly parameter but only
 * appended to the queryKey when provided to keep the existing cache key
 * shape (and therefore the cache itself) untouched for current callers.
 */
export function useFinanceOverview(
  dateFrom?: string,
  dateTo?: string,
  unitId?: string,
  bankAccountId?: string,
) {
  const currentDate = new Date();
  const monthStart = dateFrom || format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = dateTo || format(endOfMonth(currentDate), "yyyy-MM-dd");

  const queryKey: unknown[] = ["finance-overview", monthStart, monthEnd, unitId];
  if (bankAccountId) queryKey.push(bankAccountId);

  return useQuery<FinanceOverview>({
    queryKey,
    queryFn: async () => {
      // Fetch all transactions for the period — Cash-Flow perspective (due_date)
      let allTransactionsQuery = supabase
        .from("financial_transactions")
        .select("amount, type, status, is_reconciled")
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      if (unitId) allTransactionsQuery = allTransactionsQuery.eq("unit_id", unitId);
      if (bankAccountId)
        allTransactionsQuery = allTransactionsQuery.eq("bank_account_id", bankAccountId);

      const { data: allTransactions } = await allTransactionsQuery;

      // Master rule: reconciled rows count as effectively paid, regardless of status.
      const isEffectivelyPaid = (t: { status: string; is_reconciled: boolean | null }) =>
        t.status === "paid" || t.is_reconciled === true;
      const isEffectivelyPending = (t: { status: string; is_reconciled: boolean | null }) =>
        t.status !== "paid" && t.is_reconciled !== true;

      const incomes =
        allTransactions?.filter((t) => t.type === "income" && isEffectivelyPaid(t)) || [];
      const expenses =
        allTransactions?.filter((t) => t.type === "expense" && isEffectivelyPaid(t)) || [];
      const pendingIncomes =
        allTransactions?.filter((t) => t.type === "income" && isEffectivelyPending(t)) || [];
      const pendingExpenses =
        allTransactions?.filter((t) => t.type === "expense" && isEffectivelyPending(t)) || [];

      // Pending "Repasse a Proprietário" detection
      let repasseQuery = supabase
        .from("financial_transactions")
        .select(`amount, financial_categories!inner(name)`)
        .eq("type", "expense")
        .eq("status", "pending")
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      if (unitId) repasseQuery = repasseQuery.eq("unit_id", unitId);
      if (bankAccountId) repasseQuery = repasseQuery.eq("bank_account_id", bankAccountId);

      const { data: repasseData } = await repasseQuery;
      const pendingRepasses =
        repasseData?.filter((t: any) =>
          t.financial_categories?.name?.toLowerCase().includes("repasse"),
        ) || [];
      const totalPendingRepasse = pendingRepasses.reduce(
        (sum: number, t: any) => sum + Number(t.amount),
        0,
      );

      const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingIncome = pendingIncomes.reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingExpense = pendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        pendingIncome,
        pendingExpense,
        pendingRepasse: totalPendingRepasse,
        repasseCount: pendingRepasses.length,
      };
    },
  });
}

/* ─── useRecentTransactions ────────────────────────────────────────── */

/**
 * Recent transactions list for the dashboard widget. Preserves the legacy
 * queryKey `["finance-recent-transactions", unitId]` and the join shape
 * (category + unit + property) so the consumer renders identically.
 */
export function useRecentTransactions(unitId?: string, limit: number = 5) {
  return useQuery<TransactionWithRelations[]>({
    queryKey: ["finance-recent-transactions", unitId, limit],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select(
          `
          *,
          category:financial_categories(id, name, color),
          unit:units(id, unit_number, is_standalone, property:properties(name))
        `,
        )
        .order("transaction_date", { ascending: false })
        .limit(limit);

      if (unitId) query = query.eq("unit_id", unitId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TransactionWithRelations[];
    },
  });
}

/* ─── useBankAccounts ──────────────────────────────────────────────── */

/**
 * Simple ordered list of the user's bank accounts. Mirrors the legacy
 * queryKey `["bank-accounts"]` used by `CreateTransactionDialog` so the
 * existing cache is shared.
 */
export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ─── useTransactionMutations ──────────────────────────────────────── */

/**
 * Centralized create/update/delete mutations for `financial_transactions`.
 *
 * Each mutation invalidates the set of queryKeys that legacy components
 * already invalidate after a transaction change. This keeps existing
 * dashboards (overview cards, recent list, bank balances, cash-flow
 * charts, reconciliation panels) in sync regardless of which component
 * triggered the mutation.
 *
 * NOTE: Existing callers that still do inline `.insert()` continue to
 * work — this hook is opt-in for new code paths and future refactors.
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const invalidateFinanceCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    queryClient.invalidateQueries({ queryKey: ["finance-recent-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["finance-cash-flow-chart-analytical"] });
    queryClient.invalidateQueries({ queryKey: ["finance-cash-flow-per-bank"] });
    queryClient.invalidateQueries({ queryKey: ["finance-cash-flow-movement"] });
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["bank-accounts-progressive"] });
    queryClient.invalidateQueries({ queryKey: ["bank-accounts-summary"] });
  };

  const createTransaction = useMutation({
    mutationFn: async (input: TransactionInput): Promise<Transaction> => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: invalidateFinanceCaches,
  });

  const updateTransaction = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TransactionUpdate;
    }): Promise<Transaction> => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: invalidateFinanceCaches,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateFinanceCaches,
  });

  return { createTransaction, updateTransaction, deleteTransaction };
}
