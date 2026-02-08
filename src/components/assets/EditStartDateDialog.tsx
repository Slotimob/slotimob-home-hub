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
 import { Calendar, Loader2, Check } from "lucide-react";
 import { format, parseISO } from "date-fns";
 import { useUpdateLease } from "@/hooks/useLeases";
 import { toast } from "sonner";
 
 interface EditStartDateDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   lease: {
     id: string;
     start_date: string;
     unit?: { unit_number: string } | null;
     tenant?: { name: string } | null;
   } | null;
   onSuccess?: () => void;
 }
 
 export function EditStartDateDialog({
   open,
   onOpenChange,
   lease,
   onSuccess,
 }: EditStartDateDialogProps) {
   const updateLease = useUpdateLease();
 
   const [startDate, setStartDate] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
 
   useEffect(() => {
     if (open && lease) {
       setStartDate(format(parseISO(lease.start_date), "yyyy-MM-dd"));
     }
   }, [open, lease?.start_date]);
 
   const handleClose = () => {
     setStartDate("");
     setIsSubmitting(false);
     onOpenChange(false);
   };
 
   const handleSave = async () => {
     if (!lease || !startDate) return;
 
     setIsSubmitting(true);
     try {
       await updateLease.mutateAsync({
         id: lease.id,
         data: { start_date: startDate },
       });
 
       toast.success("Data de início atualizada!", {
         description: `Nova data: ${format(parseISO(startDate), "dd/MM/yyyy")}`,
       });
 
       onSuccess?.();
       handleClose();
     } catch (err: any) {
       toast.error("Erro ao atualizar data", {
         description: err.message || "Tente novamente.",
       });
     } finally {
       setIsSubmitting(false);
     }
   };
 
   if (!lease) return null;
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
       <DialogContent className="max-w-sm">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5 text-primary" />
             Editar Data de Início
           </DialogTitle>
           <DialogDescription>
             {lease.unit?.unit_number} • {lease.tenant?.name}
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4">
           <div className="space-y-2">
             <Label>Data de Início do Contrato</Label>
             <Input
               type="date"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
             />
           </div>
 
           <p className="text-xs text-muted-foreground">
             Esta data define o início oficial do contrato de locação.
           </p>
         </div>
 
         <DialogFooter className="gap-2 sm:gap-0">
           <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
             Cancelar
           </Button>
           <Button onClick={handleSave} disabled={isSubmitting || !startDate}>
             {isSubmitting ? (
               <Loader2 className="h-4 w-4 animate-spin mr-2" />
             ) : (
               <Check className="h-4 w-4 mr-2" />
             )}
             Salvar
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }