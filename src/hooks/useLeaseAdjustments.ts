 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
       const today = new Date().toISOString().split("T")[0];
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