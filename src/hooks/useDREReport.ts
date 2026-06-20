import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
}

interface DRESection {
  total: number;
  items: CategoryTotal[];
}

export interface DREData {
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
  netResult: number;
}

export function useDREReport(selectedYears: string[], selectedMonths: string[], unitIds?: string[]) {
  const effectiveYears = selectedYears.length > 0 ? selectedYears : [String(new Date().getFullYear())];

  return useQuery({
    queryKey: ["dre-report", [...effectiveYears].sort().join(","), [...selectedMonths].sort().join(","), unitIds?.join(",") || "all"],
    queryFn: async (): Promise<DREData> => {
      let query = supabase
        .from("financial_transactions")
        .select(`
          id,
          amount,
          type,
          category_id,
          financial_categories (
            id,
            name,
            dre_type
          )
        `);

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

      if (periods.length === 1) {
        query = query
          .gte("transaction_date", periods[0].start)
          .lte("transaction_date", periods[0].end);
      } else {
        const orFilter = periods
          .map((p) => `and(transaction_date.gte.${p.start},transaction_date.lte.${p.end})`)
          .join(",");
        query = query.or(orFilter);
      }

      // Filter by units if provided
      if (unitIds && unitIds.length > 0) {
        query = query.in("unit_id", unitIds);
      }

      const overallStart = new Date(periods.reduce((a, p) => (p.start < a ? p.start : a), periods[0].start));
      const overallEnd = new Date(periods.reduce((a, p) => (p.end > a ? p.end : a), periods[0].end));
      const start = overallStart;
      const end = overallEnd;


      const { data: transactions, error } = await query;

      if (error) throw error;

      // Initialize sections
      const sections: Record<string, DRESection> = {
        gross_revenue: { total: 0, items: [] },
        financial_revenue: { total: 0, items: [] },
        tax_deduction: { total: 0, items: [] },
        variable_cost: { total: 0, items: [] },
        sales_expense: { total: 0, items: [] },
        admin_expense: { total: 0, items: [] },
        financial_expense: { total: 0, items: [] },
        profit_distribution: { total: 0, items: [] },
      };

      // Group transactions by category and dre_type
      const categoryTotals: Record<string, { name: string; dreType: string; total: number }> = {};

      transactions?.forEach((tx) => {
        const category = tx.financial_categories;
        if (!category || !category.dre_type) return;

        const key = category.id;
        if (!categoryTotals[key]) {
          categoryTotals[key] = {
            name: category.name,
            dreType: category.dre_type,
            total: 0,
          };
        }
        categoryTotals[key].total += tx.amount;
      });

      // Distribute to sections
      Object.entries(categoryTotals).forEach(([categoryId, data]) => {
        const section = sections[data.dreType];
        if (section) {
          section.items.push({
            categoryId,
            categoryName: data.name,
            total: data.total,
          });
          section.total += data.total;
        }
      });

      // Calculate DRE values
      const grossRevenue = sections.gross_revenue.total;
      const taxDeductions = sections.tax_deduction.total;
      const netRevenue = grossRevenue - taxDeductions;
      
      const variableCosts = sections.variable_cost.total;
      const grossProfit = netRevenue - variableCosts;
      
      const salesExpenses = sections.sales_expense.total;
      const adminExpenses = sections.admin_expense.total;
      const financialExpenses = sections.financial_expense.total;
      const operatingProfit = grossProfit - salesExpenses - adminExpenses - financialExpenses;
      
      const financialRevenue = sections.financial_revenue.total;
      const profitDistribution = sections.profit_distribution.total;
      const netResult = operatingProfit + financialRevenue - profitDistribution;

      return {
        period: { start, end },
        grossRevenue: sections.gross_revenue,
        taxDeductions: sections.tax_deduction,
        netRevenue,
        variableCosts: sections.variable_cost,
        grossProfit,
        salesExpenses: sections.sales_expense,
        adminExpenses: sections.admin_expense,
        financialExpenses: sections.financial_expense,
        operatingProfit,
        financialRevenue: sections.financial_revenue,
        profitDistribution: sections.profit_distribution,
        netResult,
      };
    },
  });
}
