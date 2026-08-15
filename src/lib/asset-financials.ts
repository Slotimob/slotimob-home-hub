/**
 * Pure financial calculation functions for asset reports.
 * All return null when any required input is null/undefined (never NaN/Infinity).
 */

type N = number | null | undefined;

function safe(v: N): number | null {
  if (v == null || !isFinite(v)) return null;
  return v;
}

export function computeInvestedAmount(params: {
  acquisition_value: N;
  acquisition_costs: N;
  improvements_total: N;
}): number | null {
  const acq = safe(params.acquisition_value);
  if (acq == null) return null;
  return acq + (safe(params.acquisition_costs) ?? 0) + (safe(params.improvements_total) ?? 0);
}

export function computeAppreciation(params: {
  market_value_current: N;
  invested_amount: N;
}): { absolute: number; pct: number } | null {
  const mv = safe(params.market_value_current);
  const inv = safe(params.invested_amount);
  if (mv == null || inv == null || inv === 0) return null;
  const absolute = mv - inv;
  const pct = (absolute / inv) * 100;
  return { absolute, pct };
}

export function computePeriodROI(params: {
  income_period: N;
  expenses_period: N;
  invested_amount: N;
}): { net_period: number; roi_pct: number } | null {
  const income = safe(params.income_period);
  const expenses = safe(params.expenses_period);
  const inv = safe(params.invested_amount);
  if (income == null || expenses == null || inv == null || inv === 0) return null;
  const net_period = income - expenses;
  const roi_pct = (net_period / inv) * 100;
  return { net_period, roi_pct };
}

export function computeMonthlyYield(params: {
  rental_income_monthly: N;
  recurring_expenses_monthly: N;
  invested_amount: N;
}): number | null {
  const income = safe(params.rental_income_monthly);
  const expenses = safe(params.recurring_expenses_monthly);
  const inv = safe(params.invested_amount);
  if (income == null || inv == null || inv === 0) return null;
  return ((income - (expenses ?? 0)) / inv) * 100;
}

export function computeCapRate(params: {
  income_annual: N;
  expenses_annual: N;
  market_value_current: N;
}): number | null {
  const income = safe(params.income_annual);
  const expenses = safe(params.expenses_annual);
  const mv = safe(params.market_value_current);
  if (income == null || mv == null || mv === 0) return null;
  return ((income - (expenses ?? 0)) / mv) * 100;
}

/**
 * Annualized appreciation (CAGR):
 * (market_value_current / acquisition_value) ^ (1 / years_since_acquisition) - 1
 * Returned as a percentage. Null when inputs are missing/invalid.
 */
export function computeAnnualizedAppreciation(params: {
  market_value_current: N;
  acquisition_value: N;
  years_elapsed: N;
}): number | null {
  const mv = safe(params.market_value_current);
  const acq = safe(params.acquisition_value);
  const years = safe(params.years_elapsed);
  if (mv == null || acq == null || years == null) return null;
  if (acq <= 0 || mv <= 0 || years <= 0) return null;
  const cagr = Math.pow(mv / acq, 1 / years) - 1;
  if (!isFinite(cagr)) return null;
  return cagr * 100;
}
