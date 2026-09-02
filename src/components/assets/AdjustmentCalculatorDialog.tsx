import { useState, useEffect, useMemo, useRef } from "react";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calculator,
  TrendingUp,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Info,
  Percent,
  CalendarClock,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  LeaseProjectionEditor,
  type LeaseForProjection,
  type LeaseProjectionEditorHandle,
} from "@/components/assets/LeaseProjectionEditor";
import { PercentInput } from "@/components/ui/currency-input";
import { calculateRentAdjustment } from "@/lib/rentAdjustment";
import { calculateProjectionWindow, calculateDueDate, resolveFirstAdjustedCompetency } from "@/lib/lease-projection";

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
  owner_contact_id?: string | null;
  property_id?: string | null;
  adjustment_periodicity_months?: number | null;
  fire_insurance?: any;
  iptu_charge?: any;
  additional_obligations?: any;
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

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [launchFuture, setLaunchFuture] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  /** Editor de projeção embutido: o lançamento sai do botão desta tela. */
  const editorRef = useRef<LeaseProjectionEditorHandle>(null);
  /**
   * O reajuste já foi gravado nesta sessão do dialog. Se só o lançamento falhar,
   * a nova tentativa NÃO pode reaplicar o reajuste (duplicaria histórico/cascade).
   */
  const adjustmentAppliedRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIndexPercentage("");
      setNotes("");
      setIsSubmitting(false);
      setLaunchFuture(true);
      setSelectedCount(0);
      adjustmentAppliedRef.current = false;
    }
  }, [open, lease?.id]);

  const currentValue = lease?.rent_amount ?? 0;
  const percentage = parseFloat(indexPercentage) || 0;
  // Shared math: keeps every decimal of the index and rounds money to cents
  // before it is persisted (lease_adjustments / leases / financial_transactions).
  const { newRent: newValue, difference } = calculateRentAdjustment(currentValue, percentage);
  const indexKey = lease?.adjustment_index || "IGPM";
  const indexSource = INDEX_SOURCES[indexKey] || INDEX_SOURCES.IGPM;

  const missingFields = useMemo(() => {
    if (!lease) return [] as string[];
    return [
      !lease.tenant_contact_id ? "inquilino vinculado" : null,
      !lease.due_day ? "dia de vencimento" : null,
    ].filter(Boolean) as string[];
  }, [lease]);

  const canProject = missingFields.length === 0;

  // Preview usa a mesma janela que a geração real do LeaseProjectionEditor.
  const projectionPreview = useMemo(() => {
    if (!lease || !canProject || !lease.due_day) return null;
    const currentAdjustmentDate = lease.next_adjustment_date || lease.start_date;
    const nextAdjustmentDate = format(
      addMonths(parseISO(currentAdjustmentDate), lease.adjustment_periodicity_months || 12),
      "yyyy-MM-dd"
    );
    // A janela começa na primeira competência cujo vencimento já vale o reajuste.
    const firstCompetency = resolveFirstAdjustedCompetency(currentAdjustmentDate, lease.due_day);
    const window = calculateProjectionWindow({
      startDate: firstCompetency,
      endDate: lease.end_date,
      nextAdjustmentDate,
      isIndefiniteTerm: lease.is_indefinite_term,
    });
    const firstDue = window.start ? calculateDueDate(window.start, lease.due_day) : null;
    const endDate = window.end;
    const indefinite = !!lease.is_indefinite_term || !endDate;
    const installments = window.blocked ? 0 : window.months;
    return { firstDue, endDate, indefinite, installments, reasonLabel: window.reasonLabel };
  }, [lease, canProject]);

  /**
   * Contrato "projetado" que alimenta o editor embutido: mesmo objeto que antes
   * era passado ao segundo dialog, agora montado enquanto o usuário digita.
   */
  const projectionLeaseData = useMemo<LeaseForProjection | null>(() => {
    if (!lease || !canProject || !lease.due_day) return null;
    const currentAdjustmentDate = lease.next_adjustment_date || lease.start_date;
    return {
      id: lease.id,
      unit_id: lease.unit_id,
      tenant_contact_id: lease.tenant_contact_id!,
      owner_contact_id: lease.owner_contact_id ?? null,
      property_id: lease.property_id ?? null,
      rent_amount: newValue,
      due_day: lease.due_day,
      // Mesma âncora do preview: primeira competência já reajustada.
      start_date: format(
        resolveFirstAdjustedCompetency(currentAdjustmentDate, lease.due_day),
        "yyyy-MM-dd"
      ),
      end_date: lease.end_date ?? null,
      next_adjustment_date: format(
        addMonths(parseISO(currentAdjustmentDate), lease.adjustment_periodicity_months || 12),
        "yyyy-MM-dd"
      ),
      is_indefinite_term: lease.is_indefinite_term ?? false,
      fire_insurance: lease.fire_insurance ?? null,
      iptu_charge: lease.iptu_charge ?? null,
      additional_obligations: lease.additional_obligations ?? null,
      unit: lease.unit ? { unit_number: lease.unit.unit_number } : null,
      tenant: lease.tenant_contact ? { name: lease.tenant_contact.name } : null,
    };
  }, [lease, canProject, newValue]);


  if (!lease) return null;

  const handleApplyAdjustment = async () => {
    if (!user || !lease || percentage <= 0) return;

    setIsSubmitting(true);

    try {
      // Etapa 1: aplicar o reajuste. Só roda uma vez por sessão do dialog — numa
      // nova tentativa após falha de lançamento, pula direto para a etapa 2.
      if (!adjustmentAppliedRef.current) {
        // Calculate next adjustment date (current + periodicity)
        const currentAdjustmentDate = lease.next_adjustment_date || lease.start_date;
        const nextAdjustmentDate = format(
          addMonths(parseISO(currentAdjustmentDate), lease.adjustment_periodicity_months || 12),
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

        // Step 3: CASCADE UPDATE - apenas parcelas de ALUGUEL pendentes futuras.
        // NUNCA tocar IPTU/seguro/outras obrigações: elas têm valor próprio e
        // seriam sobrescritas com o valor do aluguel (corrupção silenciosa).
        const adjustmentEffectiveDate = format(new Date(), "yyyy-MM-dd");

        const { data: updatedTransactions, error: cascadeError } = await supabase
          .from("financial_transactions")
          .update({ amount: newValue })
          .eq("reference", `lease:${lease.id}`)
          .eq("status", "pending")
          .gte("due_date", adjustmentEffectiveDate)
          .or("obligation_type.eq.rent,obligation_type.is.null")
          .select("id");

        if (cascadeError) {
          console.error("Cascade update error:", cascadeError);
          toast({
            title: "Reajuste aplicado com ressalva",
            description:
              "O contrato foi atualizado, mas houve erro ao atualizar parcelas futuras.",
            variant: "destructive",
          });
        } else {
          const updatedCount = updatedTransactions?.length || 0;

          toast({
            title: "Reajuste aplicado com sucesso!",
            description: `Novo valor: ${brl(newValue)}${updatedCount > 0 ? ` • ${updatedCount} parcelas atualizadas` : ""}`,
          });
        }

        adjustmentAppliedRef.current = true;

        await invalidateLeaseQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: ["lease-adjustments"] });
        queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      }

      // Etapa 2 (opcional): lançar as parcelas editadas inline, já reajustadas.
      // Se falhar, o reajuste da etapa 1 permanece — o dialog NÃO fecha e o
      // usuário pode tentar de novo sem reaplicar nada.
      if (launchFuture && canProject && selectedCount > 0) {
        try {
          await editorRef.current?.submit();
        } catch (launchError: any) {
          toast({
            title: "Reajuste aplicado, mas o lançamento falhou",
            description: `${launchError?.message || "Erro desconhecido"} — o novo valor já está salvo. Você pode tentar lançar as parcelas novamente.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess?.();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-3xl"
          onInteractOutside={(e) => isSubmitting && e.preventDefault()}
        >
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

          {/* Área rolável: header e footer permanecem sempre visíveis */}
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Valor Atual</p>
                <p className="text-lg font-bold">{brl(currentValue)}</p>
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

              {percentage <= 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Info className="h-3 w-3" />
                  Informe o percentual para calcular o novo valor.
                </p>
              )}

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
                  <p className="text-2xl font-bold text-primary">{brl(newValue)}</p>
                  <p className="text-sm text-primary flex items-center justify-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +{brl(difference)}
                    <span className="text-muted-foreground">({percentage.toFixed(2)}%)</span>
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-start gap-2 [text-wrap:pretty]">
                    <RefreshCw className="h-3 w-3 shrink-0 mt-0.5" />
                    Parcelas de <strong>aluguel</strong> pendentes futuras serão atualizadas
                    automaticamente. IPTU, seguro e demais obrigações não são alterados.
                  </p>
                </div>
              </Card>
            )}




            {/* Lançamento de aluguéis futuros */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="launch-future-rents"
                  checked={launchFuture && canProject}
                  disabled={!canProject}
                  onCheckedChange={(v) => setLaunchFuture(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="launch-future-rents"
                  className={`text-sm font-normal leading-snug ${!canProject ? "text-muted-foreground" : ""}`}
                >
                  Lançar aluguéis futuros com o novo valor reajustado
                </Label>
              </div>

              {!canProject && (
                <p className="text-xs text-destructive flex items-start gap-1.5 pl-6">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Não é possível lançar as cobranças automaticamente: falta{" "}
                    <strong>{missingFields.join(" e ")}</strong> no contrato. Complete esses dados
                    no contrato para habilitar o lançamento automático — o reajuste em si pode ser
                    aplicado normalmente.
                  </span>
                </p>
              )}

              {canProject && launchFuture && percentage <= 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Digite o percentual do reajuste acima para ver as parcelas e ajustar
                    competência, vencimento e quantidade antes de lançar.
                  </p>
                </div>
              )}

              {canProject && launchFuture && projectionPreview && percentage > 0 && projectionLeaseData && (
                <div className="space-y-3 pt-1">
                  {/* Resumo curto: o detalhe editável fica no editor abaixo */}
                  <Card className="p-3 bg-muted/40">
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-primary" />
                      O que será lançado
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Imóvel</span>
                      <span className="font-medium text-right">
                        {lease.unit?.unit_number || "—"}
                      </span>
                      <span className="text-muted-foreground">Inquilino</span>
                      <span className="font-medium text-right">
                        {lease.tenant_contact?.name || "—"}
                      </span>
                      <span className="text-muted-foreground">Novo valor do aluguel</span>
                      <span className="font-medium text-right">{brl(newValue)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-2 mt-2 border-t [text-wrap:pretty]">
                      Ajuste abaixo competência, 1º vencimento, quantidade de parcelas e valor —
                      e marque exatamente o que deve ser lançado.
                    </p>
                  </Card>

                  <LeaseProjectionEditor
                    ref={editorRef}
                    lease={projectionLeaseData}
                    overrideRentAmount={newValue}
                    overrideStartDate={projectionLeaseData.start_date}
                    postAdjustment
                    showSummary={false}
                    onSelectionChange={(n) => setSelectedCount(n)}
                  />
                </div>
              )}
            </div>

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
            <Button onClick={handleApplyAdjustment} disabled={percentage <= 0 || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {launchFuture && canProject && selectedCount > 0
                ? `Confirmar reajuste e lançar ${selectedCount} parcela${selectedCount === 1 ? "" : "s"}`
                : "Confirmar Reajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
