 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todayDateOnly } from "@/lib/date-only";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 import { useWorkspace } from "./useWorkspace";
 import { toast } from "sonner";
 
 export interface LeaseAdjustment {
   id: string;
   lease_id: string;
   previous_value: number;
   new_value: number;
   adjustment_date: string;
   index_used: string;
   index_percentage: number | null;
   notes: string | null;
   created_at: string;
 }
 
 export function useLeaseAdjustments(leaseId: string | null) {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ["lease-adjustments", leaseId],
     queryFn: async () => {
       if (!leaseId || !user) return [];
 
       const { data, error } = await supabase
         .from("lease_adjustments")
         .select("*")
          .eq("lease_id", leaseId)
          .order("adjustment_date", { ascending: false });
 
       if (error) throw error;
       return data as LeaseAdjustment[];
     },
     enabled: !!leaseId && !!user,
   });
 }
 
 export function useDeleteLeaseAdjustment() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({
       adjustmentId,
       leaseId,
       previousValue,
     }: {
       adjustmentId: string;
       leaseId: string;
       previousValue: number;
     }) => {
       if (!user) throw new Error("Usuário não autenticado");
 
       // Step 1: Delete the adjustment record
       const { error: deleteError } = await supabase
         .from("lease_adjustments")
          .delete()
          .eq("id", adjustmentId);
 
       if (deleteError) throw deleteError;
 
       // Step 2: Revert lease rent_amount to previous value
       const { error: updateError } = await supabase
         .from("leases")
          .update({ rent_amount: previousValue })
          .eq("id", leaseId);
 
       if (updateError) throw updateError;
 
       // Step 3: Update future pending transactions to previous value
       const today = todayDateOnly();
       const { data: updatedTx, error: txError } = await supabase
         .from("financial_transactions")
          .update({ amount: previousValue })
          .eq("reference", `lease:${leaseId}`)
         .eq("status", "pending")
         .gte("due_date", today)
         .select("id");
 
       if (txError) {
         console.error("Error updating transactions:", txError);
       }
 
       return { updatedTransactions: updatedTx?.length || 0 };
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ["lease-adjustments", variables.leaseId] });
       queryClient.invalidateQueries({ queryKey: ["leases"] });
       queryClient.invalidateQueries({ queryKey: ["lease-by-unit"] });
       queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
       toast.success("Reajuste excluído e valor revertido!");
     },
     onError: (error: any) => {
       toast.error("Erro ao excluir reajuste", { description: error.message });
     },
   });
 }
export interface UpdateLeaseAdjustmentInput {
  adjustmentId: string;
  leaseId: string;
  /** Somente o mais recente pode alterar valores/data/índice (cascata). */
  isLatest: boolean;
  /** Data do reajuste antes da edição (usada para delimitar a cascata). */
  previousAdjustmentDate: string;
  values: {
    adjustment_date?: string;
    index_used?: string;
    index_percentage?: number | null;
    previous_value?: number;
    new_value?: number;
    notes?: string | null;
  };
}

/**
 * Atualiza um reajuste.
 * - Reajustes antigos (isLatest = false): apenas `notes`, sem cascata.
 * - Reajuste mais recente (isLatest = true): atualiza o registro, o `rent_amount`
 *   da lease e as parcelas pendentes do contrato (cascata).
 */
export function useUpdateLeaseAdjustment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adjustmentId,
      leaseId,
      isLatest,
      previousAdjustmentDate,
      values,
    }: UpdateLeaseAdjustmentInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Histórico antigo: só notas, nunca valores.
      const payload = isLatest ? values : { notes: values.notes ?? null };

      const { error: updateError } = await supabase
        .from("lease_adjustments")
        .update(payload)
        .eq("id", adjustmentId);

      if (updateError) throw updateError;

      if (!isLatest) return { updatedTransactions: 0 };

      let updatedTransactions = 0;

      // Cascata 1: valor vigente do contrato = novo valor do reajuste.
      if (typeof values.new_value === "number") {
        const { error: leaseError } = await supabase
          .from("leases")
          .update({ rent_amount: values.new_value })
          .eq("id", leaseId);

        if (leaseError) throw leaseError;

        const newDate = values.adjustment_date || previousAdjustmentDate;
        const today = todayDateOnly();
        // Nunca mexemos no passado: a cascata começa em hoje ou na vigência, o que for maior.
        const cascadeFrom = newDate > today ? newDate : today;

        // Cascata 2: parcelas pendentes a partir da vigência recebem o novo valor.
        const { data: bumped, error: bumpError } = await supabase
          .from("financial_transactions")
          .update({ amount: values.new_value })
          .eq("reference", `lease:${leaseId}`)
          .eq("status", "pending")
          .gte("due_date", cascadeFrom)
          .select("id");

        if (bumpError) {
          console.error("Erro na cascata de parcelas:", bumpError);
        } else {
          updatedTransactions += bumped?.length || 0;
        }

        // Cascata 3: se a vigência foi adiada, as parcelas que ficaram fora da nova
        // janela voltam para o valor anterior ao reajuste.
        if (
          typeof values.previous_value === "number" &&
          newDate > previousAdjustmentDate
        ) {
          const revertFrom = previousAdjustmentDate > today ? previousAdjustmentDate : today;
          const { data: reverted, error: revertError } = await supabase
            .from("financial_transactions")
            .update({ amount: values.previous_value })
            .eq("reference", `lease:${leaseId}`)
            .eq("status", "pending")
            .gte("due_date", revertFrom)
            .lt("due_date", cascadeFrom)
            .select("id");

          if (revertError) {
            console.error("Erro ao reverter parcelas fora da vigência:", revertError);
          } else {
            updatedTransactions += reverted?.length || 0;
          }
        }
      }

      return { updatedTransactions };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lease-adjustments", variables.leaseId] });
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["lease-by-unit"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      toast.success(
        variables.isLatest
          ? `Reajuste atualizado${result.updatedTransactions ? ` • ${result.updatedTransactions} parcela(s) recalculada(s)` : ""}`
          : "Observações atualizadas"
      );
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar reajuste", { description: error.message });
    },
  });
}
