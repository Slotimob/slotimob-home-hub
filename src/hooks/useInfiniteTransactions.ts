import { leaseUnitFilter } from "@/hooks/useLeases";
import { todayInSaoPauloDateOnly } from "@/lib/date-only";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransactionFilters } from "@/pages/FinanceTransactions";

const PAGE_SIZE = 20;

export type SortField =
  | "is_reconciled"
  | "type"
  | "description"
  | "unit"
  | "category"
  | "transaction_date"
  | "due_date"
  | "amount"
  | "status";
export type SortOrder = "asc" | "desc" | null;

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/** Ordenação padrão: vencimento crescente, sem vencimento por último. */
export const DEFAULT_SORT: SortConfig = { field: "due_date", order: "asc" };

/**
 * Coluna enviada ao PostgREST. Unidade e Categoria ordenam pela relação to-one
 * (sintaxe `alias(coluna)`, validada contra o PostgREST do projeto).
 */
const SORT_COLUMNS: Record<SortField, string> = {
  is_reconciled: "is_reconciled",
  type: "type",
  description: "description",
  unit: "unit(unit_number)",
  category: "category(name)",
  transaction_date: "transaction_date",
  due_date: "due_date",
  amount: "amount",
  status: "status",
};

export function useInfiniteTransactions(
  filters: TransactionFilters, 
  userId: string | undefined,
  sortConfig?: SortConfig
) {
  return useInfiniteQuery({
    queryKey: ["infinite-transactions", filters, userId, sortConfig],
    queryFn: async ({ pageParam = 0 }) => {
      // C2: contratos em que o imóvel filtrado entra por lease_units (adicional/fração).
      // Os lançamentos ficam com unit_id do principal; trazemos também pelo lease_id.
      const leaseShares = new Map<string, number>();
      if (filters.unitId) {
        const { data: leases } = await supabase
          .from("leases")
          .select("id, unit_id, lease_units(unit_id, share_percent)")
          .or(await leaseUnitFilter(filters.unitId));
        for (const l of (leases as any[]) || []) {
          const rows = (l.lease_units || []).filter((r: any) => r.unit_id === filters.unitId);
          const share = rows.length
            ? rows.reduce((s: number, r: any) => s + (r.share_percent == null ? 100 : Number(r.share_percent)), 0)
            : 100;
          leaseShares.set(l.id, share);
        }
      }

      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(id, name, color, icon),
          bank_account:bank_accounts(id, name, bank_name),
          unit:units(id, unit_number, is_standalone, property:properties(name)),
          lease:leases!financial_transactions_lease_id_fkey(subdivision:unit_subdivisions!leases_unit_subdivision_id_fkey(label))
        `);

      // Apply sorting (servidor) + desempate fixo para a paginação não repetir/pular linhas
      const sort = sortConfig?.order ? sortConfig : DEFAULT_SORT;
      const ascending = sort.order === "asc";
      if (sort.field !== "due_date") {
        query = query.order(SORT_COLUMNS[sort.field] as any, { ascending, nullsFirst: false });
      } else {
        query = query.order("due_date", { ascending, nullsFirst: false });
      }
      query = query
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("transaction_date", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

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
        const todaySP = todayInSaoPauloDateOnly();
        if (filters.status === "overdue") {
          query = query.or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${todaySP})`);
        } else if (filters.status === "pending") {
          query = query.eq("status", "pending").or(`due_date.gte.${todaySP},due_date.is.null`);
        } else {
          query = query.eq("status", filters.status);
        }
      }
      if (filters.categoryId !== "all") {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.unitId) {
        const ids = Array.from(leaseShares.keys());
        query = ids.length
          ? query.or(`unit_id.eq.${filters.unitId},lease_id.in.(${ids.join(",")})`)
          : query.eq("unit_id", filters.unitId);
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
      
      const rows = (data || []).map((t: any) => {
        if (!filters.unitId || t.unit_id === filters.unitId || !t.lease_id || !leaseShares.has(t.lease_id)) return t;
        return { ...t, via_lease_share_percent: leaseShares.get(t.lease_id) };
      });
      return {
        data: rows,
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!userId,
  });
}
