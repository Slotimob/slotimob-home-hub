import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Receipt,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyBRL as formatCurrency } from "@/utils/unitPricing";
import { invalidateLeaseQueries } from "@/lib/query-invalidation";
import {
  buildChargeInstallments,
  buildMonthlyChargeInstallments,
  buildRentInstallments,
  calculateDueDate,
  calculateProjectionWindow,
  type PlannedInstallment,
} from "@/lib/lease-projection";
import {
  useExistingLeaseCompetencies,
  useLeaseFinancialProjection,
} from "@/hooks/useLeaseFinancialProjection";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type {
  FireInsuranceConfig,
  IptuChargeConfig,
  LeaseChargeResponsible,
  ObligationChargeConfig,
} from "@/hooks/useLeases";

/** Rótulos dos encargos adicionais mensais (mesma taxonomia do contrato). */
const ADDITIONAL_LABELS: Record<string, string> = {
  condominium: "Condomínio",
  energy: "Energia",
  water: "Água",
  gas: "Gás",
  other: "Outros",
};

/** tenant => receita; owner/agency => despesa (repasse assumido). */
const typeFromChargeTo = (chargeTo?: LeaseChargeResponsible | null): "income" | "expense" =>
  chargeTo === "tenant" || !chargeTo ? "income" : "expense";

export interface LeaseForProjection {
  id: string;
  unit_id: string;
  tenant_contact_id: string;
  property_id?: string | null;
  rent_amount: number;
  due_day: number;
  start_date: string;
  end_date?: string | null;
  next_adjustment_date?: string | null;
  is_indefinite_term?: boolean | null;
  fire_insurance?: FireInsuranceConfig | null;
  iptu_charge?: IptuChargeConfig | null;
  additional_obligations: ObligationChargeConfig[] | null;
  unit?: { unit_number?: string | null; address?: string | null } | null;
  tenant?: { name?: string | null } | null;
  tenant_contact?: { name?: string | null } | null;
}


interface ConfirmLeaseProjectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lease: LeaseForProjection | null;
  /** Sobrescreve o valor do aluguel (ex.: logo após um reajuste). */
  overrideRentAmount?: number;
  /** Sobrescreve o início da janela (ex.: novo ciclo pós-reajuste). */
  overrideStartDate?: string;
  /**
   * Modo pós-reajuste: por padrão lança APENAS os aluguéis reajustados.
   * As obrigações (IPTU/seguro) ficam recolhidas atrás de uma ação secundária.
   */
  postAdjustment?: boolean;
  onConfirmed?: (count: number) => void;
  onSkipped?: () => void;
}


