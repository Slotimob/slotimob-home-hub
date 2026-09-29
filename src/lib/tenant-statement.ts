import { settlementBreakdown } from "@/lib/settlement-group";
import { isRentIncome, isRentAddition, isIrrf, isRentDeduction, isRentDiscount } from "@/lib/owner-report";
import { resolveGraceSchedule } from "@/lib/lease-special-conditions";
import type { RentGraceConfig } from "@/hooks/useLeases";
import { formatCurrency, type PaymentHistoryItem } from "@/utils/tenantStatementPdf";

export interface TenantStatementLease {
  start_date?: string | null;
  end_date?: string | null;
  termination_date?: string | null;
  is_indefinite_term?: boolean | null;
  due_day: number;
  rent_grace?: RentGraceConfig | null;
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const pad = (n: number) => String(n).padStart(2, "0");
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Regra do período do extrato: linha paga entra pela data do pagamento;
 * linha aberta/atrasada entra pelo vencimento.
 */
export function rowInStatementRange(t: any, range: { start: string; end: string }): boolean {
  const d = t.status === "paid" ? t.paid_date || t.due_date : t.due_date;
  return !!d && d >= range.start && d <= range.end;
}

/**
 * Monta as linhas do extrato do inquilino.
 * @param periods competências "yyyy-MM" do período, em ordem crescente
 * @param today "yyyy-MM-dd"
 */
export function buildTenantStatementMonths(params: {
  periods: string[];
  lease: TenantStatementLease;
  rows: any[];
  groups: Record<string, any[]>;
  today: string;
  /** Com período ("yyyy-MM-dd"), competências fora da lista entram quando
   *  têm aluguel pago no período (pagamento antecipado) ou vencendo nele. */
  range?: { start: string; end: string };
}): PaymentHistoryItem[] {
  const { lease, rows: allRows, groups, today, range } = params;
  let periods = params.periods;
  if (range) {
    const extra = new Set(periods);
    for (const t of allRows) {
      if (t.type !== "income" || !isRentIncome(t) || !rowInStatementRange(t, range)) continue;
      extra.add(t.competency_period || (t.due_date || "").slice(0, 7));
    }
    periods = Array.from(extra).filter(Boolean).sort();
  }
  const startP = lease.start_date ? lease.start_date.slice(0, 7) : null;
  const endCandidates: string[] = [];
  if (lease.termination_date) endCandidates.push(lease.termination_date.slice(0, 7));
  if (lease.end_date && !lease.is_indefinite_term) endCandidates.push(lease.end_date.slice(0, 7));
  const endP = endCandidates.length ? endCandidates.sort()[0] : null;
  const grace = lease.start_date ? resolveGraceSchedule(lease.rent_grace, lease.start_date) : new Map();

  const items: PaymentHistoryItem[] = [];
  for (const period of periods) {
    if (startP && period < startP) continue;
    if (endP && period > endP) continue;
    const [y, m] = period.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const dueDate = `${period}-${pad(Math.min(lease.due_day || 1, lastDay))}`;
    const monthName = MONTHS[m - 1];
    const base = {
      month: `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}/${y}`,
      reference: `${pad(m)}/${y}`,
      dueDate,
    };

    const rows = allRows.filter(
      (t: any) => (t.competency_period || (t.due_date || "").slice(0, 7)) === period
    );
    const rentLines = rows.filter((t: any) => t.type === "income" && isRentIncome(t));

    if (rentLines.length === 0) {
      const g = grace.get(period);
      const isGrace = g?.mode === "free";
      items.push({
        ...base,
        paidDate: null,
        amount: 0,
        lateFee: 0,
        totalPaid: 0,
        status: isGrace ? "grace" : "not_launched",
        breakdown: isGrace ? "Carência (isento)" : "Não lançado",
      });
      continue;
    }

    let gross = 0, additions = 0, irrf = 0, deductions = 0, discounts = 0, other = 0, paidNet = 0;
    const seen = new Set<string>();
    for (const a of rentLines) {
      const gid = a.settlement_group_id;
      if (!gid || !groups[gid] || groups[gid].length < 2 || seen.has(gid)) continue;
      seen.add(gid);
      const b = settlementBreakdown(groups[gid] as any);
      gross += b.rent; additions += b.additions; irrf += b.irrf;
      deductions += b.deductions; discounts += b.discounts; other += b.otherExpenses;
      if (a.status === "paid") paidNet += b.net;
    }
    for (const t of rows) {
      if (t.settlement_group_id && seen.has(t.settlement_group_id)) continue;
      const v = Number(t.amount) || 0;
      let signed = 0;
      if (t.type === "income" && isRentIncome(t)) { gross += v; signed = v; }
      else if (t.type === "income" && isRentAddition(t)) { additions += v; signed = v; }
      else if (t.type === "expense" && isIrrf(t)) { irrf += v; signed = -v; }
      else if (t.type === "expense" && isRentDeduction(t)) { deductions += v; signed = -v; }
      else if (t.type === "expense" && isRentDiscount(t)) { discounts += v; signed = -v; }
      if (signed && t.status === "paid") paidNet += signed;
    }
    const net = gross + additions - irrf - deductions - discounts - other;
    const isPaid = rentLines.every((t: any) => t.status === "paid");
    const isOverdue = !isPaid && dueDate < today;
    const paidDate = isPaid
      ? rentLines.map((t: any) => t.paid_date).filter(Boolean).sort().pop() || null
      : null;
    const parts: string[] = [];
    if (additions || irrf || deductions || discounts || other) {
      parts.push(`bruto ${formatCurrency(gross)}`);
      if (additions) parts.push(`+ acréscimos ${formatCurrency(additions)}`);
      if (irrf) parts.push(`− IRRF ${formatCurrency(irrf)}`);
      if (deductions) parts.push(`− abatimento ${formatCurrency(deductions)}`);
      if (discounts) parts.push(`− desconto ${formatCurrency(discounts)}`);
      if (other) parts.push(`− outras ${formatCurrency(other)}`);
    }
    items.push({
      ...base,
      paidDate,
      amount: r2(net),
      lateFee: r2(additions),
      totalPaid: r2(paidNet),
      status: isPaid ? "paid" : isOverdue ? "overdue" : "pending",
      breakdown: parts.length ? parts.join(" ") : undefined,
    });
  }
  return items;
}
