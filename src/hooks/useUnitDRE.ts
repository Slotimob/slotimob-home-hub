import { buildDRESections } from "@/lib/dre-sections";
import { allocationNotesFor } from "@/lib/lease-multi-unit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
}

interface DRESection {
  total: number;
  items: CategoryTotal[];
}

export interface UnitDREData {
  period: { start: Date; end: Date };
  grossRevenue: DRESection;
  taxDeductions: DRESection;
  netRevenue: number;
  variableCosts: DRESection;
  grossProfit: number;
  salesExpenses: DRESection;
  adminExpenses: DRESection;
  financialExpenses: DRESection;
  operatingProfit: number;
  financialRevenue: DRESection;
  profitDistribution: DRESection;
  uncategorizedRevenue: number;
  uncategorizedExpense: number;
  irrfWithheld: DRESection;
  netResult: number;
  /** "Inclui X% do contrato … (rateio entre N imóveis)" */
  allocationNotes?: string[];
}

export function useUnitDRE(unitId: string | null, startDate?: Date, endDate?: Date) {
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  return useQuery({
    queryKey: ["unit-dre-report", unitId, format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")],
    queryFn: async (): Promise<UnitDREData> => {
      // Fetch all paid transactions for this unit with their categories
      // Por imóvel: lê a view com rateio (contratos com vários imóveis) e soma alloc_amount.
      let query = (supabase as any)
        .from("v_financial_transactions_by_unit")
        .select("id, amount:alloc_amount, type, obligation_type, category_id, lease_id, alloc_factor, is_allocated")
        .eq("status", "paid")
        .gte("paid_date", format(start, "yyyy-MM-dd"))
        .lte("paid_date", format(end, "yyyy-MM-dd"));

      if (unitId) {
        query = query.eq("alloc_unit_id", unitId);
      }

      const { data: rawTx, error } = await query;

      if (error) throw error;
      const catIds = Array.from(new Set(((rawTx as any[]) || []).map((t) => t.category_id).filter(Boolean)));
      const { data: cats } = catIds.length
        ? await supabase.from("financial_categories").select("id, name, dre_type").in("id", catIds)
        : { data: [] as any[] };
      const catById = new Map((cats || []).map((c: any) => [c.id, c]));
      const transactions = ((rawTx as any[]) || []).map((t) => ({
        ...t,
        amount: Number(t.amount) || 0,
        financial_categories: catById.get(t.category_id) ?? null,
      }));
      const allocationNotes = unitId ? await allocationNotesFor(transactions) : [];

      const built = buildDRESections(transactions);

      return {
        period: { start, end },
        ...built,
        allocationNotes,
      };
    },
    enabled: !!unitId || unitId === null, // Allow null to show all units
  });
}
