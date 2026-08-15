/**
 * Data layer for the comprehensive asset report.
 * Queries Supabase directly (no materialized view for v1).
 */
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  computeInvestedAmount,
  computeAppreciation,
  computePeriodROI,
  computeMonthlyYield,
  computeCapRate,
} from './asset-financials';
import { ASSET_EXPENSE_CATEGORIES } from './asset-expense-categories';
import { EVENT_GROUPS, humanizeLog, type AuditLog } from './audit-formatting';

/** Max activity rows rendered per asset in the report */
export const ACTIVITIES_REPORT_LIMIT = 120;

export interface AssetReportActivity {
  date: string;
  group: string;
  description: string;
}

/** Manutenção / atividade registrada manualmente (property_activities) */
export interface AssetReportMaintenanceItem {
  id: string;
  date: string;
  activity_type: string;
  type_label: string;
  title: string;
  description: string | null;
  responsible: string | null;
  estimated_cost: number | null;
  has_transaction: boolean;
  attachments_count: number;
  is_completed: boolean;
  completed_at: string | null;
  outcome: string | null;
  group_size: number;
}


export interface AssetReportSections {
  acquisition: boolean;
  market: boolean;
  expenses: boolean;
  income: boolean;
  activities: boolean;
  improvements: boolean;
}

export interface AssetReportAsset {
  id: string;
  type: 'property' | 'unit';
  name: string;
  address: string;
  acquisition: {
    value: number | null;
    date: string | null;
    costs: number | null;
    total_invested: number | null;
    notes: string | null;
  } | null;
  improvements: {
    items: Array<{
      id: string;
      type: string;
      description: string;
      cost: number;
      completed_at: string;
      affects_market_value: boolean;
    }>;
    total: number;
  } | null;
  market: {
    current_value: number | null;
    last_updated: string | null;
    history_series: Array<{ date: string; value: number }>;
    appreciation_abs: number | null;
    appreciation_pct: number | null;
  } | null;
  period: {
    income_total: number;
    expenses_total: number;
    expenses_by_category: Record<string, number>;
    top_expenses: Array<{
      description: string;
      amount: number;
      date: string;
      category: string | null;
    }>;
    activities_count: number;
    activities_by_type: Record<string, number>;
    /** Most recent activities within the period (capped at ACTIVITIES_REPORT_LIMIT) */
    activities_items: AssetReportActivity[];
    roi_pct: number | null;
    monthly_yield: number | null;
    cap_rate: number | null;
  } | null;
}

export interface AssetReportData {
  generated_at: string;
  period: { from: string; to: string; all_history?: boolean };
  summary: {
    total_assets: number;
    total_invested: number;
    total_market_value: number;
    total_appreciation_abs: number | null;
    total_appreciation_pct: number | null;
    period_income: number;
    period_expenses: number;
    period_net: number;
    period_roi_pct: number | null;
    monthly_yield_avg: number | null;
    cap_rate_avg: number | null;
  };
  assets: AssetReportAsset[];
}

function fmtDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

