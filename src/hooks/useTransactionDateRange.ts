import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, endOfMonth, startOfMonth, parseISO } from "date-fns";

interface DateRangeResult {
  minDate: Date | null;
  maxDate: Date | null;
  isLoading: boolean;
}

/**
 * Hook to fetch the min and max transaction_date from financial_transactions
 * Optionally filters by unitId
 * Always extends maxDate to end of next year for planning purposes
 */
export function useTransactionDateRange(unitId?: string): DateRangeResult {
  const { data, isLoading } = useQuery({
    queryKey: ["transaction-date-range", unitId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("financial_transactions")
        .select("transaction_date");

      if (unitId) {
        query = query.eq("unit_id", unitId);
      }

      // Get all transaction dates to find min/max
      const { data: transactions, error } = await query;

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return { minDate: null, maxDate: null };
      }

      // Find min and max dates
      const dates = transactions
        .map(t => t.transaction_date)
        .filter(Boolean)
        .map(d => parseDateOnly(d))
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length === 0) {
        return { minDate: null, maxDate: null };
      }

      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      return {
        minDate: startOfMonth(minDate),
        maxDate: endOfMonth(maxDate),
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Always extend to end of next year for planning
  const now = new Date();
  const endOfNextYear = new Date(now.getFullYear() + 1, 11, 31);

  return {
    minDate: data?.minDate || null,
    maxDate: data?.maxDate ? 
      (data.maxDate > endOfNextYear ? data.maxDate : endOfNextYear) : 
      endOfNextYear,
    isLoading,
  };
}
