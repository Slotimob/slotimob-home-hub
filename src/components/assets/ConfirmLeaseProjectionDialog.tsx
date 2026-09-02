import { useEffect, useMemo, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Home,
  Loader2,
  Receipt,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { format, getDate, parseISO } from "date-fns";
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
  ProjectionBlock,
  competencyPeriodOf,
  issueDayOf,
  type BlockConfig,
} from "./ProjectionBlock";
import {
  useExistingLeaseCompetencies,
  useLeaseFinancialProjection,
} from "@/hooks/useLeaseFinancialProjection";
import { supabase } from "@/integrations/supabase/client";
import { useCustomObligationTypes } from "@/hooks/useCustomObligationTypes";
import {
  isUncategorizedObligation,
  resolveObligationLabel,
  UNCATEGORIZED_OBLIGATION_NOTICE,
} from "@/lib/obligation-labels";
import type {
  FireInsuranceConfig,
  IptuChargeConfig,
  LeaseChargeResponsible,
  ObligationChargeConfig,
} from "@/hooks/useLeases";


/** tenant => receita; owner/agency => despesa (repasse assumido). */
const typeFromChargeTo = (chargeTo?: LeaseChargeResponsible | null): "income" | "expense" =>
  chargeTo === "tenant" || !chargeTo ? "income" : "expense";

