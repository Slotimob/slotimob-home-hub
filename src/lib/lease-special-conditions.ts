import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RentDeductionConfig, RentGraceConfig, RentWithholdingConfig } from "@/hooks/useLeases";
import { buildRentInstallments, calculateDueDate, firstDueOnOrAfter, monthLabel, type PlannedInstallment } from "./lease-projection";
import { todayInSaoPauloDateOnly } from "./date-only";
import { estimateIrrfMonthly } from "./irrf";

/**
 * Condições especiais do contrato: carência, abatimentos (encargo do
 * proprietário descontado do aluguel) e IRRF retido pelo inquilino.
 * Funções puras: sem banco, sem UI.
 */

export type GraceMonth = { mode: "free" | "percent" | "fixed"; value: number };

const round2 = (n: number) => Math.round(n * 100) / 100;
const competencyDate = (c: string) => parseISO(`${c}-01`);
const shiftCompetency = (c: string, n: number) => format(addMonths(competencyDate(c), n), "yyyy-MM");
const shortLabel = (c: string) => {
  const l = format(competencyDate(c), "MMM/yyyy", { locale: ptBR });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

/* ─── Carência ─────────────────────────────────────────────────────── */

export function resolveGraceSchedule(
  grace: RentGraceConfig | null | undefined,
  leaseStartDate: string
): Map<string, GraceMonth> {
  const map = new Map<string, GraceMonth>();
  if (!grace?.enabled) return map;
  let current = grace.first_competency || leaseStartDate.slice(0, 7);
  for (const tier of grace.tiers || []) {
    const months = Math.max(0, Math.floor(tier.months || 0));
    for (let i = 0; i < months; i++) {
      map.set(current, { mode: tier.mode, value: Number(tier.value ?? 0) });
      current = shiftCompetency(current, 1);
    }
  }
  return map;
}

export function graceSummary(
  grace: RentGraceConfig | null | undefined,
  leaseStartDate: string
): { lastCompetency: string | null; freeMonths: number; reducedMonths: number; label: string } {
  const schedule = resolveGraceSchedule(grace, leaseStartDate);
  const entries = Array.from(schedule.entries());
  if (entries.length === 0) {
    return { lastCompetency: null, freeMonths: 0, reducedMonths: 0, label: "" };
  }
  const describe = (g: GraceMonth) =>
    g.mode === "free"
      ? "isento"
      : g.mode === "percent"
        ? `com ${g.value}% de desconto`
        : `pagando ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(g.value)}`;

  // Agrupa meses consecutivos com a mesma regra
  const parts: string[] = [];
  let start = entries[0][0];
  let prev = entries[0];
  for (let i = 1; i <= entries.length; i++) {
    const cur = entries[i];
    const same = cur && cur[1].mode === prev[1].mode && cur[1].value === prev[1].value;
    if (!same) {
      const range = start === prev[0] ? shortLabel(start) : `${shortLabel(start)} a ${shortLabel(prev[0])}`;
      parts.push(`${range} ${describe(prev[1])}`);
      if (cur) start = cur[0];
    }
    if (cur) prev = cur;
  }

  return {
    lastCompetency: entries[entries.length - 1][0],
    freeMonths: entries.filter(([, g]) => g.mode === "free").length,
    reducedMonths: entries.filter(([, g]) => g.mode !== "free").length,
    label: parts.join("; "),
  };
}

/* ─── Abatimentos ──────────────────────────────────────────────────── */

export function resolveDeductionCompetencies(
  d: RentDeductionConfig,
  availableCompetencies: string[]
): string[] {
  if (d.recurrence === "once") return [d.first_competency];
  if (d.recurrence === "installments") {
    const n = Math.max(1, Math.floor(d.installments || 1));
    return Array.from({ length: n }, (_, i) => shiftCompetency(d.first_competency, i));
  }
  return [...availableCompetencies].filter((c) => c >= d.first_competency).sort();
}

export function buildRentDeductionInstallments({
  deductions,
  rentInstallments,
  ownerContactId,
}: {
  deductions: RentDeductionConfig[] | null | undefined;
  rentInstallments: PlannedInstallment[];
  ownerContactId?: string | null;
}): {
  installments: PlannedInstallment[];
  skipped: number;
  unallocated: number;
  /** Nº de parcelas pedidas (competências da janela). */
  requestedCount: number;
  /** Competências (YYYY-MM) cujo abatimento foi transferido (ex.: mês isento). */
  transferredFrom: string[];
} {
  const rentByComp = new Map(rentInstallments.map((r) => [r.competencyPeriod, r]));
  const comps = Array.from(rentByComp.keys()).sort();
  const active = (deductions || []).filter((d) => d.enabled && Number(d.amount) > 0);
  let skipped = 0;

  // Pedido por abatimento e competência (só competências da janela)
  const requested = active.map((d) => {
    const perComp = new Map<string, number>();
    for (const c of resolveDeductionCompetencies(d, comps)) {
      if (!rentByComp.has(c)) {
        skipped++;
        continue;
      }
      perComp.set(c, round2((perComp.get(c) ?? 0) + Number(d.amount)));
    }
    return { d, perComp, carry: 0 };
  });

  const installments: PlannedInstallment[] = [];
  const transferredFrom: string[] = [];
  for (const c of comps) {
    const rent = rentByComp.get(c)!;
    let capacity = Math.max(0, rent.amount);
    for (const r of requested) {
      const wanted = round2((r.perComp.get(c) ?? 0) + r.carry);
      if (wanted <= 0) continue;
      const take = round2(Math.min(wanted, capacity));
      r.carry = round2(wanted - take);
      capacity = round2(capacity - take);
      if ((r.perComp.get(c) ?? 0) > 0 && r.carry > 0 && !transferredFrom.includes(c)) transferredFrom.push(c);
      if (take <= 0) continue;
      const obligationType = `rent_deduction_${r.d.id.slice(0, 8)}`;
      const dedupKey = `${obligationType}:${c}:${rent.dueDate}`;
      installments.push({
        key: dedupKey,
        dedupKey,
        obligationType,
        competencyPeriod: c,
        competencyLabel: rent.competencyLabel,
        dueDate: rent.dueDate,
        issueDate: rent.issueDate,
        amount: take,
        description: `Abatimento: ${r.d.label} (${monthLabel(competencyDate(c))})`,
        transactionType: "expense",
        contactId: ownerContactId ?? null,
        alreadyExists: false,
        meta: { kind: "rent_deduction", deduction_id: r.d.id },
        settlementKey: rent.settlementKey ?? c,
      });
    }
  }

  // Excedente que não coube em nenhuma competência da janela
  const unallocated = round2(requested.reduce((sum, r) => sum + r.carry, 0));
  const requestedCount = requested.reduce((sum, r) => sum + r.perComp.size, 0);
  return { installments, skipped, unallocated, requestedCount, transferredFrom };
}

/* ─── IRRF ─────────────────────────────────────────────────────────── */

export function buildWithholdingInstallments({
  withholding,
  rentInstallments,
  baseDeductions,
  tenantContactId,
}: {
  withholding: RentWithholdingConfig | null | undefined;
  rentInstallments: PlannedInstallment[];
  /** Reservado: abatimentos por competência (não entram na base nesta versão). */
  deductionsByCompetency?: Map<string, number>;
  baseDeductions: { iptu?: number; condominium?: number; adminFeePercent?: number };
  tenantContactId?: string | null;
}): PlannedInstallment[] {
  if (!withholding?.enabled) return [];
  const result: PlannedInstallment[] = [];

  for (const rent of rentInstallments) {
    if (rent.isGrace || !(rent.amount > 0)) continue;
    const gross = rent.amount;
    let base = gross;
    if (withholding.base_deductions?.iptu) base -= baseDeductions.iptu ?? 0;
    if (withholding.base_deductions?.condominium) base -= baseDeductions.condominium ?? 0;
    if (withholding.base_deductions?.admin_fee) base -= gross * ((baseDeductions.adminFeePercent ?? 0) / 100);
    base = round2(Math.max(0, base));

    let value = 0;
    if (withholding.mode === "fixed") value = round2(Number(withholding.fixed_amount ?? 0));
    else if (withholding.mode === "percent") value = round2(gross * (Number(withholding.percent ?? 0) / 100));
    else value = estimateIrrfMonthly({ grossIncome: gross, taxableBase: base });
    if (!(value > 0)) continue;

    const c = rent.competencyPeriod;
    const dedupKey = `irrf:${c}:${rent.dueDate}`;
    result.push({
      key: dedupKey,
      dedupKey,
      obligationType: "irrf",
      competencyPeriod: c,
      competencyLabel: rent.competencyLabel,
      dueDate: rent.dueDate,
      issueDate: rent.issueDate,
      amount: value,
      description: `IRRF retido (${monthLabel(competencyDate(c))})`,
      transactionType: "expense",
      contactId: tenantContactId ?? null,
      alreadyExists: false,
      meta: { kind: "irrf", base },
      settlementKey: rent.settlementKey ?? c,
    });
  }
  return result;
}

/* ─── Resumo da baixa conjunta ─────────────────────────────────────── */

export interface SettlementSummary {
  competency: string;
  gross: number;
  grace: number;
  deductions: number;
  irrf: number;
  net: number;
}

export function summarizeSettlement(installments: PlannedInstallment[]): SettlementSummary[] {
  const map = new Map<string, SettlementSummary>();
  for (const i of installments) {
    const key = i.settlementKey ?? i.competencyPeriod;
    const s = map.get(key) ?? { competency: key, gross: 0, grace: 0, deductions: 0, irrf: 0, net: 0 };
    const kind = i.meta?.kind;
    if (i.obligationType === "rent" || kind === "rent" || kind === "grace") {
      const gross = i.meta?.gross_amount ?? i.amount;
      s.gross = round2(s.gross + gross);
      s.grace = round2(s.grace + (gross - i.amount));
    } else if (kind === "rent_deduction") {
      s.deductions = round2(s.deductions + i.amount);
    } else if (kind === "irrf") {
      s.irrf = round2(s.irrf + i.amount);
    }
    map.set(key, s);
  }
  return Array.from(map.values())
    .map((s) => ({ ...s, net: round2(s.gross - s.grace - s.deductions - s.irrf) }))
    .sort((a, b) => a.competency.localeCompare(b.competency));
}

/* ─── Validação (assistente de contrato) ───────────────────────────── */

export function isValidRentDeduction(d: RentDeductionConfig): boolean {
  return (
    !!d.label?.trim() &&
    Number(d.amount) > 0 &&
    /^\d{4}-\d{2}$/.test(d.first_competency || "") &&
    (d.recurrence !== "installments" || Number(d.installments) >= 2)
  );
}

/** Mensagens de erro das condições especiais; lista vazia = válido. */
export function validateSpecialConditions({
  rentAmount,
  grace,
  deductions,
  withholding,
}: {
  rentAmount: number;
  grace: RentGraceConfig | null | undefined;
  deductions: RentDeductionConfig[] | null | undefined;
  withholding: RentWithholdingConfig | null | undefined;
}): string[] {
  const errors: string[] = [];

  if (grace?.enabled) {
    const tiers = grace.tiers || [];
    if (tiers.length === 0) errors.push("Carência: adicione ao menos uma faixa.");
    tiers.forEach((t, i) => {
      const n = `Carência, faixa ${i + 1}`;
      if (!(Number(t.months) >= 1)) errors.push(`${n}: informe ao menos 1 mês.`);
      if (t.mode === "percent" && !(Number(t.value) >= 1 && Number(t.value) <= 100))
        errors.push(`${n}: o desconto deve ficar entre 1% e 100%.`);
      if (t.mode === "fixed" && !(Number(t.value) > 0 && Number(t.value) < rentAmount))
        errors.push(`${n}: o valor a pagar deve ser maior que zero e menor que o aluguel.`);
    });
  }

  (deductions || []).forEach((d, i) => {
    if (!d.enabled) return;
    const n = `Abatimento ${i + 1}${d.label?.trim() ? ` (${d.label.trim()})` : ""}`;
    if (!d.label?.trim()) errors.push(`${n}: informe a descrição.`);
    if (!(Number(d.amount) > 0)) errors.push(`${n}: informe um valor maior que zero.`);
    if (!/^\d{4}-\d{2}$/.test(d.first_competency || "")) errors.push(`${n}: informe a competência inicial.`);
    if (d.recurrence === "installments" && !(Number(d.installments) >= 2))
      errors.push(`${n}: parcelado exige ao menos 2 parcelas.`);
  });

  if (withholding?.enabled) {
    if (withholding.mode === "fixed" && !(Number(withholding.fixed_amount) > 0))
      errors.push("IRRF: informe o valor fixo retido por mês.");
    if (
      withholding.mode === "percent" &&
      !(Number(withholding.percent) >= 0.01 && Number(withholding.percent) <= 27.5)
    )
      errors.push("IRRF: o percentual deve ficar entre 0,01% e 27,5%.");
  }

  return errors;
}

/* ─── Mês a mês pela configuração do contrato ─────────────────────── */

/** Campos do contrato usados pelas condições financeiras. */
export interface LeaseFinancialConditionsLease {
  id: string;
  rent_amount: number;
  due_day: number;
  start_date: string;
  admin_fee_percentage?: number | null;
  fire_insurance?: any;
  iptu_charge?: any;
  additional_obligations?: any[] | null;
  rent_grace?: RentGraceConfig | null;
  rent_deductions?: RentDeductionConfig[] | null;
  rent_withholding?: RentWithholdingConfig | null;
}

export interface LeaseMonthFigures {
  competency: string | null;
  gross: number;
  grace: number;
  deductions: number;
  irrf: number;
  /** Líquido esperado do inquilino: bruto − carência − abatimentos − IRRF. */
  net: number;
}

/**
 * Valores de um mês calculados pela CONFIGURAÇÃO do contrato.
 * Sem `competency`, usa o mês típico (1ª competência sem carência).
 */
export function computeLeaseMonthFromConfig(
  lease: LeaseFinancialConditionsLease,
  competency?: string
): LeaseMonthFigures {
  const start = lease.start_date || todayInSaoPauloDateOnly();
  const rent = Number(lease.rent_amount) || 0;
  const target = competency ?? null;
  const months = target
    ? Math.max(1, monthsBetween(start.slice(0, 7), target) + 13)
    : 60;
  const rents = buildRentInstallments({
    startDate: `${start.slice(0, 7)}-01`,
    months,
    amount: rent,
    dueDay: lease.due_day || 10,
    graceSchedule: resolveGraceSchedule(lease.rent_grace, start),
  });
  const month = target
    ? rents.find((r) => r.competencyPeriod === target)
    : rents.find((r) => r.meta?.kind === "rent");
  if (!month) {
    return { competency: target, gross: rent, grace: 0, deductions: 0, irrf: 0, net: rent };
  }
  const { installments: deductions } = buildRentDeductionInstallments({
    deductions: lease.rent_deductions,
    rentInstallments: rents,
  });
  const iptu = lease.iptu_charge?.enabled ? Number(lease.iptu_charge.installment_amount) || 0 : 0;
  const condo =
    (lease.additional_obligations || []).find((o: any) => o?.type === "condominium" && o?.enabled)
      ?.installment_amount || 0;
  const irrf = buildWithholdingInstallments({
    withholding: lease.rent_withholding,
    rentInstallments: [month],
    baseDeductions: { iptu, condominium: condo, adminFeePercent: Number(lease.admin_fee_percentage) || 0 },
  });
  const s = summarizeSettlement([
    month,
    ...deductions.filter((d) => d.settlementKey === month.settlementKey),
    ...irrf,
  ])[0];
  return {
    competency: month.competencyPeriod,
    gross: s?.gross ?? rent,
    grace: s?.grace ?? 0,
    deductions: s?.deductions ?? 0,
    irrf: s?.irrf ?? 0,
    net: s?.net ?? rent,
  };
}

/**
 * Próximo vencimento pela configuração: parcela i vence em firstDue + i meses
 * (competência = mês do início + i), pulando competências isentas de carência.
 * @param today "yyyy-MM-dd"
 */
export function nextDueFromConfig(
  lease: { start_date?: string | null; due_day?: number | null; rent_grace?: RentGraceConfig | null },
  today: string
): { competency: string; dueDate: string } | null {
  if (!lease.start_date) return null;
  const start = lease.start_date.slice(0, 10);
  const dueDay = Number(lease.due_day) || 10;
  const first = firstDueOnOrAfter(parseISO(start), dueDay);
  const firstMonth = new Date(first.getFullYear(), first.getMonth(), 1);
  const grace = resolveGraceSchedule(lease.rent_grace, start);
  for (let i = 0; i < 600; i++) {
    const competency = shiftCompetency(start.slice(0, 7), i);
    const dueDate = format(calculateDueDate(addMonths(firstMonth, i), dueDay), "yyyy-MM-dd");
    if (dueDate < today) continue;
    if (grace.get(competency)?.mode === "free") continue;
    return { competency, dueDate };
  }
  return null;
}

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}