function InstallmentTable({
  installments,
  selected,
  onToggle,
}: {
  installments: PlannedInstallment[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="rounded-md border max-h-52 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-9 p-2" />
            <th className="p-2 font-medium">Competência</th>
            <th className="p-2 font-medium">Vencimento</th>
            <th className="p-2 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((i) => (
            <tr key={i.key} className="border-t">
              <td className="p-2">
                <Checkbox
                  checked={selected.has(i.key)}
                  disabled={i.alreadyExists}
                  onCheckedChange={() => onToggle(i.key)}
                  aria-label={`Lançar ${i.description}`}
                />
              </td>
              <td className="p-2">
                {i.competencyLabel}
                {i.alreadyExists && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    Já lançado
                  </Badge>
                )}
              </td>
              <td className="p-2">
                {format(parseISO(i.dueDate), "dd/MM/yyyy", { locale: ptBR })}
              </td>
              <td className="p-2 text-right tabular-nums">{formatCurrency(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConfirmLeaseProjectionDialog({
  open,
  onOpenChange,
  lease,
  overrideRentAmount,
  overrideStartDate,
  postAdjustment = false,

  onConfirmed,
  onSkipped,
}: ConfirmLeaseProjectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generateProjections, isGenerating } = useLeaseFinancialProjection();
  const { data: existingCompetencies, isLoading: loadingExisting } =
    useExistingLeaseCompetencies(lease?.id ?? null, open);

  const rentAmountDefault = overrideRentAmount ?? lease?.rent_amount ?? 0;
  const startDate = overrideStartDate || lease?.start_date || "";

  const window = useMemo(
    () =>
      lease
        ? calculateProjectionWindow({
            startDate,
            endDate: lease.end_date,
            nextAdjustmentDate: lease.next_adjustment_date,
            isIndefiniteTerm: lease.is_indefinite_term,
          })
        : null,
    [lease, startDate]
  );

  /**
   * `units.obligations_config` — fonte do `due_day` por obrigação.
   * Sem isso, todo encargo herdaria o vencimento do aluguel.
   */
  const { data: obligationsConfig } = useQuery({
    queryKey: ["unit-obligations-config", lease?.unit_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("obligations_config")
        .eq("id", lease!.unit_id)
        .maybeSingle();
      if (error) throw error;
      return (data?.obligations_config as Record<string, any> | null) || {};
    },
    enabled: !!lease?.unit_id && open,
  });

  /** `due_day` configurado no imóvel para uma obrigação (null quando não houver). */
  const unitDueDay = (key: string): number | null => {
    const cfg = obligationsConfig?.[key];
    const day = Number(cfg?.due_day);
    return day > 0 ? day : null;
  };

  // --- Estado editável ---
  const [monthsToLaunch, setMonthsToLaunch] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [firstDueDate, setFirstDueDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [launchRent, setLaunchRent] = useState(true);
  const [launchInsurance, setLaunchInsurance] = useState(true);
  const [launchIptu, setLaunchIptu] = useState(true);
  const [obligationsRevealed, setObligationsRevealed] = useState(true);
  const [launchFromMonth, setLaunchFromMonth] = useState("");
  /** Competência de referência (yyyy-MM) dos ciclos anuais. */
  const [insuranceCompetency, setInsuranceCompetency] = useState("");
  const [iptuCompetency, setIptuCompetency] = useState("");
  /** Encargos adicionais mensais ligados/desligados. */
  const [launchAdditional, setLaunchAdditional] = useState<Record<string, boolean>>({});

  const additionalConfigs = useMemo(
    () => (lease?.additional_obligations || []).filter((o) => o?.enabled),
    [lease]
  );

  // Reset ao abrir
  useEffect(() => {
    if (!open || !lease || !window) return;
    setMonthsToLaunch(window.months);
    setRentAmount(rentAmountDefault);
    const base = startDate ? parseISO(startDate) : new Date();
    setFirstDueDate(format(calculateDueDate(base, lease.due_day || 10), "yyyy-MM-dd"));
    setLaunchRent(true);
    // Pós-reajuste: só aluguel por padrão. Obrigações ficam atrás de uma ação secundária.
    setLaunchInsurance(postAdjustment ? false : !!lease.fire_insurance?.enabled);
    setLaunchIptu(postAdjustment ? false : !!lease.iptu_charge?.enabled);
    setObligationsRevealed(!postAdjustment);
    setLaunchFromMonth("");
    setSelected(new Set());
    // Pré-preenchido com o comportamento legado: competência = início da janela.
    const windowMonth = startDate ? startDate.slice(0, 7) : format(base, "yyyy-MM");
    setInsuranceCompetency(lease.fire_insurance?.competency_month || windowMonth);
    setIptuCompetency(lease.iptu_charge?.competency_month || windowMonth);
    setLaunchAdditional(
      Object.fromEntries(
        (lease.additional_obligations || [])
          .filter((o) => o?.enabled)
          .map((o) => [o.type, !postAdjustment])
      )
    );
  }, [open, lease?.id, window?.months, rentAmountDefault, startDate, postAdjustment]);


  const rentInstallments = useMemo(() => {
    if (!lease || !window || window.blocked) return [];
    return buildRentInstallments({
      startDate,
      months: Math.max(0, monthsToLaunch),
      amount: rentAmount,
      dueDay: lease.due_day || 10,
      firstDueDate: firstDueDate || null,
      existingCompetencies,
    });
  }, [lease, window, startDate, monthsToLaunch, rentAmount, firstDueDate, existingCompetencies]);

  /**
   * Valor da parcela de um encargo anual. Nunca cai no valor cheio:
   * usa `installment_amount` e, se ausente, divide o total pelo nº de parcelas.
   * Retorna null quando não dá para calcular — nesse caso nada é gerado e a UI avisa.
   */
  const resolveInstallmentAmount = (
    installmentAmount: number | null | undefined,
    total: number | null | undefined,
    installments: number
  ): number | null => {
    if (installmentAmount && installmentAmount > 0) return installmentAmount;
    if (total && total > 0 && installments > 0) {
      return Math.round((total / installments) * 100) / 100;
    }
    return null;
  };

  const insuranceCount = Math.max(1, lease?.fire_insurance?.installments || 1);
  const iptuCount = Math.max(1, lease?.iptu_charge?.installments || 1);

  const insuranceAmount = useMemo(
    () =>
      lease?.fire_insurance?.enabled
        ? resolveInstallmentAmount(
            lease.fire_insurance.installment_amount,
            lease.fire_insurance.total_amount,
            insuranceCount
          )
        : null,
    [lease, insuranceCount]
  );

  const iptuAmount = useMemo(
    () =>
      lease?.iptu_charge?.enabled
        ? resolveInstallmentAmount(
            lease.iptu_charge.installment_amount,
            lease.iptu_charge.annual_amount,
            iptuCount
          )
        : null,
    [lease, iptuCount]
  );

  const insuranceUnpriced = !!lease?.fire_insurance?.enabled && insuranceAmount === null;
  const iptuUnpriced = !!lease?.iptu_charge?.enabled && iptuAmount === null;
  const hasObligations =
    !!lease?.fire_insurance?.enabled ||
    !!lease?.iptu_charge?.enabled ||
    additionalConfigs.length > 0;



  const insuranceInstallments = useMemo(() => {
    const cfg = lease?.fire_insurance;
    if (!lease || !cfg?.enabled || insuranceAmount === null) return [];
    return buildChargeInstallments({
      obligationType: "fire_insurance",
      label: "Seguro Incêndio",
      installments: insuranceCount,
      installmentAmount: insuranceAmount,
      firstDueDate: cfg.first_due_date,
      fallbackStartDate: startDate,
      fallbackDueDay: lease.due_day || 10,
      obligationDueDay: unitDueDay("insurance"),
      cycleStartDate: insuranceCompetency ? `${insuranceCompetency}-01` : startDate,
      transactionType: typeFromChargeTo(cfg.charge_to),
      contactId: cfg.charge_to === "tenant" ? null : cfg.responsible_contact_id,
      existingCompetencies,
    });
  }, [
    lease,
    startDate,
    existingCompetencies,
    insuranceAmount,
    insuranceCount,
    insuranceCompetency,
    obligationsConfig,
  ]);

  const iptuInstallments = useMemo(() => {
    const cfg = lease?.iptu_charge;
    if (!lease || !cfg?.enabled || iptuAmount === null) return [];
    return buildChargeInstallments({
      obligationType: "iptu",
      label: "IPTU",
      installments: iptuCount,
      installmentAmount: iptuAmount,
      firstDueDate: cfg.first_due_date,
      fallbackStartDate: startDate,
      fallbackDueDay: lease.due_day || 10,
      obligationDueDay: unitDueDay("iptu"),
      cycleStartDate: iptuCompetency ? `${iptuCompetency}-01` : startDate,
      transactionType: typeFromChargeTo(cfg.charge_to),
      contactId: cfg.charge_to === "tenant" ? null : cfg.responsible_contact_id,
      existingCompetencies,
    });
  }, [
    lease,
    startDate,
    existingCompetencies,
    iptuAmount,
    iptuCount,
    iptuCompetency,
    obligationsConfig,
  ]);

  /**
   * Encargos adicionais (condomínio, energia, água, gás, outros): MENSAIS,
   * competência acompanhando o mês, igual ao aluguel.
   */
  const additionalGroups = useMemo(() => {
    if (!lease || !window || window.blocked) return [];
    return additionalConfigs
      .map((cfg) => {
        const label =
          cfg.label?.trim() || ADDITIONAL_LABELS[cfg.type] || cfg.type;
        const installments = buildMonthlyChargeInstallments({
          obligationType: cfg.type,
          label,
          startDate,
          months: Math.max(0, monthsToLaunch),
          amount: cfg.installment_amount || 0,
          firstDueDate: cfg.first_due_date,
          obligationDueDay: unitDueDay(cfg.type),
          fallbackDueDay: lease.due_day || 10,
          transactionType: typeFromChargeTo(cfg.charge_to),
          contactId: cfg.charge_to === "tenant" ? null : cfg.responsible_contact_id,
          existingCompetencies,
        });
        return { cfg, label, installments };
      })
      .filter((g) => g.installments.length > 0);
  }, [
    lease,
    window,
    additionalConfigs,
    startDate,
    monthsToLaunch,
    existingCompetencies,
    obligationsConfig,
  ]);

  const additionalInstallments = useMemo(
    () => additionalGroups.flatMap((g) => g.installments),
    [additionalGroups]
  );

  // Selecionar por padrão tudo que ainda não existe
  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    for (const i of [
      ...rentInstallments,
      ...insuranceInstallments,
      ...iptuInstallments,
      ...additionalInstallments,
    ]) {
      if (i.alreadyExists) continue;
      if (launchFromMonth && i.competencyPeriod < launchFromMonth) continue;
      next.add(i.key);
    }
    setSelected(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rentInstallments.length, insuranceInstallments.length, iptuInstallments.length, additionalInstallments.length, loadingExisting, launchFromMonth]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const confirmedInstallments = useMemo(() => {
    const list: PlannedInstallment[] = [];
    if (launchRent) list.push(...rentInstallments);
    if (launchInsurance) list.push(...insuranceInstallments);
    if (launchIptu) list.push(...iptuInstallments);
    for (const g of additionalGroups) {
      if (launchAdditional[g.cfg.type]) list.push(...g.installments);
    }
    return list.filter((i) => !i.alreadyExists && selected.has(i.key));
  }, [
    rentInstallments,
    insuranceInstallments,
    iptuInstallments,
    additionalGroups,
    launchAdditional,
    launchRent,
    launchInsurance,
    launchIptu,
    selected,
  ]);


  const totalAmount = confirmedInstallments.reduce((sum, i) => sum + i.amount, 0);

  const allAlreadyLaunched =
    !loadingExisting &&
    rentInstallments.length > 0 &&
    rentInstallments.every((i) => i.alreadyExists) &&
    insuranceInstallments.every((i) => i.alreadyExists) &&
    iptuInstallments.every((i) => i.alreadyExists) &&
    additionalInstallments.every((i) => i.alreadyExists);


  const handleSkip = () => {
    onSkipped?.();
    onOpenChange(false);
  };

  /** Persiste a competência escolhida no JSONB do contrato (sem migration). */
  const persistCompetencies = async () => {
    if (!lease) return;
    const patch: Record<string, unknown> = {};
    if (lease.fire_insurance?.enabled && insuranceCompetency) {
      patch.fire_insurance = { ...lease.fire_insurance, competency_month: insuranceCompetency };
    }
    if (lease.iptu_charge?.enabled && iptuCompetency) {
      patch.iptu_charge = { ...lease.iptu_charge, competency_month: iptuCompetency };
    }
    if (Object.keys(patch).length === 0) return;
    await supabase.from("leases").update(patch as any).eq("id", lease.id);
  };

  const handleConfirm = async () => {
    if (!lease || confirmedInstallments.length === 0) return;
    try {
      await persistCompetencies();

      const result = await generateProjections.mutateAsync({
        leaseId: lease.id,
        unitId: lease.unit_id,
        tenantContactId: lease.tenant_contact_id,
        propertyId: lease.property_id,
        leaseStartDate: lease.start_date,
        installments: confirmedInstallments,
      });


      await invalidateLeaseQueries(queryClient);

      toast({
        title:
          result.count > 0
            ? `${result.count} lançamento${result.count > 1 ? "s" : ""} criado${result.count > 1 ? "s" : ""}`
            : "Nenhum lançamento novo",
        description:
          result.count > 0
            ? "As parcelas foram lançadas no financeiro como pendentes."
            : "Todas as competências selecionadas já estavam lançadas.",
      });

      onConfirmed?.(result.count);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao gerar lançamentos",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    }
  };

  if (!lease || !window) return null;

  const tenantName = lease.tenant?.name || lease.tenant_contact?.name || "Inquilino";
  const unitLabel = lease.unit?.unit_number || lease.unit?.address || "Imóvel";
  const firstRent = rentInstallments[0];
  const lastRent = rentInstallments[rentInstallments.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => isGenerating && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Gerar lançamentos do contrato
          </DialogTitle>
          <DialogDescription>
            Nada é lançado no financeiro até você confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-medium">{unitLabel}</span>
            <span className="text-muted-foreground">{tenantName}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span>Aluguel {formatCurrency(rentAmountDefault)}</span>
            <span>Vencimento dia {lease.due_day}</span>
          </div>
        </div>

        {window.blocked ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{window.reasonLabel}</p>
          </div>
        ) : allAlreadyLaunched ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              Todas as competências desta janela já estão lançadas no financeiro. Não há nada
              a duplicar.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
              <CalendarClock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                {firstRent && lastRent ? (
                  <>
                    Serão lançadas <strong>{rentInstallments.length} parcelas</strong>, de{" "}
                    {firstRent.competencyLabel} a {lastRent.competencyLabel} —{" "}
                    {window.reasonLabel}
                  </>
                ) : (
                  window.reasonLabel
                )}
              </p>
            </div>

            {/* Campos editáveis */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="months">Nº de parcelas</Label>
                <Input
                  id="months"
                  type="number"
                  min={1}
                  max={window.months}
                  value={monthsToLaunch}
                  onChange={(e) =>
                    setMonthsToLaunch(
                      Math.min(Math.max(Number(e.target.value) || 1, 1), window.months)
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rent">Valor da parcela</Label>
                <CurrencyInput
                  id="rent"
                  value={rentAmount ? String(rentAmount) : ""}
                  onChange={(v) => setRentAmount(parseFloat(v) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstDue">1º vencimento</Label>
                <Input
                  id="firstDue"
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Contrato retroativo? Escolha a partir de qual competência lançar — as
                competências anteriores são desmarcadas automaticamente (você ainda pode
                marcar linha a linha depois).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="launch-from" className="text-xs font-medium">
                  Lançar a partir de
                </Label>
                <Input
                  id="launch-from"
                  type="month"
                  className="h-9 w-[170px]"
                  value={launchFromMonth}
                  onChange={(e) => setLaunchFromMonth(e.target.value)}
                />
                {launchFromMonth && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => setLaunchFromMonth("")}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Aluguel</p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="launch-rent" className="text-xs text-muted-foreground">
                    Lançar agora
                  </Label>
                  <Switch id="launch-rent" checked={launchRent} onCheckedChange={setLaunchRent} />
                </div>
              </div>
              {launchRent && (
                <InstallmentTable
                  installments={rentInstallments}
                  selected={selected}
                  onToggle={toggle}
                />
              )}
            </div>

            {(hasObligations || insuranceUnpriced || iptuUnpriced) && !obligationsRevealed && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Este reajuste lança apenas os aluguéis reajustados. IPTU e seguro não são
                  alterados nem relançados.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setObligationsRevealed(true);
                    setLaunchInsurance(!!lease.fire_insurance?.enabled);
                    setLaunchIptu(!!lease.iptu_charge?.enabled);
                    setLaunchAdditional(
                      Object.fromEntries(additionalConfigs.map((o) => [o.type, true]))
                    );

                  }}

                >
                  Incluir obrigações neste lançamento
                </Button>
              </div>
            )}

            {obligationsRevealed && insuranceUnpriced && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Seguro Incêndio: valor da parcela não definido no contrato. Nada será lançado —
                  informe o valor total e o número de parcelas no contrato.
                </p>
              </div>
            )}

            {obligationsRevealed && insuranceInstallments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      Seguro Incêndio
                    </p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="launch-insurance" className="text-xs text-muted-foreground">
                        Lançar agora
                      </Label>
                      <Switch
                        id="launch-insurance"
                        checked={launchInsurance}
                        onCheckedChange={setLaunchInsurance}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="insurance-competency" className="text-xs text-muted-foreground">
                      Competência de referência
                    </Label>
                    <Input
                      id="insurance-competency"
                      type="month"
                      className="h-9 w-[170px]"
                      value={insuranceCompetency}
                      onChange={(e) => setInsuranceCompetency(e.target.value)}
                    />
                  </div>
                  {launchInsurance && (
                    <InstallmentTable
                      installments={insuranceInstallments}
                      selected={selected}
                      onToggle={toggle}
                    />
                  )}
                </div>
              </>
            )}


            {obligationsRevealed && iptuUnpriced && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  IPTU: valor da parcela não definido no contrato. Nada será lançado — informe o
                  valor anual e o número de parcelas no contrato.
                </p>
              </div>
            )}

            {obligationsRevealed && iptuInstallments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      IPTU
                    </p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="launch-iptu" className="text-xs text-muted-foreground">
                        Lançar agora
                      </Label>
                      <Switch
                        id="launch-iptu"
                        checked={launchIptu}
                        onCheckedChange={setLaunchIptu}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="iptu-competency" className="text-xs text-muted-foreground">
                      Competência de referência (exercício)
                    </Label>
                    <Input
                      id="iptu-competency"
                      type="month"
                      className="h-9 w-[170px]"
                      value={iptuCompetency}
                      onChange={(e) => setIptuCompetency(e.target.value)}
                    />
                  </div>
                  {launchIptu && (
                    <InstallmentTable
                      installments={iptuInstallments}
                      selected={selected}
                      onToggle={toggle}
                    />
                  )}
                </div>
              </>
            )}

            {obligationsRevealed &&
              additionalGroups.map((g) => (
                <div key={g.cfg.type}>
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        {g.label}
                        <Badge variant="secondary" className="text-[10px]">
                          {typeFromChargeTo(g.cfg.charge_to) === "income"
                            ? "Receita"
                            : "Despesa"}
                        </Badge>
                      </p>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`launch-${g.cfg.type}`}
                          className="text-xs text-muted-foreground"
                        >
                          Lançar agora
                        </Label>
                        <Switch
                          id={`launch-${g.cfg.type}`}
                          checked={!!launchAdditional[g.cfg.type]}
                          onCheckedChange={(v) =>
                            setLaunchAdditional((prev) => ({ ...prev, [g.cfg.type]: v }))
                          }
                        />
                      </div>
                    </div>
                    {launchAdditional[g.cfg.type] && (
                      <InstallmentTable
                        installments={g.installments}
                        selected={selected}
                        onToggle={toggle}
                      />
                    )}
                  </div>
                </div>
              ))}




            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {confirmedInstallments.length} lançamento
                {confirmedInstallments.length === 1 ? "" : "s"}
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(totalAmount)}</span>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isGenerating}>
            Não lançar agora
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isGenerating || confirmedInstallments.length === 0}
          >
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar lançamentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmLeaseProjectionDialog;
