 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Checkbox } from "@/components/ui/checkbox";
 import { TrendingUp, Loader2 } from "lucide-react";
 import { addMonths, format } from "date-fns";
 import { useUpdateLease } from "@/hooks/useLeases";
 import { useUpdateFutureProjections } from "@/hooks/useLeaseFinancialProjection";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
 
 const formatCurrency = (value: number) =>
   value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
 
 interface EarlyRentAdjustmentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   lease: {
     id: string;
     rent_amount: number;
     next_adjustment_date?: string | null;
     unit?: { unit_number: string } | null;
     tenant?: { name: string } | null;
   } | null;
   onSuccess?: () => void;
 }
 
 export function EarlyRentAdjustmentDialog({
   open,
   onOpenChange,
   lease,
   onSuccess,
 }: EarlyRentAdjustmentDialogProps) {
   const updateLease = useUpdateLease();
   const updateProjections = useUpdateFutureProjections();
  const { user } = useAuth();
  const queryClient = useQueryClient();
 
   const [newRentAmount, setNewRentAmount] = useState("");
   const [scheduleNextAdjustment, setScheduleNextAdjustment] = useState(true);
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   useEffect(() => {
     if (open && lease) {
       setNewRentAmount(lease.rent_amount.toString());
       setScheduleNextAdjustment(true);
     }
   }, [open, lease?.rent_amount]);
 
   const handleClose = () => {
     setNewRentAmount("");
     setScheduleNextAdjustment(true);
     setIsSubmitting(false);
     onOpenChange(false);
   };
 
   const handleSave = async () => {
     if (!lease) return;
 
     const amount = parseFloat(newRentAmount.replace(/[^\d.,]/g, "").replace(",", "."));
     if (isNaN(amount) || amount <= 0) {
       toast.error("Informe um valor válido para o aluguel.");
       return;
     }
 
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

     setIsSubmitting(true);
 
     try {
      // Step 0: Insert adjustment history record
      const percentChange = lease.rent_amount > 0
        ? ((amount - lease.rent_amount) / lease.rent_amount) * 100
        : 0;

      const { error: historyError } = await supabase
        .from("lease_adjustments")
        .insert({
          broker_id: user.id,
          lease_id: lease.id,
          adjustment_date: new Date().toISOString().split("T")[0],
          previous_value: lease.rent_amount,
          new_value: amount,
          index_used: "Manual",
          index_percentage: percentChange,
          notes: scheduleNextAdjustment ? "Reajuste antecipado aplicado manualmente" : null,
        });

      if (historyError) {
        console.error("Error saving adjustment history:", historyError);
        // Don't throw - continue with the rest
      }

      // Step 1: Update lease rent_amount
       const leaseUpdateData: Record<string, unknown> = {
         rent_amount: amount,
       };
 
       // Optionally schedule next adjustment for 12 months
       if (scheduleNextAdjustment) {
         const nextDate = format(addMonths(new Date(), 12), "yyyy-MM-dd");
         leaseUpdateData.next_adjustment_date = nextDate;
       }
 
       await updateLease.mutateAsync({
         id: lease.id,
         data: leaseUpdateData as any,
       });
 
       // Step 2: Update future pending transactions
       const result = await updateProjections.mutateAsync({
         leaseId: lease.id,
         newAmount: amount,
         effectiveDate: new Date(),
       });
 
       toast.success("Dados atualizados e lançamentos futuros recalculados!", {
         description: `Novo valor: ${formatCurrency(amount)} • ${result.updated} parcelas atualizadas`,
       });
 
      // Invalidate lease adjustments query to update timeline
      queryClient.invalidateQueries({ queryKey: ["lease-adjustments", lease.id] });

       onSuccess?.();
       handleClose();
     } catch (err: any) {
       toast.error("Erro ao aplicar reajuste", {
         description: err.message || "Tente novamente.",
       });
     }
    setIsSubmitting(false);
   };
 
   if (!lease) return null;
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
       <DialogContent className="max-w-sm">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-primary" />
             Aplicar Reajuste Agora
           </DialogTitle>
           <DialogDescription>
             {lease.unit?.unit_number} • {lease.tenant?.name}
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           <div className="p-3 rounded-lg bg-muted/50 text-sm">
             <div className="flex justify-between mb-1">
               <span className="text-muted-foreground">Valor Atual</span>
               <span className="font-medium">{formatCurrency(lease.rent_amount)}</span>
             </div>
           </div>
 
           <div className="space-y-2">
             <Label>Novo Valor do Aluguel</Label>
             <Input
               type="text"
               placeholder="R$ 0,00"
               value={newRentAmount}
               onChange={(e) => setNewRentAmount(e.target.value)}
             />
           </div>
 
           <div className="flex items-center space-x-2">
             <Checkbox
               id="schedule-next"
               checked={scheduleNextAdjustment}
               onCheckedChange={(v) => setScheduleNextAdjustment(!!v)}
             />
             <Label htmlFor="schedule-next" className="text-sm font-normal cursor-pointer">
               Definir próximo reajuste para daqui a 12 meses
             </Label>
           </div>
 
           <p className="text-xs text-muted-foreground">
             Ao salvar, o sistema atualizará automaticamente todas as parcelas futuras com status "Pendente" para o novo valor.
           </p>
         </div>
 
         <DialogFooter className="gap-2 sm:gap-0">
           <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
             Cancelar
           </Button>
           <Button onClick={handleSave} disabled={isSubmitting}>
             {isSubmitting ? (
               <Loader2 className="h-4 w-4 animate-spin mr-2" />
             ) : (
               <TrendingUp className="h-4 w-4 mr-2" />
             )}
             Aplicar Reajuste
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }