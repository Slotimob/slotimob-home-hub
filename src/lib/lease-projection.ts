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

/**
 * Tipos de obrigação que o motor sabe lançar.
 * - `rent`: mensal, 1 parcela por competência
 * - `fire_insurance` / `iptu`: ciclo anual parcelado (N parcelas na MESMA competência)
 * - demais: encargos adicionais mensais (`leases.additional_obligations`)
 * O `(string & {})` mantém o autocomplete e ainda aceita tipos customizados
 * do corretor (`custom_<uuid>`), mesma convenção de `units.obligations_config`.
 */
export type PlannedObligation =
  | "rent"
  | "fire_insurance"
  | "iptu"
  | "condominium"
  | "energy"
  | "water"
  | "gas"
  | "other"
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

export interface PlannedInstallment {
  /** Chave estável para checkbox/dedup na UI. */
  key: string;
  /**
   * Chave de idempotência da PARCELA: `tipo:competência:vencimento`.
   * O vencimento entra na chave porque encargo anual tem N parcelas dentro da
   * MESMA competência — sem ele, lançar 3 de 10 parcelas de IPTU bloquearia
   * permanentemente as 7 restantes. Espelha o índice único do banco
   * `(reference, obligation_type, competency_period, due_date)`.
   */
  dedupKey?: string;
  obligationType: PlannedObligation;
  competencyPeriod: string;
  competencyLabel: string;
  dueDate: string;
  amount: number;
  description: string;
  /** Receita (cobrado do inquilino) ou despesa (assumido pelo proprietário). */
  transactionType?: "income" | "expense";
  /** Sobrescreve o contato do lançamento (ex.: responsável do encargo). */
  contactId?: string | null;
  /** True quando já existe transação para essa competência+tipo+vencimento. */
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
    const due = firstDue
      ? calculateDueDate(addMonths(firstDue, i), getDate(firstDue))
      : calculateDueDate(competencyDate, dueDay);
    const competencyPeriod = format(competencyDate, "yyyy-MM");
    const dueDate = format(due, "yyyy-MM-dd");
    const dedupKey = `rent:${competencyPeriod}:${dueDate}`;

    result.push({
      key: dedupKey,
      dedupKey,
      obligationType: "rent",
      competencyPeriod,
      competencyLabel: monthLabel(competencyDate),
      dueDate,
      amount,
      description: `Aluguel ${monthLabel(competencyDate)}`,
      transactionType: "income",
      alreadyExists: existingCompetencies?.has(dedupKey) ?? false,
    });
  }

  return result;
}

/**
 * Precedência do dia de vencimento de um encargo (do mais específico ao fallback):
 *  1. `first_due_date` configurado no CONTRATO (data completa, manda em tudo)
 *  2. `due_day` da obrigação em `units.obligations_config` (config do IMÓVEL)
 *  3. `due_day` do ALUGUEL (fallback histórico)
 * Não é óbvio: o contrato é mais específico que o imóvel, e o aluguel é o último recurso.
 */
