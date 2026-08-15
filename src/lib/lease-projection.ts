import {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  format,
  getDate,
  isBefore,
  lastDayOfMonth,
  parseISO,
  setDate,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** Teto de segurança: nunca lançamos mais que isso numa única operação. */
export const MAX_PROJECTION_MONTHS = 24;

export type ProjectionWindowReason =
  | "next_adjustment"
  | "end_date"
  | "default_12_months"
  | "adjustment_overdue";

export interface ProjectionWindow {
  /** Início da janela (primeira competência). Null quando não há o que projetar. */
  start: Date | null;
  /** Fim da janela (última competência). Null quando não há o que projetar. */
  end: Date | null;
  /** Quantidade de competências mensais dentro da janela. */
  months: number;
  reason: ProjectionWindowReason;
  /** Texto pronto para o usuário explicando por que a janela termina ali. */
  reasonLabel: string;
  /** True quando o reajuste está vencido e nada deve ser projetado. */
  blocked: boolean;
  /** True quando a janela foi truncada pelo teto de MAX_PROJECTION_MONTHS. */
  cappedByLimit: boolean;
}

export interface ProjectionWindowInput {
  startDate: string | Date;
  endDate?: string | Date | null;
  nextAdjustmentDate?: string | Date | null;
  isIndefiniteTerm?: boolean | null;
  /** Injeção para testes. Default: hoje. */
  today?: Date;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function formatBr(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Calcula até quando o valor de aluguel vigente pode ser lançado.
 *
 * O fim da janela é o MENOR entre:
 *  1. next_adjustment_date - 1 dia (fim do ciclo de aluguel vigente)
 *  2. end_date do contrato (quando houver e o contrato não for por prazo indeterminado)
 *
 * Bordas:
 *  - sem reajuste e sem fim → 12 meses a partir do início
 *  - sem reajuste, com fim → vai até o end_date
 *  - reajuste no passado → bloqueado (precisa aplicar o reajuste antes)
 */
export function calculateProjectionWindow(input: ProjectionWindowInput): ProjectionWindow {
  const today = startOfDay(input.today ?? new Date());
  const start = toDate(input.startDate);

  if (!start) {
    return {
      start: null,
      end: null,
      months: 0,
      reason: "default_12_months",
      reasonLabel: "Data de início do contrato inválida",
      blocked: true,
      cappedByLimit: false,
    };
  }

  const nextAdjustment = toDate(input.nextAdjustmentDate);
  const endDate = input.isIndefiniteTerm ? null : toDate(input.endDate);

  // Reajuste vencido: nada a projetar até que o reajuste seja aplicado.
  if (nextAdjustment && isBefore(nextAdjustment, today)) {
    return {
      start: null,
      end: null,
      months: 0,
      reason: "adjustment_overdue",
      reasonLabel: `O reajuste previsto para ${formatBr(
        nextAdjustment
      )} está vencido. Aplique o reajuste antes de lançar novas parcelas.`,
      blocked: true,
      cappedByLimit: false,
    };
  }

  const candidates: Array<{ date: Date; reason: ProjectionWindowReason; label: string }> = [];

  if (nextAdjustment) {
    candidates.push({
      date: addDays(nextAdjustment, -1),
      reason: "next_adjustment",
      label: `até o próximo reajuste em ${formatBr(nextAdjustment)}`,
    });
  }

  if (endDate) {
    candidates.push({
      date: endDate,
      reason: "end_date",
      label: `até o fim do contrato em ${formatBr(endDate)}`,
    });
  }

  let chosen: { date: Date; reason: ProjectionWindowReason; label: string };

  if (candidates.length === 0) {
    chosen = {
      date: addMonths(start, 11),
      reason: "default_12_months",
      label: "12 meses a partir do início do contrato (sem reajuste ou fim definidos)",
    };
  } else {
    chosen = candidates.reduce((min, c) => (isBefore(c.date, min.date) ? c : min));
  }

  let end = chosen.date;

  // A janela não pode terminar antes de começar.
  if (isBefore(end, start)) {
    return {
      start: null,
      end: null,
      months: 0,
      reason: chosen.reason,
      reasonLabel: `Não há período a lançar: a janela termina em ${formatBr(
        end
      )}, antes do início do contrato.`,
      blocked: true,
      cappedByLimit: false,
    };
  }

  let months = differenceInCalendarMonths(end, start) + 1;
  let cappedByLimit = false;

  if (months > MAX_PROJECTION_MONTHS) {
    months = MAX_PROJECTION_MONTHS;
    end = lastDayOfMonth(addMonths(startOfMonth(start), months - 1));
    cappedByLimit = true;
  }

  return {
    start,
    end,
    months: Math.max(months, 1),
    reason: chosen.reason,
    reasonLabel: cappedByLimit
      ? `limitado a ${MAX_PROJECTION_MONTHS} parcelas por lançamento (${chosen.label})`
      : chosen.label,
    blocked: false,
    cappedByLimit,
  };
}

/**
 * Vencimento correto do mês, tratando meses mais curtos (ex.: dia 31 em fevereiro).
 */
export function calculateDueDate(baseDate: Date, dueDay: number): Date {
  const lastDay = getDate(lastDayOfMonth(baseDate));
  const actualDay = Math.min(Math.max(dueDay, 1), lastDay);
  return setDate(baseDate, actualDay);
}

export type PlannedObligation = "rent" | "fire_insurance" | "iptu";

export interface PlannedInstallment {
  /** Chave estável para checkbox/dedup na UI. */
  key: string;
  obligationType: PlannedObligation;
  competencyPeriod: string;
  competencyLabel: string;
  dueDate: string;
  amount: number;
  description: string;
  /** True quando já existe transação para essa competência+tipo. */
  alreadyExists: boolean;
}

function monthLabel(date: Date): string {
  const label = format(date, "MMMM/yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface BuildRentInstallmentsInput {
  startDate: string | Date;
  months: number;
  amount: number;
  dueDay: number;
  /** Sobrescreve o vencimento da primeira parcela. */
  firstDueDate?: string | null;
  existingCompetencies?: Set<string>;
}

export function buildRentInstallments({
  startDate,
  months,
  amount,
  dueDay,
  firstDueDate,
  existingCompetencies,
}: BuildRentInstallmentsInput): PlannedInstallment[] {
  const start = toDate(startDate);
  if (!start || months <= 0) return [];

  const firstDue = toDate(firstDueDate ?? null);
  const baseMonth = startOfMonth(start);
  const result: PlannedInstallment[] = [];

  for (let i = 0; i < months; i++) {
    const competencyDate = addMonths(baseMonth, i);
    const dueDate = firstDue
      ? calculateDueDate(addMonths(firstDue, i), getDate(firstDue))
      : calculateDueDate(competencyDate, dueDay);
    const competencyPeriod = format(competencyDate, "yyyy-MM");

    result.push({
      key: `rent:${competencyPeriod}`,
      obligationType: "rent",
      competencyPeriod,
      competencyLabel: monthLabel(competencyDate),
      dueDate: format(dueDate, "yyyy-MM-dd"),
      amount,
      description: `Aluguel ${monthLabel(competencyDate)}`,
      alreadyExists: existingCompetencies?.has(`rent:${competencyPeriod}`) ?? false,
    });
  }

  return result;
}

export interface BuildChargeInstallmentsInput {
  obligationType: Exclude<PlannedObligation, "rent">;
  label: string;
  installments: number;
  installmentAmount: number;
  firstDueDate: string | Date | null;
  /** Fallback quando a config não tem primeiro vencimento. */
  fallbackStartDate: string | Date;
  fallbackDueDay: number;
  existingCompetencies?: Set<string>;
}

export function buildChargeInstallments({
  obligationType,
  label,
  installments,
  installmentAmount,
  firstDueDate,
  fallbackStartDate,
  fallbackDueDay,
  existingCompetencies,
}: BuildChargeInstallmentsInput): PlannedInstallment[] {
  const count = Math.max(0, Math.floor(installments));
  if (count === 0 || !installmentAmount || installmentAmount <= 0) return [];

  const first =
    toDate(firstDueDate) ??
    calculateDueDate(toDate(fallbackStartDate) ?? new Date(), fallbackDueDay);
  const dueDay = getDate(first);
  const result: PlannedInstallment[] = [];

  for (let i = 0; i < count; i++) {
    const dueDate = calculateDueDate(addMonths(first, i), dueDay);
    const competencyPeriod = format(dueDate, "yyyy-MM");
    const key = `${obligationType}:${competencyPeriod}`;

    result.push({
      key,
      obligationType,
      competencyPeriod,
      competencyLabel: monthLabel(dueDate),
      dueDate: format(dueDate, "yyyy-MM-dd"),
      amount: installmentAmount,
      description:
        count > 1
          ? `${label} ${i + 1}/${count} — ${monthLabel(dueDate)}`
          : `${label} — ${monthLabel(dueDate)}`,
      alreadyExists: existingCompetencies?.has(key) ?? false,
    });
  }

  return result;
}
