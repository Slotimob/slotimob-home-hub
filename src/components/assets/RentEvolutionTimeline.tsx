 import { useState } from "react";
 import { format, parseISO, differenceInDays } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { Card } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import {
   TrendingUp,
   Trash2,
   Loader2,
   History,
   ArrowRight,
   Calendar,
   AlertTriangle,
 } from "lucide-react";
 import {
   useLeaseAdjustments,
   useDeleteLeaseAdjustment,
   type LeaseAdjustment,
 } from "@/hooks/useLeaseAdjustments";
 
 interface RentEvolutionTimelineProps {
   leaseId: string | null;
   startDate: string;
   initialRent: number;
   currentRent: number;
 }
 
 const formatCurrency = (value: number) =>
   value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
 
 export function RentEvolutionTimeline({
   leaseId,
   startDate,
   initialRent,
   currentRent,
 }: RentEvolutionTimelineProps) {
   const { data: adjustments, isLoading } = useLeaseAdjustments(leaseId);
   const deleteAdjustment = useDeleteLeaseAdjustment();
   const [deleteConfirm, setDeleteConfirm] = useState<LeaseAdjustment | null>(null);
 
   // Calculate total increase percentage
   const totalIncreasePercent =
     initialRent > 0 ? ((currentRent - initialRent) / initialRent) * 100 : 0;
 
   // Get the oldest value (either from first adjustment or initial rent)
   const firstValue = adjustments?.length
     ? adjustments[adjustments.length - 1]?.previous_value || initialRent
     : initialRent;
 
   const handleDelete = (adjustment: LeaseAdjustment) => {
     setDeleteConfirm(adjustment);
   };
 
   const confirmDelete = async () => {
     if (!deleteConfirm || !leaseId) return;
     
     await deleteAdjustment.mutateAsync({
       adjustmentId: deleteConfirm.id,
       leaseId,
       previousValue: deleteConfirm.previous_value,
     });
     
     setDeleteConfirm(null);
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-8">
         <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   const hasHistory = adjustments && adjustments.length > 0;
 
   return (
     <div className="space-y-4">
       {/* Summary Header */}
       <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
         <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-primary" />
             <span className="font-semibold">Evolução do Aluguel</span>
           </div>
           {totalIncreasePercent > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
               +{totalIncreasePercent.toFixed(1)}% no período
             </Badge>
           )}
         </div>
 
         <div className="grid grid-cols-2 gap-4 mb-3">
           <div>
             <p className="text-xs text-muted-foreground">Valor Inicial</p>
             <p className="text-lg font-bold">{formatCurrency(firstValue)}</p>
             <p className="text-[10px] text-muted-foreground">
               {format(parseISO(startDate), "dd/MM/yyyy")}
             </p>
           </div>
           <div className="text-right">
             <p className="text-xs text-muted-foreground">Valor Atual</p>
             <p className="text-lg font-bold text-primary">{formatCurrency(currentRent)}</p>
             <p className="text-[10px] text-muted-foreground">Hoje</p>
           </div>
         </div>
 
         {/* Progress bar showing evolution */}
         {totalIncreasePercent > 0 && (
           <div className="space-y-1">
             <Progress value={Math.min(totalIncreasePercent, 100)} className="h-2" />
             <p className="text-[10px] text-muted-foreground text-center">
               Aumento acumulado: {formatCurrency(currentRent - firstValue)}
             </p>
           </div>
         )}
       </Card>
 
       {/* Timeline */}
       {hasHistory ? (
         <ScrollArea className="max-h-[300px]">
           <div className="space-y-3 pr-2">
             {adjustments.map((adj, index) => {
               const percentChange =
                 adj.previous_value > 0
                   ? ((adj.new_value - adj.previous_value) / adj.previous_value) * 100
                   : 0;
 
               return (
                 <Card
                   key={adj.id}
                   className="p-3 relative hover:border-primary/30 transition-colors group"
                 >
                   {/* Timeline connector */}
                   {index < adjustments.length - 1 && (
                     <div className="absolute left-6 top-12 w-0.5 h-6 bg-border" />
                   )}
 
                   <div className="flex items-start gap-3">
                     {/* Timeline dot */}
                     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                       <History className="h-4 w-4 text-primary" />
                     </div>
 
                     <div className="flex-1 min-w-0">
                       {/* Date and Index */}
                       <div className="flex items-center gap-2 mb-1">
                         <p className="text-sm font-medium">
                           {format(parseISO(adj.adjustment_date), "dd 'de' MMMM 'de' yyyy", {
                             locale: ptBR,
                           })}
                         </p>
                         <Badge variant="outline" className="text-[10px]">
                           {adj.index_used}
                           {adj.index_percentage && ` (${adj.index_percentage}%)`}
                         </Badge>
                       </div>
 
                       {/* Values */}
                       <div className="flex items-center gap-2 text-sm">
                         <span className="text-muted-foreground">
                           {formatCurrency(adj.previous_value)}
                         </span>
                         <ArrowRight className="h-3 w-3 text-muted-foreground" />
                         <span className="font-semibold text-primary">
                           {formatCurrency(adj.new_value)}
                         </span>
                         <Badge
                           variant="secondary"
                        className="text-[10px] bg-primary/10 text-primary"
                         >
                           +{percentChange.toFixed(1)}%
                         </Badge>
                       </div>
 
                       {/* Notes */}
                       {adj.notes && (
                         <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                           {adj.notes}
                         </p>
                       )}
                     </div>
 
                     {/* Delete button - only show for most recent adjustment */}
                     {index === 0 && (
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                         onClick={() => handleDelete(adj)}
                         disabled={deleteAdjustment.isPending}
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                       </Button>
                     )}
                   </div>
                 </Card>
               );
             })}
 
             {/* Initial value marker */}
             <Card className="p-3 bg-muted/30 border-dashed">
               <div className="flex items-start gap-3">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                   <Calendar className="h-4 w-4 text-muted-foreground" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Início do Contrato</p>
                   <p className="text-sm">
                     {formatCurrency(firstValue)} em{" "}
                     {format(parseISO(startDate), "dd/MM/yyyy")}
                   </p>
                 </div>
               </div>
             </Card>
           </div>
         </ScrollArea>
       ) : (
         <Card className="p-6 text-center border-dashed">
           <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
           <p className="text-sm text-muted-foreground">
             Nenhum reajuste registrado ainda.
           </p>
           <p className="text-xs text-muted-foreground mt-1">
             Os reajustes aplicados aparecerão aqui automaticamente.
           </p>
         </Card>
       )}
 
       {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" />
               Excluir Reajuste?
             </AlertDialogTitle>
             <AlertDialogDescription className="space-y-2">
               <p>
                 Esta ação irá reverter o valor do aluguel para{" "}
                 <strong>{formatCurrency(deleteConfirm?.previous_value || 0)}</strong>.
               </p>
               <p>
                 Todas as parcelas futuras pendentes também serão atualizadas para o valor anterior.
               </p>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={deleteAdjustment.isPending}>
               Cancelar
             </AlertDialogCancel>
             <AlertDialogAction
               onClick={confirmDelete}
               disabled={deleteAdjustment.isPending}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               {deleteAdjustment.isPending ? (
                 <Loader2 className="h-4 w-4 animate-spin mr-2" />
               ) : (
                 <Trash2 className="h-4 w-4 mr-2" />
               )}
               Excluir e Reverter
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }