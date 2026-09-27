import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RentDeductionConfig, RentGraceConfig, RentWithholdingConfig } from "@/hooks/useLeases";
import { monthLabel, type PlannedInstallment } from "./lease-projection";
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
}): { installments: PlannedInstallment[]; skipped: number } {
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
  for (const c of comps) {
    const rent = rentByComp.get(c)!;
    let capacity = Math.max(0, rent.amount);
    for (const r of requested) {
      const wanted = round2((r.perComp.get(c) ?? 0) + r.carry);
      if (wanted <= 0) continue;
      const take = round2(Math.min(wanted, capacity));
      r.carry = round2(wanted - take);
      capacity = round2(capacity - take);
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

  return { installments, skipped };
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
