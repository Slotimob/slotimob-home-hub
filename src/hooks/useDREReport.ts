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

export function useDREReport(startDate?: Date, endDate?: Date, unitId?: string) {
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  return useQuery({
    queryKey: ["dre-report", format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"), unitId || "all"],
    queryFn: async (): Promise<DREData> => {
      // Fetch all transactions by competency (transaction_date) - accrual basis accounting
      // This includes ALL transactions regardless of payment status (paid/pending)
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
        `)
        .gte("transaction_date", format(start, "yyyy-MM-dd"))
        .lte("transaction_date", format(end, "yyyy-MM-dd"));

      // Filter by unit if provided
      if (unitId) {
        query = query.eq("unit_id", unitId);
      }

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