function resolveChargeFirstDue(
  firstDueDate: string | Date | null | undefined,
  obligationDueDay: number | null | undefined,
  fallbackStartDate: string | Date,
  fallbackDueDay: number
): Date {
  const explicit = toDate(firstDueDate ?? null);
  if (explicit) return explicit;

  const base = toDate(fallbackStartDate) ?? new Date();
  const day =
    obligationDueDay && obligationDueDay > 0 ? obligationDueDay : fallbackDueDay;
  return calculateDueDate(base, day);
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
  /** `due_day` da obrigação em `units.obligations_config` (ver precedência acima). */
  obligationDueDay?: number | null;
  /**
   * Competência FIXA de referência do ciclo anual (data de início do ciclo/janela).
   * IPTU/seguro são obrigações anuais: mesmo parceladas em N vezes, todas as parcelas
   * pertencem à MESMA competência. Default: `fallbackStartDate`.
   */
  cycleStartDate?: string | Date | null;
  /** Receita (inquilino paga) ou despesa (proprietário assume). Default: income. */
  transactionType?: "income" | "expense";
  contactId?: string | null;
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
  obligationDueDay,
  cycleStartDate,
  transactionType = "income",
  contactId,
  existingCompetencies,
}: BuildChargeInstallmentsInput): PlannedInstallment[] {
  const count = Math.max(0, Math.floor(installments));
  if (count === 0 || !installmentAmount || installmentAmount <= 0) return [];

  const first = resolveChargeFirstDue(
    firstDueDate,
    obligationDueDay,
    fallbackStartDate,
    fallbackDueDay
  );
  const dueDay = getDate(first);

  // Competência única do ciclo: início da janela/contrato (fallback: 1º vencimento).
  const cycleBase =
    toDate(cycleStartDate ?? null) ?? toDate(fallbackStartDate) ?? first;
  const competencyDate = startOfMonth(cycleBase);
  const competencyPeriod = format(competencyDate, "yyyy-MM");

  const result: PlannedInstallment[] = [];

  for (let i = 0; i < count; i++) {
    const dueDate = format(calculateDueDate(addMonths(first, i), dueDay), "yyyy-MM-dd");
    // Dedup por PARCELA: dentro da mesma competência anual, o vencimento é o
    // discriminador (não existe coluna de índice de parcela na tabela).
    const dedupKey = `${obligationType}:${competencyPeriod}:${dueDate}`;

    result.push({
      key: dedupKey,
      dedupKey,
      obligationType,
      competencyPeriod,
      competencyLabel: monthLabel(competencyDate),
      dueDate,
      amount: installmentAmount,
      description:
        count > 1
          ? `${label} ${i + 1}/${count} — ${monthLabel(competencyDate)}`
          : `${label} — ${monthLabel(competencyDate)}`,
      transactionType,
      contactId,
      alreadyExists: existingCompetencies?.has(dedupKey) ?? false,
    });
  }

  return result;
}

export interface BuildMonthlyChargeInstallmentsInput {
  obligationType: Exclude<PlannedObligation, "rent">;
  label: string;
  /** Início da janela — define a primeira competência. */
  startDate: string | Date;
  months: number;
  /** Valor MENSAL do encargo. */
  amount: number;
  /** `first_due_date` do contrato (mais específico). */
  firstDueDate?: string | Date | null;
  /** `due_day` da obrigação em `units.obligations_config`. */
  obligationDueDay?: number | null;
  /** `due_day` do aluguel (último fallback). */
  fallbackDueDay: number;
  transactionType?: "income" | "expense";
  contactId?: string | null;
  existingCompetencies?: Set<string>;
}

/**
 * Encargos adicionais (condomínio, energia, água, gás, outros) são MENSAIS:
 * a competência anda mês a mês, exatamente como o aluguel — diferente de
 * IPTU/seguro, que são um ciclo anual parcelado numa competência única.
 */
export function buildMonthlyChargeInstallments({
  obligationType,
  label,
  startDate,
  months,
  amount,
  firstDueDate,
  obligationDueDay,
  fallbackDueDay,
  transactionType = "income",
  contactId,
  existingCompetencies,
}: BuildMonthlyChargeInstallmentsInput): PlannedInstallment[] {
  const start = toDate(startDate);
  if (!start || months <= 0 || !amount || amount <= 0) return [];

  const first = resolveChargeFirstDue(
    firstDueDate,
    obligationDueDay,
    start,
    fallbackDueDay
  );
  const dueDay = getDate(first);
  const baseMonth = startOfMonth(start);
  const result: PlannedInstallment[] = [];

  for (let i = 0; i < months; i++) {
    const competencyDate = addMonths(baseMonth, i);
    const competencyPeriod = format(competencyDate, "yyyy-MM");
    const dueDate = format(calculateDueDate(addMonths(first, i), dueDay), "yyyy-MM-dd");
    const dedupKey = `${obligationType}:${competencyPeriod}:${dueDate}`;

    result.push({
      key: dedupKey,
      dedupKey,
      obligationType,
      competencyPeriod,
      competencyLabel: monthLabel(competencyDate),
      dueDate,
      amount,
      description: `${label} ${monthLabel(competencyDate)}`,
      transactionType,
      contactId,
      alreadyExists: existingCompetencies?.has(dedupKey) ?? false,
    });
  }

  return result;
}

