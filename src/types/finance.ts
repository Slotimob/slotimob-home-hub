/**
 * Finance module shared types.
 *
 * Centralizes domain types previously declared inline across
 * `src/components/finance/*` and `src/pages/Finance.tsx`.
 *
 * Row/Insert/Update shapes mirror the Supabase generated types so the
 * service layer (`useFinanceData`) and consuming components stay in sync
 * with the database schema without redefining columns manually.
 */
import type { Database } from "@/integrations/supabase/types";

/** Raw financial transaction row from the database. */
export type Transaction =
  Database["public"]["Tables"]["financial_transactions"]["Row"];

/** Payload used when creating a new financial transaction. */
export type TransactionInput =
  Database["public"]["Tables"]["financial_transactions"]["Insert"];

/** Patch payload used when editing an existing financial transaction. */
export type TransactionUpdate =
  Database["public"]["Tables"]["financial_transactions"]["Update"];

/** Bank account row used across finance dashboards and pickers. */
export type BankAccount =
  Database["public"]["Tables"]["bank_accounts"]["Row"];

/** Financial category row (income/expense classification). */
export type FinancialCategory =
  Database["public"]["Tables"]["financial_categories"]["Row"];

/** Shape of a transaction joined with its category and unit (used in lists). */
export type TransactionWithRelations = Transaction & {
  category?: Pick<FinancialCategory, "id" | "name" | "color"> | null;
  unit?: {
    id: string;
    unit_number: string | null;
    is_standalone: boolean | null;
    property?: { name: string | null } | null;
  } | null;
};

/** Transaction type (income vs expense). */
export type TransactionType = "income" | "expense";

/** Transaction status as used by the UI badges and filters. */
export type TransactionStatus = "paid" | "pending" | "overdue" | "cancelled";

/**
 * Aggregated finance overview for the current filter period, consumed by
 * `FinanceOverviewCards`. All values are in BRL (numeric, not formatted).
 */
export interface FinanceOverview {
  income: number;
  expense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  pendingRepasse: number;
  repasseCount: number;
}
