import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RentPaymentTransaction } from "@/components/finance/RegisterRentPaymentDialog";

export type NextPendingRent = RentPaymentTransaction & { competency_period?: string | null };

/** Aluguel pendente mais antigo do contrato (linha de aluguel ou saldo). */
export function useNextPendingRent(leaseId: string | null | undefined) {
  return useQuery({
    queryKey: ["lease-next-pending-rent", leaseId],
    queryFn: async (): Promise<NextPendingRent | null> => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, type, amount, due_date, settlement_group_id, obligation_type, description, bank_account_id, status, competency_period")
        .eq("lease_id", leaseId!)
        .eq("type", "income")
        .eq("status", "pending")
        .or("obligation_type.is.null,obligation_type.in.(rent,rent_balance)")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as NextPendingRent) ?? null;
    },
    enabled: !!leaseId,
  });
}
