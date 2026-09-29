/** Montagem pura da DRE (usada pela DRE geral e pela DRE por imóvel). */

export interface CategoryTotal { categoryId: string; categoryName: string; total: number }
export interface DRESection { total: number; items: CategoryTotal[] }

export interface DRETransactionInput {
  amount: number;
  type?: string | null;
  obligation_type?: string | null;
  financial_categories?: { id: string; name: string; dre_type: string | null } | null;
}

export interface DRESections {
  grossRevenue: DRESection;
  taxDeductions: DRESection;
  netRevenue: number;
  variableCosts: DRESection;
  grossProfit: number;
  salesExpenses: DRESection;
  adminExpenses: DRESection;
  financialExpenses: DRESection;
  operatingProfit: number;
  financialRevenue: DRESection;
  profitDistribution: DRESection;
  /** DRE2: lançamentos sem categoria (ou categoria sem tipo de DRE). */
  uncategorizedRevenue: number;
  uncategorizedExpense: number;
  /** DRE1: IRRF retido pelo inquilino — antecipação do IR do locador, não dedução da receita. */
  irrfWithheld: DRESection;
  netResult: number;
}

const IRRF_CATEGORY = /irrf\s+retido\s+na\s+fonte/i;

export function isIrrfTransaction(tx: DRETransactionInput): boolean {
  return tx.obligation_type === "irrf" || IRRF_CATEGORY.test(tx.financial_categories?.name || "");
}

function addTo(section: DRESection, id: string, name: string, amount: number) {
  let item = section.items.find((i) => i.categoryId === id);
  if (!item) { item = { categoryId: id, categoryName: name, total: 0 }; section.items.push(item); }
  item.total += amount;
  section.total += amount;
}

export function buildDRESections(transactions: DRETransactionInput[]): DRESections {
  const s: Record<string, DRESection> = {
    gross_revenue: { total: 0, items: [] },
    financial_revenue: { total: 0, items: [] },
    tax_deduction: { total: 0, items: [] },
    variable_cost: { total: 0, items: [] },
    sales_expense: { total: 0, items: [] },
    admin_expense: { total: 0, items: [] },
    financial_expense: { total: 0, items: [] },
    profit_distribution: { total: 0, items: [] },
  };
  const irrf: DRESection = { total: 0, items: [] };
  let uncategorizedRevenue = 0;
  let uncategorizedExpense = 0;

  for (const tx of transactions || []) {
    const amount = Number(tx.amount) || 0;
    const cat = tx.financial_categories;
    if (isIrrfTransaction(tx)) {
      addTo(irrf, cat?.id || "irrf", cat?.name || "IRRF Retido na Fonte", amount);
      continue;
    }
    if (tx.obligation_type === "transfer") continue;
    const section = cat?.dre_type ? s[cat.dre_type] : undefined;
    if (!cat || !section) {
      if (!cat || !cat.dre_type) {
        if (tx.type === "income") uncategorizedRevenue += amount;
        else if (tx.type === "expense") uncategorizedExpense += amount;
      }
      continue;
    }
    addTo(section, cat.id, cat.name, amount);
  }

  const netRevenue = s.gross_revenue.total - s.tax_deduction.total;
  const grossProfit = netRevenue - s.variable_cost.total;
  const operatingProfit = grossProfit - s.sales_expense.total - s.admin_expense.total - s.financial_expense.total;
  const netResult =
    operatingProfit + s.financial_revenue.total - s.profit_distribution.total
    + uncategorizedRevenue - uncategorizedExpense - irrf.total;

  return {
    grossRevenue: s.gross_revenue,
    taxDeductions: s.tax_deduction,
    netRevenue,
    variableCosts: s.variable_cost,
    grossProfit,
    salesExpenses: s.sales_expense,
    adminExpenses: s.admin_expense,
    financialExpenses: s.financial_expense,
    operatingProfit,
    financialRevenue: s.financial_revenue,
    profitDistribution: s.profit_distribution,
    uncategorizedRevenue,
    uncategorizedExpense,
    irrfWithheld: irrf,
    netResult,
  };
}

export type DRERegimeKind = "gerencial" | "contabil" | "caixa";
type Period = { start: string; end: string };

/** DRE3: filtro de data por regime (PostgREST `or`), e se exige status pago. */
export function dreRegimeFilter(regime: DRERegimeKind, periods: Period[]): { or: string; paidOnly: boolean } {
  if (regime === "caixa") {
    return { or: periods.map((p) => `and(paid_date.gte.${p.start},paid_date.lte.${p.end})`).join(","), paidOnly: true };
  }
  if (regime === "gerencial") {
    return {
      or: periods
        .map((p) => `and(due_date.gte.${p.start},due_date.lte.${p.end}),and(due_date.is.null,transaction_date.gte.${p.start},transaction_date.lte.${p.end})`)
        .join(","),
      paidOnly: false,
    };
  }
  return { or: periods.map((p) => `and(transaction_date.gte.${p.start},transaction_date.lte.${p.end})`).join(","), paidOnly: false };
}
