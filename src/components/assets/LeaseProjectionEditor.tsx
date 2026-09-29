import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Home,
  Receipt,
  ShieldCheck,
  Landmark,
  MinusCircle,
  FileMinus,
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
  firstDueOnOrAfter,
  proRataFirstMonth,
  resolveFirstAdjustedDueDate,
  resolveRentDueOffset,
  type PlannedInstallment,
} from "@/lib/lease-projection";
import { formatDateOnly } from "@/lib/date-only";
import {
  buildRentDeductionInstallments,
  buildWithholdingInstallments,
  resolveGraceSchedule,
  summarizeSettlement,
} from "@/lib/lease-special-conditions";
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
import { RentCompositionDialog } from "@/components/finance/RentCompositionDialog";
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
  RentDeductionConfig,
  RentGraceConfig,
  RentWithholdingConfig,
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
  rent_grace?: RentGraceConfig | null;
  rent_deductions?: RentDeductionConfig[] | null;
  rent_withholding?: RentWithholdingConfig | null;
  admin_fee_percentage?: number | null;
  unit?: { unit_number?: string | null; address?: string | null } | null;
  tenant?: { name?: string | null } | null;
  tenant_contact?: { name?: string | null } | null;
}

export interface LeaseProjectionEditorHandle {
  /** Insere as parcelas selecionadas. Devolve quantas foram criadas. */
  submit: () => Promise<number>;
  /** Quantas parcelas estão marcadas agora. */
  count: number;
}

