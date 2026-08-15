import { useState } from "react";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calculator, TrendingUp, Check, Loader2, AlertTriangle, RefreshCw, ExternalLink, Info, Percent } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmLeaseProjectionDialog, type LeaseForProjection } from "@/components/assets/ConfirmLeaseProjectionDialog";

interface LeaseForAdjustment {
  id: string;
  unit_id: string;
  rent_amount: number;
  adjustment_index: string | null;
  next_adjustment_date: string | null;
  start_date: string;
  end_date?: string | null;
  is_indefinite_term?: boolean | null;
  due_day?: number | null;
  tenant_contact_id?: string | null;
  property_id?: string | null;
  fire_insurance?: any;
  iptu_charge?: any;
  tenant_contact?: {
    name: string;
  } | null;
  unit?: {
    unit_number: string;
  } | null;
}

interface AdjustmentCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: LeaseForAdjustment | null;
  onSuccess?: () => void;
  isUrgent?: boolean; // Shows if this is an overdue or current month adjustment
}

const INDEX_LABELS: Record<string, string> = {
  IGPM: "IGP-M",
  IPCA: "IPCA",
  INPC: "INPC",
  Fixo: "Fixo",
};

const INDEX_SOURCES: Record<string, { url: string; label: string }> = {
  IGPM: { url: "https://www.ibge.gov.br/", label: "Consultar IGP-M (FGV)" },
  IPCA: { url: "https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html", label: "Consultar IPCA (IBGE)" },
  INPC: { url: "https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9258-indice-nacional-de-precos-ao-consumidor.html", label: "Consultar INPC (IBGE)" },
  Fixo: { url: "#", label: "Índice Fixo" },
};