export interface LeaseForProjection {
  id: string;
  unit_id: string;
  tenant_contact_id: string;
  owner_contact_id?: string | null;
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

/**
 * Valor da parcela de um encargo anual. Nunca cai no valor cheio:
 * usa `installment_amount` e, se ausente, divide o total pelo nº de parcelas.
 * Retorna null quando não dá para calcular — nesse caso a UI avisa e o usuário
 * pode digitar o valor direto no bloco.
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
  const { data: customObligationTypes } = useCustomObligationTypes();

  /** `uuid do tipo customizado -> nome`, usado só como fallback do rótulo. */
  const customTypeNames = useMemo(
    () =>
      (customObligationTypes || []).reduce<Record<string, string>>((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {}),
    [customObligationTypes]
  );


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

  // --- Estado editável, um BlockConfig por bloco ---
  const [blocks, setBlocks] = useState<Record<string, BlockConfig>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [obligationsRevealed, setObligationsRevealed] = useState(true);

  const additionalConfigs = useMemo(
    () => (lease?.additional_obligations || []).filter((o) => o?.enabled),
    [lease]
  );

  const insuranceCount = Math.max(1, lease?.fire_insurance?.installments || 1);
  const iptuCount = Math.max(1, lease?.iptu_charge?.installments || 1);

  const insuranceAmountDefault = useMemo(
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

  const iptuAmountDefault = useMemo(
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

  /**
   * Reset ao abrir: cada bloco nasce com exatamente o que o motor calculava
   * antes, para quem não mexer em nada ter o mesmo resultado de sempre.
   */
  useEffect(() => {
    if (!open || !lease || !window) return;

    const windowMonth = startDate ? startDate.slice(0, 7) : format(new Date(), "yyyy-MM");
    const base = startDate ? parseISO(startDate) : new Date();
    const dueDay = lease.due_day || 10;
    // Emissão default = dia de início do contrato (mesma regra do motor legado).
    const issueDay = lease.start_date ? getDate(parseISO(lease.start_date)) : 1;
    /** Competência completa: mês do parâmetro + dia de emissão, com clamp de mês curto. */
    const withIssueDay = (yyyyMm: string) =>
      format(calculateDueDate(parseISO(`${yyyyMm}-01`), issueDay), "yyyy-MM-dd");

    const next: Record<string, BlockConfig> = {
      rent: {
        competency: withIssueDay(windowMonth),
        firstDueDate: format(calculateDueDate(base, dueDay), "yyyy-MM-dd"),
        months: Math.max(1, window.months),
        amount: rentAmountDefault,
      },
    };

    if (lease.fire_insurance?.enabled) {
      const competency = lease.fire_insurance.competency_month || windowMonth;
      next.fire_insurance = {
        competency: withIssueDay(competency),
        firstDueDate:
          lease.fire_insurance.first_due_date ||
          format(
            calculateDueDate(parseISO(`${competency}-01`), unitDueDay("insurance") ?? dueDay),
            "yyyy-MM-dd"
          ),
        months: insuranceCount,
        amount: insuranceAmountDefault ?? 0,
      };
    }

    if (lease.iptu_charge?.enabled) {
      const competency = lease.iptu_charge.competency_month || windowMonth;
      next.iptu = {
        competency: withIssueDay(competency),
        firstDueDate:
          lease.iptu_charge.first_due_date ||
          format(
            calculateDueDate(parseISO(`${competency}-01`), unitDueDay("iptu") ?? dueDay),
            "yyyy-MM-dd"
          ),
        months: iptuCount,
        amount: iptuAmountDefault ?? 0,
      };
    }

    for (const cfg of additionalConfigs) {
      next[cfg.type] = {
        competency: withIssueDay(windowMonth),
        firstDueDate:
          (cfg.first_due_date as string) ||
          format(calculateDueDate(base, unitDueDay(cfg.type) ?? dueDay), "yyyy-MM-dd"),
        months: Math.max(1, window.months),
        amount: cfg.installment_amount || 0,
      };
    }

    setBlocks(next);
    setSelected(new Set());
    setObligationsRevealed(window.blocked || !postAdjustment);
    setEnabled({
      // Janela bloqueada (reajuste vencido): aluguel nunca entra no lote.
      rent: !window.blocked,
      fire_insurance: window.blocked
        ? !!lease.fire_insurance?.enabled
        : postAdjustment
          ? false
          : !!lease.fire_insurance?.enabled,
      iptu: window.blocked
        ? !!lease.iptu_charge?.enabled
        : postAdjustment
          ? false
          : !!lease.iptu_charge?.enabled,
      ...Object.fromEntries(additionalConfigs.map((o) => [o.type, !postAdjustment])),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lease?.id, window?.months, window?.blocked, rentAmountDefault, startDate, postAdjustment]);

  const patchBlock = (key: string, patch: Partial<BlockConfig>) =>
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // --- Geração das parcelas a partir do estado dos blocos ---
  const rentInstallments = useMemo(() => {
    const cfg = blocks.rent;
    if (!lease || !window || window.blocked || !cfg) return [];
    return buildRentInstallments({
      startDate: `${competencyPeriodOf(cfg.competency)}-01`,
      months: Math.max(0, cfg.months),
      amount: cfg.amount,
      dueDay: lease.due_day || 10,
      firstDueDate: cfg.firstDueDate || null,
      issueDay: issueDayOf(cfg.competency),
      existingCompetencies,
    });
  }, [lease, window, blocks.rent, existingCompetencies]);

  const insuranceInstallments = useMemo(() => {
    const cfg = blocks.fire_insurance;
    const lc = lease?.fire_insurance;
    if (!lease || !lc?.enabled || !cfg || cfg.amount <= 0) return [];
    return buildChargeInstallments({
      obligationType: "fire_insurance",
      label: "Seguro Incêndio",
      installments: cfg.months,
      installmentAmount: cfg.amount,
      firstDueDate: cfg.firstDueDate || null,
      fallbackStartDate: `${competencyPeriodOf(cfg.competency)}-01`,
      fallbackDueDay: lease.due_day || 10,
      obligationDueDay: unitDueDay("insurance"),
      cycleStartDate: `${competencyPeriodOf(cfg.competency)}-01`,
      issueDay: issueDayOf(cfg.competency),
      transactionType: typeFromChargeTo(lc.charge_to),
      contactId: lc.charge_to === "tenant" ? null : lc.responsible_contact_id,
      existingCompetencies,
    });
  }, [lease, blocks.fire_insurance, existingCompetencies, obligationsConfig]);

  const iptuInstallments = useMemo(() => {
    const cfg = blocks.iptu;
    const lc = lease?.iptu_charge;
    if (!lease || !lc?.enabled || !cfg || cfg.amount <= 0) return [];
    return buildChargeInstallments({
      obligationType: "iptu",
      label: "IPTU",
      installments: cfg.months,
      installmentAmount: cfg.amount,
      firstDueDate: cfg.firstDueDate || null,
      fallbackStartDate: `${competencyPeriodOf(cfg.competency)}-01`,
      fallbackDueDay: lease.due_day || 10,
      obligationDueDay: unitDueDay("iptu"),
      cycleStartDate: `${competencyPeriodOf(cfg.competency)}-01`,
      issueDay: issueDayOf(cfg.competency),
      transactionType: typeFromChargeTo(lc.charge_to),
      contactId: lc.charge_to === "tenant" ? null : lc.responsible_contact_id,
      existingCompetencies,
    });
  }, [lease, blocks.iptu, existingCompetencies, obligationsConfig]);

  /**
   * Encargos adicionais (condomínio, energia, água, gás, outros): MENSAIS,
   * competência acompanhando o mês, igual ao aluguel — por isso somem quando a
   * janela do aluguel está bloqueada.
   */
  const additionalGroups = useMemo(() => {
    if (!lease || !window || window.blocked) return [];
    return additionalConfigs
      .map((cfg) => {
        const state = blocks[cfg.type];
        const label = resolveObligationLabel(cfg.type, cfg.label, customTypeNames);
        if (!state) return { cfg, label, installments: [] as PlannedInstallment[] };
        return {
          cfg,
          label,
          installments: buildMonthlyChargeInstallments({
            obligationType: cfg.type,
            label,
            startDate: `${competencyPeriodOf(state.competency)}-01`,
            months: Math.max(0, state.months),
            amount: state.amount,
            firstDueDate: state.firstDueDate || null,
            obligationDueDay: unitDueDay(cfg.type),
            fallbackDueDay: lease.due_day || 10,
            issueDay: issueDayOf(state.competency),
            transactionType: typeFromChargeTo(cfg.charge_to),
            contactId: cfg.charge_to === "tenant" ? null : cfg.responsible_contact_id,
            existingCompetencies,
          }),
        };
      })
      .filter((g) => g.installments.length > 0);
  }, [lease, window, additionalConfigs, blocks, existingCompetencies, obligationsConfig]);

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
      if (!i.alreadyExists) next.add(i.key);
    }
    setSelected(next);
  }, [
    open,
    loadingExisting,
    rentInstallments,
    insuranceInstallments,
    iptuInstallments,
    additionalInstallments,
  ]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = (keys: string[]) =>
    setSelected((prev) => new Set([...prev, ...keys]));

  const clearAll = (keys: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });

  const confirmedInstallments = useMemo(() => {
    const list: PlannedInstallment[] = [];
    if (enabled.rent && !window?.blocked) list.push(...rentInstallments);
    if (enabled.fire_insurance) list.push(...insuranceInstallments);
    if (enabled.iptu) list.push(...iptuInstallments);
    for (const g of additionalGroups) {
      if (enabled[g.cfg.type]) list.push(...g.installments);
    }
    return list.filter((i) => !i.alreadyExists && selected.has(i.key));
  }, [
    enabled,
    window,
    rentInstallments,
    insuranceInstallments,
    iptuInstallments,
    additionalGroups,
    selected,
  ]);

  const totalIncome = confirmedInstallments
    .filter((i) => (i.transactionType ?? "income") === "income")
    .reduce((s, i) => s + i.amount, 0);
  const totalExpense = confirmedInstallments
    .filter((i) => i.transactionType === "expense")
    .reduce((s, i) => s + i.amount, 0);

  const insuranceUnpriced =
    !!lease?.fire_insurance?.enabled && (blocks.fire_insurance?.amount ?? 0) <= 0;
  const iptuUnpriced = !!lease?.iptu_charge?.enabled && (blocks.iptu?.amount ?? 0) <= 0;
  const hasObligations =
    !!lease?.fire_insurance?.enabled ||
    !!lease?.iptu_charge?.enabled ||
    additionalConfigs.length > 0;

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
    if (lease.fire_insurance?.enabled && blocks.fire_insurance?.competency) {
      patch.fire_insurance = {
        ...lease.fire_insurance,
        competency_month: competencyPeriodOf(blocks.fire_insurance.competency),
      };
    }
    if (lease.iptu_charge?.enabled && blocks.iptu?.competency) {
      patch.iptu_charge = { ...lease.iptu_charge, competency_month: competencyPeriodOf(blocks.iptu.competency) };
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
        ownerContactId: lease.owner_contact_id ?? null,
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => isGenerating && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Gerar lançamentos do contrato
          </DialogTitle>
          <DialogDescription>
            Confira e ajuste cada parcela: o que aparece aqui é exatamente o que será lançado.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do contrato */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-medium">{unitLabel}</span>
            <span className="text-muted-foreground">{tenantName}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
            <span>Aluguel {formatCurrency(rentAmountDefault)}</span>
            <span>Vencimento dia {lease.due_day}</span>
          </div>
        </div>

        {window.blocked && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              {`O reajuste previsto${
                lease.next_adjustment_date
                  ? ` para ${format(parseISO(lease.next_adjustment_date), "dd/MM/yyyy")}`
                  : ""
              } está vencido, então não é possível lançar aluguel até aplicá-lo. Os encargos abaixo têm ciclo próprio e podem ser lançados normalmente.`}
            </p>
          </div>
        )}

        {!window.blocked && allAlreadyLaunched && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              Todas as competências desta janela já estão lançadas no financeiro. Não há nada
              a duplicar.
            </p>
          </div>
        )}

        {!window.blocked && (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
              <CalendarClock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                {firstRent && lastRent ? (
                  <>
                    Aluguel de {firstRent.competencyLabel} a {lastRent.competencyLabel} —{" "}
                    {window.reasonLabel}
                  </>
                ) : (
                  window.reasonLabel
                )}
              </p>
            </div>

            {blocks.rent && (
              <ProjectionBlock
                blockKey="rent"
                title="Aluguel"
                icon={<Home className="h-4 w-4" />}
                transactionType="income"
                installments={rentInstallments}
                config={blocks.rent}
                onConfigChange={(patch) => patchBlock("rent", patch)}
                enabled={!!enabled.rent}
                onEnabledChange={(v) => setEnabled((p) => ({ ...p, rent: v }))}
                selected={selected}
                onToggle={toggle}
                onSelectAll={selectAll}
                onClearAll={clearAll}
              />
            )}
          </>
        )}

        {(hasObligations || insuranceUnpriced || iptuUnpriced) && !obligationsRevealed && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
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
                setEnabled((p) => ({
                  ...p,
                  fire_insurance: !!lease.fire_insurance?.enabled,
                  iptu: !!lease.iptu_charge?.enabled,
                  ...Object.fromEntries(additionalConfigs.map((o) => [o.type, true])),
                }));
              }}
            >
              Incluir obrigações neste lançamento
            </Button>
          </div>
        )}

        {obligationsRevealed && blocks.fire_insurance && (
          <ProjectionBlock
            blockKey="fire_insurance"
            title="Seguro Incêndio"
            icon={<ShieldCheck className="h-4 w-4" />}
            transactionType={typeFromChargeTo(lease.fire_insurance?.charge_to)}
            installments={insuranceInstallments}
            config={blocks.fire_insurance}
            onConfigChange={(patch) => patchBlock("fire_insurance", patch)}
            enabled={!!enabled.fire_insurance}
            onEnabledChange={(v) => setEnabled((p) => ({ ...p, fire_insurance: v }))}
            selected={selected}
            onToggle={toggle}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            competencyLabel="Competência de referência (emissão)"
            warning={
              insuranceUnpriced ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    Valor da parcela não definido no contrato. Informe o valor abaixo para
                    liberar o lançamento.
                  </p>
                </div>
              ) : null
            }
          />
        )}

        {obligationsRevealed && blocks.iptu && (
          <ProjectionBlock
            blockKey="iptu"
            title="IPTU"
            icon={<Landmark className="h-4 w-4" />}
            transactionType={typeFromChargeTo(lease.iptu_charge?.charge_to)}
            installments={iptuInstallments}
            config={blocks.iptu}
            onConfigChange={(patch) => patchBlock("iptu", patch)}
            enabled={!!enabled.iptu}
            onEnabledChange={(v) => setEnabled((p) => ({ ...p, iptu: v }))}
            selected={selected}
            onToggle={toggle}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            competencyLabel="Competência de referência (exercício, emissão)"
            warning={
              iptuUnpriced ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    Valor da parcela não definido no contrato. Informe o valor abaixo para
                    liberar o lançamento.
                  </p>
                </div>
              ) : null
            }
          />
        )}

        {obligationsRevealed && !window.blocked &&
          additionalGroups.map((g) => (
            <ProjectionBlock
              key={g.cfg.type}
              blockKey={g.cfg.type}
              title={g.label}
              icon={<Receipt className="h-4 w-4" />}
              transactionType={typeFromChargeTo(g.cfg.charge_to)}
              installments={g.installments}
              config={blocks[g.cfg.type]}
              onConfigChange={(patch) => patchBlock(g.cfg.type, patch)}
              enabled={!!enabled[g.cfg.type]}
              onEnabledChange={(v) => setEnabled((p) => ({ ...p, [g.cfg.type]: v }))}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              notice={
                isUncategorizedObligation(g.cfg.type)
                  ? UNCATEGORIZED_OBLIGATION_NOTICE
                  : undefined
              }
            />
          ))}

        {window.blocked &&
          additionalConfigs.map((cfg) => (
            <div
              key={cfg.type}
              className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {resolveObligationLabel(cfg.type, cfg.label, customTypeNames)}
                </span>{" "}
                acompanha a competência do aluguel e só volta a ser lançado depois que o
                reajuste for aplicado.
              </p>
            </div>
          ))}

        {/* Barra fixa: total consolidado + ações */}
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border bg-card px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm tabular-nums">
            <span className="font-medium">
              {confirmedInstallments.length} lançamento
              {confirmedInstallments.length === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {formatCurrency(totalIncome)} em receitas ·{" "}
              {formatCurrency(totalExpense)} em despesas
            </span>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmLeaseProjectionDialog;