export interface LeaseProjectionEditorProps {
  lease: LeaseForProjection;
  /** Sobrescreve o valor do aluguel (ex.: logo após um reajuste). */
  overrideRentAmount?: number;
  /** Sobrescreve o início da janela (ex.: novo ciclo pós-reajuste). */
  overrideStartDate?: string;
  /**
   * Modo pós-reajuste: por padrão lança APENAS os aluguéis reajustados.
   * As obrigações (IPTU/seguro) ficam recolhidas atrás de uma ação secundária.
   */
  postAdjustment?: boolean;
  /** Mostra o resumo do contrato no topo (o pai pode ter o seu próprio). */
  showSummary?: boolean;
  /** Avisa o pai quando a seleção muda, para ele rotular o botão. */
  onSelectionChange?: (count: number, total: number) => void;
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

/**
 * Miolo editável da projeção de lançamentos do contrato.
 *
 * NÃO é um Dialog: é só o conteúdo, para poder ser usado tanto dentro do
 * `ConfirmLeaseProjectionDialog` (finalizar contrato) quanto embutido na
 * Calculadora de Reajuste, onde abrir um segundo Dialog aninhado não funciona.
 */
export const LeaseProjectionEditor = forwardRef<
  LeaseProjectionEditorHandle,
  LeaseProjectionEditorProps
>(function LeaseProjectionEditor(
  {
    lease,
    overrideRentAmount,
    overrideStartDate,
    postAdjustment = false,
    showSummary = true,
    onSelectionChange,
  },
  ref
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generateProjections } = useLeaseFinancialProjection();
  const { data: existingCompetencies, isLoading: loadingExisting } =
    useExistingLeaseCompetencies(lease?.id ?? null, true);
  const { data: customObligationTypes } = useCustomObligationTypes();
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [compositionTxId, setCompositionTxId] = useState<string | null>(null);
  useEffect(() => {
    setAmountOverrides({});
  }, [lease?.id]);
  const onAmountOverride = (key: string, amount: number | null) =>
    setAmountOverrides((prev) => {
      const next = { ...prev };
      if (amount === null) delete next[key];
      else next[key] = amount;
      return next;
    });
  const applyOverride = (i: PlannedInstallment): PlannedInstallment =>
    i.key in amountOverrides
      ? { ...i, amount: amountOverrides[i.key], meta: { ...(i.meta || { kind: "irrf" }), manual_override: true } as PlannedInstallment["meta"] }
      : i;
  const handleEditExisting = async (i: PlannedInstallment) => {
    if (!lease) return;
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("id")
      .or(`lease_id.eq.${lease.id},reference.eq.lease:${lease.id}`)
      .eq("competency_period", i.competencyPeriod)
      .or("obligation_type.eq.rent,obligation_type.is.null")
      .neq("status", "cancelled")
      .limit(1);
    if (error || !data?.length) {
      toast({ title: "O aluguel deste mês não foi encontrado no financeiro", variant: "destructive" });
      return;
    }
    setCompositionTxId(data[0].id);
  };

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
    enabled: !!lease?.unit_id,
  });

  /** `due_day` configurado no imóvel para uma obrigação (null quando não houver). */
  const unitDueDay = (key: string): number | null => {
    const cfg = obligationsConfig?.[key];
    const day = Number(cfg?.due_day);
    return day > 0 ? day : null;
  };

  /**
   * Série de aluguel JÁ LANÇADA do contrato, derivada das chaves
   * `tipo:yyyy-MM:yyyy-MM-dd` (aluguel com obligation_type nulo vira "rent"):
   * - competências com aluguel (dedup por competência, qualquer vencimento);
   * - a parcela de competência mais recente, para descobrir o regime
   *   (vencido = vence no mês seguinte, antecipado = no próprio mês).
   */
  const { existingRentCompetencies, rentDueOffset } = useMemo(() => {
    const periods = new Set<string>();
    let lastRent: { competencyPeriod: string; dueDate: string } | null = null;
    for (const key of existingCompetencies ?? []) {
      const [type, period, due] = key.split(":");
      if (type !== "rent" || !period) continue;
      periods.add(period);
      if (due && (!lastRent || period > lastRent.competencyPeriod ||
          (period === lastRent.competencyPeriod && due > lastRent.dueDate))) {
        lastRent = { competencyPeriod: period, dueDate: due };
      }
    }
    return {
      existingRentCompetencies: periods,
      rentDueOffset: resolveRentDueOffset(lastRent),
    };
  }, [existingCompetencies]);

  // --- Estado editável, um BlockConfig por bloco ---
  const [blocks, setBlocks] = useState<Record<string, BlockConfig>>({});
  const [rentProRata, setRentProRata] = useState(false);
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
   * Reset ao montar/trocar de contrato: cada bloco nasce com exatamente o que o
   * motor calculava antes, para quem não mexer em nada ter o mesmo resultado.
   */
  useEffect(() => {
    if (!lease || !window) return;
    // Pós-reajuste o 1º vencimento depende do regime (vencido/antecipado) lido
    // da série já lançada — esperar o fim do carregamento para não nascer com
    // o offset padrão e trocar logo depois.
    if (postAdjustment && loadingExisting) return;

    const windowMonth = startDate ? startDate.slice(0, 7) : format(new Date(), "yyyy-MM");
    const base = startDate ? parseISO(startDate) : new Date();
    const dueDay = lease.due_day || 10;
    // Pós-reajuste: o valor novo vale da competência do mês de aniversário e o
    // 1º boleto vence no mês seguinte (aluguel vencido) ou no próprio mês
    // (antecipado), conforme a série já lançada do contrato.
    const rentFirstDueDefault = postAdjustment
      ? format(
          resolveFirstAdjustedDueDate(parseISO(`${windowMonth}-01`), dueDay, rentDueOffset),
          "yyyy-MM-dd"
        )
      : format(firstDueOnOrAfter(base, dueDay), "yyyy-MM-dd");
    // Emissão default = dia de início do contrato (mesma regra do motor legado).
    const issueDay = lease.start_date ? getDate(parseISO(lease.start_date)) : 1;
    /** Competência completa: mês do parâmetro + dia de emissão, com clamp de mês curto. */
    const withIssueDay = (yyyyMm: string) =>
      format(calculateDueDate(parseISO(`${yyyyMm}-01`), issueDay), "yyyy-MM-dd");

    const next: Record<string, BlockConfig> = {
      rent: {
        competency: withIssueDay(windowMonth),
        firstDueDate: rentFirstDueDefault,
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
  }, [lease?.id, window?.months, window?.blocked, rentAmountDefault, startDate, postAdjustment, rentDueOffset, loadingExisting]);

  const patchBlock = (key: string, patch: Partial<BlockConfig>) =>
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // --- Geração das parcelas a partir do estado dos blocos ---
  const rentInstallments = useMemo(() => {
    const cfg = blocks.rent;
    if (!lease || !window || window.blocked || !cfg) return [];
    const list = buildRentInstallments({
      startDate: `${competencyPeriodOf(cfg.competency)}-01`,
      months: Math.max(0, cfg.months),
      amount: cfg.amount,
      dueDay: lease.due_day || 10,
      firstDueDate: cfg.firstDueDate || null,
      issueDay: issueDayOf(cfg.competency),
      existingCompetencies,
      existingRentCompetencies,
      // Pós-reajuste não aplica carência (ela já passou ou não se reajusta)
      graceSchedule: postAdjustment
        ? undefined
        : resolveGraceSchedule(lease.rent_grace, lease.start_date),
    });
    // Pró-rata do 1º mês: só na competência do início do contrato
    const first = list[0];
    if (
      rentProRata && first && !first.isGrace && !postAdjustment && lease.start_date &&
      first.competencyPeriod === lease.start_date.slice(0, 7)
    ) {
      const pr = proRataFirstMonth(parseISO(lease.start_date), first.amount);
      list[0] = { ...first, amount: pr.amount, description: `${first.description} (pró-rata ${pr.days} de ${pr.totalDays} dias)` };
    }
    return list;
  }, [lease, window, blocks.rent, existingCompetencies, existingRentCompetencies, postAdjustment, rentProRata]);

  const rentProRataInfo = useMemo(() => {
    const first = rentInstallments[0];
    if (!lease?.start_date || postAdjustment || !first || first.isGrace) return null;
    if (first.competencyPeriod !== lease.start_date.slice(0, 7)) return null;
    const pr = proRataFirstMonth(parseISO(lease.start_date), blocks.rent?.amount || 0);
    return pr.days === pr.totalDays ? null : pr;
  }, [lease, postAdjustment, rentInstallments, blocks.rent]);

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

  /* ─── Condições especiais: abatimentos e IRRF, derivados do aluguel ─── */
  const markExisting = (list: PlannedInstallment[]) =>
    list.map((i) => ({ ...i, alreadyExists: !!existingCompetencies?.has(i.dedupKey ?? i.key) }));

  const hasDeductions = (lease?.rent_deductions || []).some((d) => d?.enabled && Number(d.amount) > 0);
  const deductionResult = useMemo(() => {
    if (!lease || !hasDeductions || rentInstallments.length === 0)
      return { installments: [] as PlannedInstallment[], skipped: 0, unallocated: 0, requestedCount: 0, transferredFrom: [] as string[] };
    const r = buildRentDeductionInstallments({
      deductions: lease.rent_deductions,
      rentInstallments,
      ownerContactId: lease.owner_contact_id ?? null,
    });
    return { ...r, installments: markExisting(r.installments) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease, hasDeductions, rentInstallments, existingCompetencies]);
  const deductionInstallments = deductionResult.installments;

  const hasWithholding = !!lease?.rent_withholding?.enabled;
  const deductionView = useMemo(() => deductionInstallments.map(applyOverride), [deductionInstallments, amountOverrides]);
  const withholdingInstallments = useMemo(() => {
    if (!lease || !hasWithholding || rentInstallments.length === 0) return [];
    const condo = additionalConfigs.find((o) => o.type === "condominium");
    return markExisting(
      buildWithholdingInstallments({
        withholding: lease.rent_withholding,
        rentInstallments,
        baseDeductions: {
          iptu: iptuAmountDefault ?? 0,
          condominium: condo?.installment_amount || 0,
          adminFeePercent: Number(lease.admin_fee_percentage) || 0,
        },
        tenantContactId: lease.tenant_contact_id,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lease, hasWithholding, rentInstallments, additionalConfigs, iptuAmountDefault, existingCompetencies]);

  /** Linhas derivadas seguem a seleção do aluguel da mesma competência. */
  useEffect(() => {
    const unselectedRent = new Set(
      rentInstallments
        .filter((r) => !r.alreadyExists && !r.isGrace && !selected.has(r.key))
        .map((r) => r.settlementKey ?? r.competencyPeriod)
    );
    if (!enabled.rent) rentInstallments.forEach((r) => unselectedRent.add(r.settlementKey ?? r.competencyPeriod));
    const toDrop = [...deductionInstallments, ...withholdingInstallments]
      .filter((i) => selected.has(i.key) && unselectedRent.has(i.settlementKey ?? i.competencyPeriod))
      .map((i) => i.key);
    if (toDrop.length > 0) {
      setSelected((prev) => {
        const next = new Set(prev);
        toDrop.forEach((k) => next.delete(k));
        return next;
      });
    }
  }, [selected, enabled.rent, rentInstallments, deductionInstallments, withholdingInstallments]);

  // Selecionar por padrão tudo que ainda não existe
  useEffect(() => {
    const next = new Set<string>();
    for (const i of [
      ...rentInstallments,
      ...insuranceInstallments,
      ...iptuInstallments,
      ...additionalInstallments,
      ...deductionInstallments,
      ...withholdingInstallments,
    ]) {
      if (!i.alreadyExists && !i.isGrace) next.add(i.key);
    }
    setSelected(next);
  }, [
    loadingExisting,
    rentInstallments,
    insuranceInstallments,
    iptuInstallments,
    additionalInstallments,
    deductionInstallments,
    withholdingInstallments,
  ]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = (keys: string[]) => setSelected((prev) => new Set([...prev, ...keys]));

  const clearAll = (keys: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });

  const withholdingView = useMemo(() => withholdingInstallments.map(applyOverride), [withholdingInstallments, amountOverrides]);

  const confirmedInstallments = useMemo(() => {
    const list: PlannedInstallment[] = [];
    if (enabled.rent && !window?.blocked) list.push(...rentInstallments);
    if (enabled.fire_insurance) list.push(...insuranceInstallments);
    if (enabled.iptu) list.push(...iptuInstallments);
    for (const g of additionalGroups) {
      if (enabled[g.cfg.type]) list.push(...g.installments);
    }
    if (enabled.rent && !window?.blocked) {
      if (enabled.rent_deductions !== false) list.push(...deductionView);
      if (enabled.irrf !== false) list.push(...withholdingView);
    }
    // CHECK amount > 0 no banco: linhas zeradas não são lançadas
    return list.filter((i) => !i.alreadyExists && !i.isGrace && selected.has(i.key) && i.amount > 0);
  }, [
    enabled,
    window,
    rentInstallments,
    insuranceInstallments,
    iptuInstallments,
    additionalGroups,
    deductionView,
    withholdingView,
    selected,
  ]);

  /** Líquido esperado do inquilino por competência (aluguel − abatimentos − IRRF). */
  const settlementRows = useMemo(
    () =>
      summarizeSettlement(confirmedInstallments.filter((i) => !!i.settlementKey)).filter(
        (r) => r.gross > 0
      ),
    [confirmedInstallments]
  );
  const settlementNetTotal = settlementRows.reduce((s, r) => s + r.net, 0);
  const settlementHasAdjustments = settlementRows.some((r) => r.deductions > 0 || r.irrf > 0 || r.grace > 0);

  const totalIncome = confirmedInstallments
    .filter((i) => (i.transactionType ?? "income") === "income")
    .reduce((s, i) => s + i.amount, 0);
  const totalExpense = confirmedInstallments
    .filter((i) => i.transactionType === "expense")
    .reduce((s, i) => s + i.amount, 0);

  // Avisa o pai para ele rotular/habilitar o botão dele.
  useEffect(() => {
    onSelectionChange?.(confirmedInstallments.length, totalIncome + totalExpense);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedInstallments.length, totalIncome, totalExpense]);

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
      patch.iptu_charge = {
        ...lease.iptu_charge,
        competency_month: competencyPeriodOf(blocks.iptu.competency),
      };
    }
    if (Object.keys(patch).length === 0) return;
    await supabase.from("leases").update(patch as any).eq("id", lease.id);
  };

  /**
   * Insere as parcelas selecionadas. Lança o erro para cima: quem chamou decide
   * se fecha, se mantém o dialog aberto ou se oferece nova tentativa.
   */
  const submit = async (): Promise<number> => {
    if (!lease || confirmedInstallments.length === 0) return 0;

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

    return result.count;
  };

  useImperativeHandle(ref, () => ({ submit, count: confirmedInstallments.length }));

  if (!lease || !window) return null;

  const tenantName = lease.tenant?.name || lease.tenant_contact?.name || "Inquilino";
  const unitLabel = lease.unit?.unit_number || lease.unit?.address || "Imóvel";
  const firstRent = rentInstallments[0];
  const lastRent = rentInstallments[rentInstallments.length - 1];

  return (
    <div className="space-y-4">
      {showSummary && (
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
      )}

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
            Todas as competências desta janela já estão lançadas no financeiro. Não há nada a
            duplicar.
          </p>
        </div>
      )}

      {!window.blocked && (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <CalendarClock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p>
                {firstRent && lastRent ? (
                  <>
                    Aluguel de {firstRent.competencyLabel} a {lastRent.competencyLabel} —{" "}
                    {window.reasonLabel}
                  </>
                ) : (
                  window.reasonLabel
                )}
              </p>
              {postAdjustment && firstRent && (
                <p className="text-muted-foreground">
                  Valor novo a partir da competência {firstRent.competencyLabel}; 1º boleto com
                  valor novo vence em {formatDateOnly(firstRent.dueDate)} (
                  {rentDueOffset === 0
                    ? "aluguel pago no próprio mês"
                    : "aluguel pago no mês seguinte"}
                  ).
                </p>
              )}
            </div>
          </div>

          {blocks.rent && (
            <ProjectionBlock
              key="rent-block"
              blockKey="rent"
              title="Aluguel"
              icon={<Home className="h-4 w-4" />}
              transactionType="income"
              installments={rentInstallments}
              config={blocks.rent}
              onConfigChange={(patch) => patchBlock("rent", patch)}
              proRata={
                rentProRataInfo
                  ? { checked: rentProRata, onChange: setRentProRata, days: rentProRataInfo.days, totalDays: rentProRataInfo.totalDays }
                  : undefined
              }
              enabled={!!enabled.rent}
              onEnabledChange={(v) => setEnabled((p) => ({ ...p, rent: v }))}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              onEditExisting={handleEditExisting}
            />
          )}

          {enabled.rent && deductionInstallments.length > 0 && (
            <ProjectionBlock
              blockKey="rent_deductions"
              title="Abatimentos do aluguel (encargo do proprietário)"
              icon={<MinusCircle className="h-4 w-4" />}
              transactionType="expense"
              installments={deductionInstallments}
              countLabel={
                deductionResult.transferredFrom.length > 0
                  ? `${deductionResult.requestedCount} parcelas (${deductionResult.transferredFrom.length} transferida${deductionResult.transferredFrom.length > 1 ? "s" : ""} da carência de ${deductionResult.transferredFrom
                      .map((c) => format(parseISO(`${c}-01`), "MMM/yyyy", { locale: ptBR }))
                      .join(", ")})`
                  : undefined
              }
              amountOverrides={amountOverrides}
              onAmountOverride={onAmountOverride}
              onEditExisting={handleEditExisting}
              hideConfig
              enabled={enabled.rent_deductions !== false}
              onEnabledChange={(v) => setEnabled((p) => ({ ...p, rent_deductions: v }))}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              warning={
                deductionResult.unallocated > 0 || deductionResult.skipped > 0 ? (
                  <div className="rounded-md border border-border bg-muted/40 p-2 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Parte do abatimento fica para o próximo lançamento
                      {deductionResult.unallocated > 0
                        ? ` (${formatCurrency(deductionResult.unallocated)} sem competência nesta janela)`
                        : ""}
                      .
                    </p>
                  </div>
                ) : null
              }
            />
          )}

          {enabled.rent && withholdingInstallments.length > 0 && (
            <ProjectionBlock
              blockKey="irrf"
              title="IRRF retido na fonte"
              icon={<FileMinus className="h-4 w-4" />}
              transactionType="expense"
              installments={withholdingInstallments}
              amountOverrides={amountOverrides}
              onAmountOverride={onAmountOverride}
              onEditExisting={handleEditExisting}
              hideConfig
              enabled={enabled.irrf !== false}
              onEnabledChange={(v) => setEnabled((p) => ({ ...p, irrf: v }))}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              notice={
                lease.rent_withholding?.mode === "table"
                  ? "Estimativa. Ajuste o valor de cada mês para o que o inquilino realmente reteve."
                  : undefined
              }
            />
          )}
        </>
      )}

      {(hasObligations || insuranceUnpriced || iptuUnpriced) && !obligationsRevealed && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Este reajuste lança apenas os aluguéis reajustados. IPTU e seguro não são alterados
            nem relançados.
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
                  Valor da parcela não definido no contrato. Informe o valor abaixo para liberar
                  o lançamento.
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
                  Valor da parcela não definido no contrato. Informe o valor abaixo para liberar
                  o lançamento.
                </p>
              </div>
            ) : null
          }
        />
      )}

      {obligationsRevealed &&
        !window.blocked &&
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
              isUncategorizedObligation(g.cfg.type) ? UNCATEGORIZED_OBLIGATION_NOTICE : undefined
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
              acompanha a competência do aluguel e só volta a ser lançado depois que o reajuste
              for aplicado.
            </p>
          </div>
        ))}

      {/* Total consolidado do que está selecionado agora */}
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm tabular-nums">
        <span className="font-medium">
          {confirmedInstallments.length} lançamento
          {confirmedInstallments.length === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground">
          {" "}
          · {formatCurrency(totalIncome)} em receitas · {formatCurrency(totalExpense)} em
          despesas
        </span>
        {settlementHasAdjustments && settlementRows.length > 0 && (
          <details className="mt-1.5">
            <summary className="cursor-pointer text-xs">
              Líquido esperado do inquilino:{" "}
              <span className="font-semibold">{formatCurrency(settlementNetTotal)}</span>
              <span className="text-muted-foreground">
                {" "}
                em {settlementRows.length} competência{settlementRows.length === 1 ? "" : "s"}
              </span>
            </summary>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground max-h-40 overflow-y-auto">
              {settlementRows.map((r) => (
                <li key={r.competency} className="flex justify-between gap-2">
                  <span>
                    {format(parseISO(`${r.competency}-01`), "MM/yyyy")}
                    {r.deductions > 0 ? ` · abat. ${formatCurrency(r.deductions)}` : ""}
                    {r.irrf > 0 ? ` · IRRF ${formatCurrency(r.irrf)}` : ""}
                  </span>
                  <span className="text-foreground">{formatCurrency(r.net)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <RentCompositionDialog
        open={!!compositionTxId}
        onOpenChange={(o) => !o && setCompositionTxId(null)}
        transactionId={compositionTxId}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["lease-competencies"] });
          queryClient.invalidateQueries({ queryKey: ["lease-transactions"] });
        }}
      />
    </div>
  );
});

export default LeaseProjectionEditor;
