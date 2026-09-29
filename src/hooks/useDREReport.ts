import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { buildDRESections, dreRegimeFilter } from "@/lib/dre-sections";

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
}

interface DRESection {
  total: number;
  items: CategoryTotal[];
}

export type DRERegime = "gerencial" | "contabil" | "caixa";

export interface DREData {
  regime: DRERegime;
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
}

export function useDREReport(
  selectedYears: string[],
  selectedMonths: string[],
  unitIds?: string[],
  regime: DRERegime = "contabil"
) {
  const effectiveYears = selectedYears.length > 0 ? selectedYears : [String(new Date().getFullYear())];

  return useQuery({
    queryKey: ["dre-report", regime, [...effectiveYears].sort().join(","), [...selectedMonths].sort().join(","), unitIds?.join(",") || "all"],
    queryFn: async (): Promise<DREData> => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          id,
          amount,
          type,
          obligation_type,
          category_id,
          financial_categories (
            id,
            name,
            dre_type
          )
        `)
        // Lançamentos cancelados nunca entram na DRE (ambos os regimes)
        .neq("status", "cancelled");

      // Build date periods for each selected year × month combination
      type Period = { start: string; end: string };
      const periods: Period[] = [];

      for (const yearStr of effectiveYears) {
        const year = parseInt(yearStr, 10);
        if (selectedMonths.length === 0) {
          periods.push({
            start: format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd"),
            end: format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd"),
          });
        } else {
          for (const monthStr of selectedMonths) {
            const monthIdx = parseInt(monthStr, 10) - 1;
            const base = new Date(year, monthIdx, 1);
            periods.push({
              start: format(startOfMonth(base), "yyyy-MM-dd"),
              end: format(endOfMonth(base), "yyyy-MM-dd"),
            });
          }
        }
      }

      const regimeFilter = dreRegimeFilter(regime, periods);
      query = query.or(regimeFilter.or);
      // Regime caixa: só o que foi efetivamente recebido/pago
      if (regimeFilter.paidOnly) query = query.eq("status", "paid");

      // Filter by units if provided
      if (unitIds && unitIds.length > 0) {
        query = query.in("unit_id", unitIds);
      }

      const overallStart = parseDateOnly(periods.reduce((a, p) => (p.start < a ? p.start : a), periods[0].start));
      const overallEnd = parseDateOnly(periods.reduce((a, p) => (p.end > a ? p.end : a), periods[0].end));
      const start = overallStart;
      const end = overallEnd;


      const { data: transactions, error } = await query;

      if (error) throw error;

      const built = buildDRESections((transactions as any[]) || []);

      return {
        regime,
        period: { start, end },
        ...built,
      };
    },
  });
}
