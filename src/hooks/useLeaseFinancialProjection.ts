import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { addMonths, setDate, format, differenceInMonths, lastDayOfMonth, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface LeaseProjectionParams {
  leaseId: string;
  unitId: string;
  tenantContactId: string;
  rentAmount: number;
  dueDay: number;
  startDate: string;
  endDate?: string | null;
  propertyId?: string | null;
}

interface FinancialTransaction {
  broker_id: string;
  unit_id: string;
  contact_id: string;
  type: "income";
  description: string;
  amount: number;
  transaction_date: string;
  due_date: string;
  status: "pending";
  obligation_type: string;
  competency_period: string;
  reference: string;
  property_id?: string | null;
  category_id?: string | null;
}

/**
 * Calculates the correct due date for a given month, handling edge cases
 * like months with fewer days (e.g., day 31 in February)
 */
function calculateDueDate(baseDate: Date, dueDay: number): Date {
  const lastDay = getDate(lastDayOfMonth(baseDate));
  const actualDay = Math.min(dueDay, lastDay);
  return setDate(baseDate, actualDay);
}

/**
 * Hook for generating financial projections (rent installments) when a lease is created
 */
export function useLeaseFinancialProjection() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();

  const generateProjections = useMutation({
    mutationFn: async (params: LeaseProjectionParams): Promise<{ count: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      const {
        leaseId,
        unitId,
        tenantContactId,
        rentAmount,
        dueDay,
        startDate,
        endDate,
        propertyId,
      } = params;

      // Step 1: Idempotency check - verify if transactions already exist for this lease
      const { data: existingTransactions, error: checkError } = await supabase
        .from("financial_transactions")
        .select("id")
        .eq("reference", `lease:${leaseId}`)
        .limit(1);

      if (checkError) throw checkError;

      if (existingTransactions && existingTransactions.length > 0) {
        console.log("Transactions already exist for this lease, skipping generation");
        return { count: 0 };
      }

      // Step 2: Find the "Receita de Aluguel" category
      const { data: rentCategory, error: catError } = await supabase
        .from("financial_categories")
        .select("id")
        .eq("name", "Receita de Aluguel")
        .eq("type", "income")
        .maybeSingle();

      if (catError) throw catError;

      const categoryId = rentCategory?.id || null;

      // Step 3: Calculate the number of months to project
      const start = new Date(startDate);
      let end: Date;

      if (endDate) {
        end = new Date(endDate);
      } else {
        // Default to 12 months if no end date is specified
        end = addMonths(start, 12);
      }

      const totalMonths = differenceInMonths(end, start) + 1;
      const monthsToGenerate = Math.min(Math.max(totalMonths, 1), 60); // Cap at 60 months (5 years)

      // Step 4: Generate the transaction array
      const transactions: FinancialTransaction[] = [];

      for (let i = 0; i < monthsToGenerate; i++) {
        const currentMonth = addMonths(start, i);
        const dueDate = calculateDueDate(currentMonth, dueDay);
        
        // Skip if due date is before start date (for first month edge case)
        if (i === 0 && dueDate < start) {
          continue;
        }

        const competencyPeriod = format(currentMonth, "yyyy-MM");
        const monthLabel = format(currentMonth, "MMMM/yyyy", { locale: ptBR });
        // Capitalize first letter for proper display
        const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

        transactions.push({
          broker_id: effectiveBrokerId || user.id,
          unit_id: unitId,
          contact_id: tenantContactId,
          type: "income",
          description: `Aluguel ${capitalizedMonthLabel}`,
          amount: rentAmount,
          transaction_date: format(dueDate, "yyyy-MM-dd"),
          due_date: format(dueDate, "yyyy-MM-dd"),
          status: "pending",
          obligation_type: "rent",
          competency_period: competencyPeriod,
          reference: `lease:${leaseId}`,
          property_id: propertyId || null,
          category_id: categoryId,
        });
      }

      if (transactions.length === 0) {
        return { count: 0 };
      }

      // Step 5: Bulk insert all transactions atomically
      const { error: insertError } = await supabase
        .from("financial_transactions")
        .insert(transactions);

      if (insertError) throw insertError;

      return { count: transactions.length };
    },
    onSuccess: () => {
      // Invalidate financial queries to reflect new transactions
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });

  return {
    generateProjections,
    isGenerating: generateProjections.isPending,
  };
}

/**
 * Utility to delete all projected transactions for a lease
 * Useful when a lease is terminated or canceled
 */
export function useDeleteLeaseProjections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaseId: string): Promise<{ deleted: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      // Only delete pending transactions (not paid ones)
      const { data, error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("reference", `lease:${leaseId}`)
        .eq("status", "pending")
        .select("id");

      if (error) throw error;

      return { deleted: data?.length || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

/**
 * Hook to update future pending transactions when rent amount changes
 */
export function useUpdateFutureProjections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaseId,
      newAmount,
      effectiveDate,
    }: {
      leaseId: string;
      newAmount: number;
      effectiveDate: Date;
    }): Promise<{ updated: number }> => {
      if (!user) throw new Error("Usuário não autenticado");

      const effectiveDateStr = format(effectiveDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("financial_transactions")
        .update({ amount: newAmount })
        .eq("broker_id", user.id)
        .eq("reference", `lease:${leaseId}`)
        .eq("status", "pending")
        .gte("due_date", effectiveDateStr)
        .select("id");

      if (error) throw error;

      return { updated: data?.length || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

/**
 * Hook to count future pending transactions for a lease
 * Useful for showing preview before termination
 */
export function useCountFutureProjections() {
  const { user } = useAuth();

  const countProjections = async (leaseId: string, fromDate: string): Promise<number> => {
    if (!user) return 0;

    const { count, error } = await supabase
      .from("financial_transactions")
      .select("id", { count: "exact", head: true })
      .eq("broker_id", user.id)
      .eq("reference", `lease:${leaseId}`)
      .eq("status", "pending")
      .gte("due_date", fromDate);

    if (error) {
      console.error("Error counting projections:", error);
      return 0;
    }

    return count || 0;
  };

  return { countProjections };
}
