/**
 * Dimob (IN RFB 1.115/2010): valores mês a mês pelo mês em que o inquilino PAGOU
 * (regime de caixa), aluguel BRUTO, multa/juros somados ao aluguel, IRRF no campo
 * de imposto retido e comissão no mês em que foi paga.
 */
export interface DimobLine {
  type: string;
  amount: number | string;
  obligation_type?: string | null;
  paid_date?: string | null;
  metadata?: any;
  category?: { name?: string | null } | null;
}

export interface DimobMonth {
  rent: number;
  commission: number;
  tax: number;
}

export interface DimobMonthsResult {
  months: DimobMonth[];
  deductions: number;
  hasRent: boolean;
  commissionEstimated: boolean;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const isRent = (l: DimobLine) =>
  l.type === "income" && (!l.obligation_type || l.obligation_type === "rent" || l.obligation_type === "rent_balance");
export const isAdminFeeLine = (l: DimobLine) =>
  l.type === "income" && (l.category?.name || "").trim().toLowerCase() === "taxa de administração";

export function monthIndexOf(date?: string | null): number {
  const m = Number((date || "").slice(5, 7));
  return m >= 1 && m <= 12 ? m - 1 : -1;
}

export function buildDimobMonths(
  lines: DimobLine[],
  opts: { adminFeePercentage?: number | null; administrationFeeValue?: number | null }
): DimobMonthsResult {
  const months: DimobMonth[] = Array.from({ length: 12 }, () => ({ rent: 0, commission: 0, tax: 0 }));
  let deductions = 0;
  let hasRent = false;
  let hasCommissionLines = false;

  for (const l of lines) {
    const idx = monthIndexOf(l.paid_date);
    if (idx < 0) continue;
    const v = Number(l.amount) || 0;
    const ot = l.obligation_type || "";
    if (isAdminFeeLine(l)) {
      months[idx].commission += v;
      hasCommissionLines = true;
    } else if (isRent(l)) {
      months[idx].rent += Number(l.metadata?.gross_amount) || v;
      hasRent = true;
    } else if (l.type === "income" && ot.startsWith("rent_addition")) {
      months[idx].rent += v;
    } else if (l.type === "expense" && ot === "rent_discount") {
      months[idx].rent -= v;
    } else if (l.type === "expense" && ot === "irrf") {
      months[idx].tax += v;
    } else if (l.type === "expense" && ot.startsWith("rent_deduction")) {
      deductions += v;
    }
  }

  const commissionEstimated = !hasCommissionLines;
  for (const m of months) {
    m.rent = r2(m.rent);
    m.tax = r2(m.tax);
    if (commissionEstimated) {
      const fixed = Number(opts.administrationFeeValue) || 0;
      m.commission = m.rent > 0 ? (fixed > 0 ? fixed : (m.rent * (Number(opts.adminFeePercentage) || 0)) / 100) : 0;
    }
    m.commission = r2(m.commission);
  }
  return { months, deductions: r2(deductions), hasRent, commissionEstimated };
}

export const sumMonths = (months: DimobMonth[], k: keyof DimobMonth) => r2(months.reduce((s, m) => s + m[k], 0));