export function AdjustmentCalculatorDialog({
  open,
  onOpenChange,
  lease,
  onSuccess,
  isUrgent = false,
}: AdjustmentCalculatorDialogProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [indexPercentage, setIndexPercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectionLease, setProjectionLease] = useState<LeaseForProjection | null>(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIndexPercentage("");
      setNotes("");
      setIsSubmitting(false);
    }
  }, [open, lease?.id]);

  if (!lease) return null;

  const currentValue = lease.rent_amount;
  const percentage = parseFloat(indexPercentage) || 0;
  const newValue = currentValue * (1 + percentage / 100);
  const difference = newValue - currentValue;
  const indexKey = lease.adjustment_index || "IGPM";
  const indexSource = INDEX_SOURCES[indexKey] || INDEX_SOURCES.IGPM;

  const handleApplyAdjustment = async () => {
    if (!user || !lease || percentage <= 0) return;

    setIsSubmitting(true);

    try {
      // Calculate next adjustment date (current + 12 months)
      const currentAdjustmentDate = lease.next_adjustment_date || lease.start_date;
      const nextAdjustmentDate = format(
        addYears(new Date(currentAdjustmentDate), 1),
        "yyyy-MM-dd"
      );

      // Step 1: Insert adjustment history
      const { error: historyError } = await supabase
        .from("lease_adjustments")
        .insert({
           broker_id: effectiveBrokerId || user.id,
          lease_id: lease.id,
          adjustment_date: format(new Date(), "yyyy-MM-dd"),
          previous_value: currentValue,
          new_value: newValue,
          index_used: lease.adjustment_index || "IGPM",
          index_percentage: percentage,
          notes: notes || null,
        });

      if (historyError) throw historyError;

      // Step 2: Update lease with new rent and next adjustment date
      const { error: updateError } = await supabase
        .from("leases")
        .update({
          rent_amount: newValue,
          next_adjustment_date: nextAdjustmentDate,
        })
        .eq("id", lease.id);

      if (updateError) throw updateError;

      // Step 3: CASCADE UPDATE - Update all pending future transactions for this lease
      const adjustmentEffectiveDate = format(new Date(), "yyyy-MM-dd");
      
      const { data: updatedTransactions, error: cascadeError } = await supabase
        .from("financial_transactions")
        .update({ amount: newValue })
        .eq("reference", `lease:${lease.id}`)
        .eq("status", "pending")
        .gte("due_date", adjustmentEffectiveDate)
        .select("id");

      if (cascadeError) {
        console.error("Cascade update error:", cascadeError);
        toast({
          title: "Reajuste aplicado com ressalva",
          description: "O contrato foi atualizado, mas houve erro ao atualizar parcelas futuras.",
          variant: "destructive",
        });
      } else {
        const updatedCount = updatedTransactions?.length || 0;

        toast({
          title: "Reajuste aplicado com sucesso!",
          description: `Novo valor: ${newValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${updatedCount > 0 ? ` • ${updatedCount} parcelas atualizadas` : ""}`,
        });
      }

      await invalidateLeaseQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["lease-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });

      onSuccess?.();
      onOpenChange(false);

      // Novo ciclo: oferece o lançamento das parcelas já com o valor reajustado.
      if (lease.tenant_contact_id && lease.due_day) {
        setProjectionLease({
          id: lease.id,
          unit_id: lease.unit_id,
          tenant_contact_id: lease.tenant_contact_id,
          property_id: lease.property_id ?? null,
          rent_amount: newValue,
          due_day: lease.due_day,
          start_date: currentAdjustmentDate,
          end_date: lease.end_date ?? null,
          next_adjustment_date: nextAdjustmentDate,
          is_indefinite_term: lease.is_indefinite_term ?? false,
          fire_insurance: lease.fire_insurance ?? null,
          iptu_charge: lease.iptu_charge ?? null,
          unit: lease.unit ? { unit_number: lease.unit.unit_number } : null,
          tenant: lease.tenant_contact ? { name: lease.tenant_contact.name } : null,
        });
        setProjectionOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao aplicar reajuste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => isSubmitting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUrgent ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <Calculator className="h-5 w-5 text-primary" />
            )}
            Calculadora de Reajuste
            {isUrgent && (
              <Badge variant="outline" className="ml-2 border-warning text-warning text-[10px]">
                Reajuste Pendente
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {lease.unit?.unit_number} • {lease.tenant_contact?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Urgent Warning */}
          {isUrgent && (
            <Card className="p-3 bg-warning/10 border-warning/30">
              <p className="text-sm text-warning-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Este contrato está com reajuste pendente ou atrasado. Aplique o índice para atualizar o valor.
              </p>
            </Card>
          )}

          {/* Current Info */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Valor Atual</p>
              <p className="text-lg font-bold">
                {currentValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Índice Contratual</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-semibold">
                  {INDEX_LABELS[indexKey]}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="text-xs">Índice definido no contrato de locação</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Card>
          </div>

          {/* Index Percentage Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Percentual Acumulado (12 meses)
            </Label>
            <PercentInput
              placeholder="Ex: 4,52"
              value={indexPercentage}
              onChange={(v) => setIndexPercentage(String(v))}
              className="text-center text-lg font-bold"
              autoFocus
            />
            
            {/* Link to consult official value */}
            {indexKey !== "Fixo" && (
              <a
                href={indexSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {indexSource.label}
              </a>
            )}
          </div>

          {/* Preview */}
          {percentage > 0 && (
            <Card className="p-4 bg-accent/50 border-accent">
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">Novo Valor Calculado</p>
                <p className="text-2xl font-bold text-primary">
                  {newValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <p className="text-sm text-primary flex items-center justify-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{difference.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  <span className="text-muted-foreground">({percentage.toFixed(2)}%)</span>
                </p>
              </div>

              {/* Cascade Update Info */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
                  <RefreshCw className="h-3 w-3" />
                  Parcelas pendentes futuras serão atualizadas automaticamente
                </p>
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <Card className="p-3 bg-muted/50 border-muted">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <Info className="h-3 w-3 inline mr-1 -mt-0.5" />
              O reajuste deve respeitar o índice acumulado do <strong>{INDEX_LABELS[indexKey]}</strong>. 
              Certifique-se de consultar o valor oficial nos órgãos responsáveis (FGV/IBGE) antes de confirmar.
            </p>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Reajuste anual conforme cláusula contratual..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleApplyAdjustment}
            disabled={percentage <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirmar Reajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <ConfirmLeaseProjectionDialog
        open={projectionOpen}
        onOpenChange={(o) => {
          setProjectionOpen(o);
          if (!o) setProjectionLease(null);
        }}
        lease={projectionLease}
      />
    </>
  );
}