/* ─── Sugestão de início da assinatura automática ─────────────────── */

export interface SubscriptionStartSuggestion {
  /** Competência a partir da qual o valor mensal fica estável. */
  stableCompetency: string;
  /** Valor líquido da competência estável (valor da assinatura). */
  amount: number;
  figures: LeaseMonthFigures;
  /** 1º vencimento sugerido (YYYY-MM-DD). */
  firstDue: string;
  /** Meses entre hoje/início e a competência estável com líquido diferente. */
  differentMonths: { competency: string; net: number }[];
}

function dueDateOf(competency: string, dueDay: number): string {
  const [y, m] = competency.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(Math.max(1, dueDay || 10), lastDay);
  return `${competency}-${String(day).padStart(2, "0")}`;
}

export function suggestSubscriptionStart(
  lease: LeaseFinancialConditionsLease,
  today: string = todayInSaoPauloDateOnly()
): SubscriptionStartSuggestion {
  const start = (lease.start_date || today).slice(0, 7);
  const dueDay = lease.due_day || 10;
  let lastAffected: string | null = null;
  const bump = (c: string) => {
    if (!lastAffected || c > lastAffected) lastAffected = c;
  };

  // Carência em qualquer modo
  const graceSchedule = resolveGraceSchedule(lease.rent_grace, lease.start_date || today);
  for (const c of graceSchedule.keys()) bump(c);

  // Abatimentos pontuais/parcelados (com o deslocamento causado pela carência)
  const finite = (lease.rent_deductions || []).filter(
    (d) => d.enabled && Number(d.amount) > 0 && (d.recurrence === "once" || d.recurrence === "installments")
  );
  if (finite.length > 0) {
    const rents = buildRentInstallments({
      startDate: `${start}-01`,
      months: 120,
      amount: Number(lease.rent_amount) || 0,
      dueDay,
      graceSchedule,
    });
    const { installments } = buildRentDeductionInstallments({ deductions: finite, rentInstallments: rents });
    for (const i of installments) bump(i.competencyPeriod);
  }

  const stableCompetency = lastAffected ? shiftCompetency(lastAffected, 1) : start;
  const figures = computeLeaseMonthFromConfig(lease, stableCompetency);
  const amount = figures.net > 0 ? figures.net : Number(lease.rent_amount) || 0;

  let firstComp = stableCompetency;
  let firstDue = dueDateOf(firstComp, dueDay);
  while (firstDue < today) {
    firstComp = shiftCompetency(firstComp, 1);
    firstDue = dueDateOf(firstComp, dueDay);
  }

  const differentMonths: { competency: string; net: number }[] = [];
  const todayComp = today.slice(0, 7);
  let c = todayComp > start ? todayComp : start;
  while (c < stableCompetency) {
    const net = computeLeaseMonthFromConfig(lease, c).net;
    if (round2(net) !== round2(amount)) differentMonths.push({ competency: c, net: round2(net) });
    c = shiftCompetency(c, 1);
  }

  return { stableCompetency, amount, figures, firstDue, differentMonths };
}