export async function buildAssetReport(params: {
  brokerId: string;
  assetIds?: string[];
  /** `from: null` means "all history" (no lower bound) */
  period: { from: Date | null; to: Date };
  sections: AssetReportSections;
}): Promise<AssetReportData> {
  const { brokerId, assetIds, period, sections } = params;
  const fromStr = period.from ? fmtDate(period.from) : '1900-01-01';
  const toStr = fmtDate(period.to);

  let propsQuery = supabase
    .from('properties')
    .select('id, name, address, market_value, acquisition_value, acquisition_date, acquisition_costs, acquisition_notes')
    .eq('broker_id', brokerId);
  if (assetIds?.length) propsQuery = propsQuery.in('id', assetIds);
  const { data: properties = [] } = await propsQuery;

  let unitsQuery = supabase
    .from('units')
    .select('id, unit_number, address, market_value, acquisition_value, acquisition_date, acquisition_costs, acquisition_notes, property_id, property:properties(name, address)')
    .eq('broker_id', brokerId);
  if (assetIds?.length) unitsQuery = unitsQuery.in('id', assetIds);
  const { data: units = [] } = await unitsQuery;

  const propertyIds = properties.map(p => p.id);
  const unitIds = units.map(u => u.id);
  const allAssetIds = [...propertyIds, ...unitIds];
  if (allAssetIds.length === 0) {
    return emptyReport(fromStr, toStr, !period.from);
  }

  let improvementsMap: Record<string, any[]> = {};
  if (sections.improvements) {
    const { data: improvements = [] } = await supabase
      .from('asset_improvements')
      .select('*')
      .eq('broker_id', brokerId)
      .gte('completed_at', fromStr)
      .lte('completed_at', toStr);
    for (const imp of improvements) {
      const key = imp.property_id || imp.unit_id;
      if (!key) continue;
      if (!improvementsMap[key]) improvementsMap[key] = [];
      improvementsMap[key].push(imp);
    }
  }

  const { data: allImprovements = [] } = await supabase
    .from('asset_improvements')
    .select('property_id, unit_id, cost, affects_market_value')
    .eq('broker_id', brokerId);
  const improvementsTotalMap: Record<string, number> = {};
  for (const imp of allImprovements) {
    const key = imp.property_id || imp.unit_id;
    if (!key || !imp.affects_market_value) continue;
    improvementsTotalMap[key] = (improvementsTotalMap[key] || 0) + imp.cost;
  }

  let marketHistoryMap: Record<string, Array<{ date: string; value: number }>> = {};
  if (sections.market) {
    const { data: history = [] } = await supabase
      .from('market_value_history')
      .select('property_id, unit_id, value, effective_date')
      .eq('broker_id', brokerId)
      .order('effective_date', { ascending: true });
    for (const h of history) {
      const key = h.property_id || h.unit_id;
      if (!key) continue;
      if (!marketHistoryMap[key]) marketHistoryMap[key] = [];
      marketHistoryMap[key].push({ date: h.effective_date, value: h.value });
    }
  }

  let incomeMap: Record<string, number> = {};
  let expenseMap: Record<string, number> = {};
  let expenseByCatMap: Record<string, Record<string, number>> = {};
  let topExpensesMap: Record<string, any[]> = {};

  if (sections.income || sections.expenses) {
    if (sections.income) {
      const { data: incomeData = [] } = await supabase
        .from('financial_transactions')
        .select('property_id, unit_id, amount')
        .eq('broker_id', brokerId)
        .eq('type', 'income')
        .eq('status', 'paid')
        .gte('transaction_date', fromStr)
        .lte('transaction_date', toStr);
      for (const t of incomeData) {
        const key = t.unit_id || t.property_id;
        if (!key) continue;
        incomeMap[key] = (incomeMap[key] || 0) + Number(t.amount);
      }
    }

    if (sections.expenses) {
      const { data: expenseData = [] } = await supabase
        .from('financial_transactions')
        .select('property_id, unit_id, amount, description, transaction_date, asset_expense_category')
        .eq('broker_id', brokerId)
        .eq('type', 'expense')
        .eq('status', 'paid')
        .gte('transaction_date', fromStr)
        .lte('transaction_date', toStr);
      for (const t of expenseData) {
        const key = t.unit_id || t.property_id;
        if (!key) continue;
        const amt = Number(t.amount);
        expenseMap[key] = (expenseMap[key] || 0) + amt;
        const catKey = t.asset_expense_category || 'other';
        if (!expenseByCatMap[key]) expenseByCatMap[key] = {};
        expenseByCatMap[key][catKey] = (expenseByCatMap[key][catKey] || 0) + amt;
        if (!topExpensesMap[key]) topExpensesMap[key] = [];
        topExpensesMap[key].push({
          description: t.description,
          amount: amt,
          date: t.transaction_date,
          category: t.asset_expense_category,
        });
      }
      for (const key of Object.keys(topExpensesMap)) {
        topExpensesMap[key].sort((a: any, b: any) => b.amount - a.amount);
        topExpensesMap[key] = topExpensesMap[key].slice(0, 10);
      }
    }
  }

  let activitiesMap: Record<string, { count: number; byType: Record<string, number>; items: AssetReportActivity[] }> = {};
  if (sections.activities) {
    const loadActivities = async (id: string, kind: 'property' | 'unit') => {
      const metaKey = kind === 'property' ? 'property_id' : 'unit_id';
      const tableName = kind === 'property' ? 'properties' : 'units';

      const [directRes, metaRes, notesRes] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', tableName)
          .eq('record_id', id)
          .gte('created_at', fromStr)
          .lte('created_at', toStr + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('audit_logs')
          .select('*')
          .filter(`metadata->>${metaKey}`, 'eq', id)
          .gte('created_at', fromStr)
          .lte('created_at', toStr + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('property_activities')
          .select('id, title, scheduled_at, created_at')
          .eq(metaKey, id)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const logMap = new Map<string, AuditLog>();
      for (const l of [...(directRes.data || []), ...(metaRes.data || [])]) {
        logMap.set((l as any).id, l as unknown as AuditLog);
      }

      const byType: Record<string, number> = {};
      const items: AssetReportActivity[] = [];

      for (const log of logMap.values()) {
        const groupKey = Object.keys(EVENT_GROUPS).find(k => EVENT_GROUPS[k].match(log));
        const groupLabel = groupKey ? EVENT_GROUPS[groupKey].label : 'Outros';
        byType[groupLabel] = (byType[groupLabel] || 0) + 1;
        items.push({
          date: log.created_at,
          group: groupLabel,
          description: humanizeLog(log),
        });
      }

      for (const note of (notesRes.data || []) as any[]) {
        const d = note.scheduled_at || note.created_at;
        if (!d) continue;
        const dayStr = String(d).slice(0, 10);
        if (dayStr < fromStr || dayStr > toStr) continue;
        byType['Notas manuais'] = (byType['Notas manuais'] || 0) + 1;
        items.push({
          date: d,
          group: 'Notas manuais',
          description: note.title || 'Nota manual',
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      activitiesMap[id] = {
        count: items.length,
        byType,
        items: items.slice(0, ACTIVITIES_REPORT_LIMIT),
      };
    };

    await Promise.all([
      ...propertyIds.map(pid => loadActivities(pid, 'property')),
      ...unitIds.map(uid => loadActivities(uid, 'unit')),
    ]);
  }

  const metricsFrom = period.from ?? new Date(period.to.getTime() - 365 * 24 * 3600 * 1000);
  const periodMonths = Math.max(1, (period.to.getTime() - metricsFrom.getTime()) / (30 * 24 * 3600 * 1000));
  const assets: AssetReportAsset[] = [];

  for (const prop of properties) {
    const id = prop.id;
    const impTotal = improvementsTotalMap[id] ?? 0;
    const invested = computeInvestedAmount({
      acquisition_value: prop.acquisition_value,
      acquisition_costs: prop.acquisition_costs,
      improvements_total: impTotal,
    });
    const appreciation = computeAppreciation({
      market_value_current: prop.market_value,
      invested_amount: invested,
    });
    const inc = incomeMap[id] ?? 0;
    const exp = expenseMap[id] ?? 0;
    const roi = computePeriodROI({ income_period: inc, expenses_period: exp, invested_amount: invested });
    const monthlyYield = computeMonthlyYield({
      rental_income_monthly: inc / periodMonths,
      recurring_expenses_monthly: exp / periodMonths,
      invested_amount: invested,
    });
    const capRate = computeCapRate({
      income_annual: (inc / periodMonths) * 12,
      expenses_annual: (exp / periodMonths) * 12,
      market_value_current: prop.market_value,
    });

    assets.push({
      id,
      type: 'property',
      name: prop.name || 'Imóvel sem nome',
      address: prop.address || '',
      acquisition: sections.acquisition ? {
        value: prop.acquisition_value,
        date: prop.acquisition_date,
        costs: prop.acquisition_costs,
        total_invested: invested,
        notes: prop.acquisition_notes,
      } : null,
      improvements: sections.improvements ? {
        items: (improvementsMap[id] || []).map(i => ({
          id: i.id,
          type: i.improvement_type,
          description: i.description,
          cost: i.cost,
          completed_at: i.completed_at,
          affects_market_value: i.affects_market_value,
        })),
        total: (improvementsMap[id] || []).reduce((s: number, i: any) => s + i.cost, 0),
      } : null,
      market: sections.market ? {
        current_value: prop.market_value,
        last_updated: (marketHistoryMap[id] || []).at(-1)?.date ?? null,
        history_series: marketHistoryMap[id] || [],
        appreciation_abs: appreciation?.absolute ?? null,
        appreciation_pct: appreciation?.pct ?? null,
      } : null,
      period: (sections.income || sections.expenses || sections.activities) ? {
        income_total: inc,
        expenses_total: exp,
        expenses_by_category: expenseByCatMap[id] || {},
        top_expenses: topExpensesMap[id] || [],
        activities_count: activitiesMap[id]?.count ?? 0,
        activities_by_type: activitiesMap[id]?.byType ?? {},
        activities_items: activitiesMap[id]?.items ?? [],
        roi_pct: roi?.roi_pct ?? null,
        monthly_yield: monthlyYield,
        cap_rate: capRate,
      } : null,
    });
  }

  for (const unit of units) {
    const id = unit.id;
    const impTotal = improvementsTotalMap[id] ?? 0;
    const invested = computeInvestedAmount({
      acquisition_value: unit.acquisition_value,
      acquisition_costs: unit.acquisition_costs,
      improvements_total: impTotal,
    });
    const appreciation = computeAppreciation({
      market_value_current: unit.market_value,
      invested_amount: invested,
    });
    const inc = incomeMap[id] ?? 0;
    const exp = expenseMap[id] ?? 0;
    const roi = computePeriodROI({ income_period: inc, expenses_period: exp, invested_amount: invested });
    const monthlyYield = computeMonthlyYield({
      rental_income_monthly: inc / periodMonths,
      recurring_expenses_monthly: exp / periodMonths,
      invested_amount: invested,
    });
    const capRate = computeCapRate({
      income_annual: (inc / periodMonths) * 12,
      expenses_annual: (exp / periodMonths) * 12,
      market_value_current: unit.market_value,
    });
    const propName = (unit as any).property?.name || '';
    const unitName = unit.unit_number ? `${propName ? propName + ' — ' : ''}${unit.unit_number}` : propName || 'Unidade sem nome';

    assets.push({
      id,
      type: 'unit',
      name: unitName,
      address: unit.address || (unit as any).property?.address || '',
      acquisition: sections.acquisition ? {
        value: unit.acquisition_value,
        date: unit.acquisition_date,
        costs: unit.acquisition_costs,
        total_invested: invested,
        notes: unit.acquisition_notes,
      } : null,
      improvements: sections.improvements ? {
        items: (improvementsMap[id] || []).map(i => ({
          id: i.id,
          type: i.improvement_type,
          description: i.description,
          cost: i.cost,
          completed_at: i.completed_at,
          affects_market_value: i.affects_market_value,
        })),
        total: (improvementsMap[id] || []).reduce((s: number, i: any) => s + i.cost, 0),
      } : null,
      market: sections.market ? {
        current_value: unit.market_value,
        last_updated: (marketHistoryMap[id] || []).at(-1)?.date ?? null,
        history_series: marketHistoryMap[id] || [],
        appreciation_abs: appreciation?.absolute ?? null,
        appreciation_pct: appreciation?.pct ?? null,
      } : null,
      period: (sections.income || sections.expenses || sections.activities) ? {
        income_total: inc,
        expenses_total: exp,
        expenses_by_category: expenseByCatMap[id] || {},
        top_expenses: topExpensesMap[id] || [],
        activities_count: activitiesMap[id]?.count ?? 0,
        activities_by_type: activitiesMap[id]?.byType ?? {},
        activities_items: activitiesMap[id]?.items ?? [],
        roi_pct: roi?.roi_pct ?? null,
        monthly_yield: monthlyYield,
        cap_rate: capRate,
      } : null,
    });
  }

  let totalInvested = 0, totalMV = 0, totalIncome = 0, totalExpenses = 0;
  let yieldSum = 0, yieldCount = 0, capSum = 0, capCount = 0;

  for (const a of assets) {
    totalInvested += a.acquisition?.total_invested ?? 0;
    totalMV += a.market?.current_value ?? 0;
    totalIncome += a.period?.income_total ?? 0;
    totalExpenses += a.period?.expenses_total ?? 0;
    if (a.period?.monthly_yield != null) { yieldSum += a.period.monthly_yield; yieldCount++; }
    if (a.period?.cap_rate != null) { capSum += a.period.cap_rate; capCount++; }
  }

  const totalApp = computeAppreciation({ market_value_current: totalMV, invested_amount: totalInvested || null });
  const totalROI = computePeriodROI({ income_period: totalIncome, expenses_period: totalExpenses, invested_amount: totalInvested || null });

  return {
    generated_at: new Date().toISOString(),
    period: { from: fromStr, to: toStr, all_history: !period.from },
    summary: {
      total_assets: assets.length,
      total_invested: totalInvested,
      total_market_value: totalMV,
      total_appreciation_abs: totalApp?.absolute ?? null,
      total_appreciation_pct: totalApp?.pct ?? null,
      period_income: totalIncome,
      period_expenses: totalExpenses,
      period_net: totalIncome - totalExpenses,
      period_roi_pct: totalROI?.roi_pct ?? null,
      monthly_yield_avg: yieldCount > 0 ? yieldSum / yieldCount : null,
      cap_rate_avg: capCount > 0 ? capSum / capCount : null,
    },
    assets,
  };
}

function emptyReport(from: string, to: string, allHistory = false): AssetReportData {
  return {
    generated_at: new Date().toISOString(),
    period: { from, to, all_history: allHistory },
    summary: {
      total_assets: 0, total_invested: 0, total_market_value: 0,
      total_appreciation_abs: null, total_appreciation_pct: null,
      period_income: 0, period_expenses: 0, period_net: 0,
      period_roi_pct: null, monthly_yield_avg: null, cap_rate_avg: null,
    },
    assets: [],
  };
}
