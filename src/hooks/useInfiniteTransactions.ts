import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransactionFilters } from "@/pages/FinanceTransactions";

const PAGE_SIZE = 20;

export type SortField = "transaction_date" | "description" | "amount" | "category";
export type SortOrder = "asc" | "desc" | null;

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export function useInfiniteTransactions(
  filters: TransactionFilters, 
  userId: string | undefined,
  sortConfig?: SortConfig
) {
  return useInfiniteQuery({
    queryKey: ["infinite-transactions", filters, userId, sortConfig],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(id, name, color, icon),
          bank_account:bank_accounts(id, name, bank_name),
          unit:units(id, unit_number, is_standalone, property:properties(name))
        `);

      // Apply sorting
      if (sortConfig?.order) {
        if (sortConfig.field === "category") {
          // For category, we need to sort by the joined field
          // Supabase doesn't support sorting by joined fields directly in the same query
          // So we sort by category_id as a workaround, then we'll do client re-fetch
          query = query.order("category_id", { ascending: sortConfig.order === "asc", nullsFirst: false });
        } else {
          query = query.order(sortConfig.field, { ascending: sortConfig.order === "asc" });
        }
      } else {
        // Default sort by transaction_date desc
        query = query.order("transaction_date", { ascending: false });
      }

      // Apply pagination
      query = query.range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (filters.type !== "all") {
        if (filters.type === "transfer") {
          // Filter for transfers only
          query = query.eq("obligation_type", "transfer");
        } else {
          query = query.eq("type", filters.type);
        }
      }
      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.categoryId !== "all") {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.unitId) {
        query = query.eq("unit_id", filters.unitId);
      }
      if (filters.bankAccountId) {
        query = query.eq("bank_account_id", filters.bankAccountId);
      }
      if (filters.issueDateFrom) {
        query = query.gte("transaction_date", filters.issueDateFrom);
      }
      if (filters.issueDateTo) {
        query = query.lte("transaction_date", filters.issueDateTo);
      }
      if (filters.dueDateFrom) {
        query = query.gte("due_date", filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        query = query.lte("due_date", filters.dueDateTo);
      }
      if (filters.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }
      if (filters.reconciled === "reconciled") {
        query = query.eq("is_reconciled", true);
      } else if (filters.reconciled === "not_reconciled") {
        query = query.or("is_reconciled.is.null,is_reconciled.eq.false");
      }
      // Hide transfers filter
      if (filters.hideTransfers) {
        query = query.not("obligation_type", "eq", "transfer");
      }
      // Asset expense category filter
      if (filters.assetExpenseCategory === "uncategorized") {
        query = query.is("asset_expense_category", null).not("unit_id", "is", null);
      } else if (filters.assetExpenseCategory && filters.assetExpenseCategory !== "all") {
        query = query.eq("asset_expense_category", filters.assetExpenseCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return {
        data: data || [],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!userId,
  });
}
