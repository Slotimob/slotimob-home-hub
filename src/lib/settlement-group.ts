import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/utils/unitPricing";

/**
 * Baixa conjunta: aluguel (receita, bruto) + abatimentos (despesa) + IRRF
 * (despesa) da mesma competência compartilham `settlement_group_id`.
 * O inquilino deposita o LÍQUIDO.
 */

export interface SettlementLine {
  id: string;
  type: string;
  amount: number;
  obligation_type?: string | null;
  status?: string | null;
  bank_account_id?: string | null;
  settlement_group_id?: string | null;
  description?: string | null;
}

export interface SettlementBreakdown {
  rent: number;
  deductions: number;
  irrf: number;
  /** Outras despesas do grupo que não são abatimento/IRRF. */
  otherExpenses: number;
  net: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const SELECT = "id, type, amount, obligation_type, status, bank_account_id, settlement_group_id, description";

/** Σ receitas − Σ despesas (linhas canceladas são ignoradas). */
export function settlementNet(lines: SettlementLine[]): number {
  return round2(
    lines
      .filter((l) => l.status !== "cancelled")
      .reduce((s, l) => s + (l.type === "income" ? 1 : -1) * (Number(l.amount) || 0), 0)
  );
}

export function settlementBreakdown(lines: SettlementLine[]): SettlementBreakdown {
  const active = lines.filter((l) => l.status !== "cancelled");
  let rent = 0, deductions = 0, irrf = 0, otherExpenses = 0;
  for (const l of active) {
    const v = Number(l.amount) || 0;
    if (l.type === "income") rent += v;
    else if (l.obligation_type === "irrf") irrf += v;
    else if ((l.obligation_type || "").startsWith("rent_deduction_")) deductions += v;
    else otherExpenses += v;
  }
  return {
    rent: round2(rent),
    deductions: round2(deductions),
    irrf: round2(irrf),
    otherExpenses: round2(otherExpenses),
    net: settlementNet(active),
  };
}

export function describeSettlement(b: SettlementBreakdown): string {
  const f = formatCurrencyBRL;
  const other = b.otherExpenses > 0 ? ` − outros ${f(b.otherExpenses)}` : "";
  return `Aluguel ${f(b.rent)} − abatimentos ${f(b.deductions)} − IRRF ${f(b.irrf)}${other} = líquido ${f(b.net)}`;
}

/** Linha "âncora" do grupo: o aluguel (receita). */
export function settlementAnchor(lines: SettlementLine[]): SettlementLine | undefined {
  return (
    lines.find((l) => l.type === "income" && (!l.obligation_type || l.obligation_type === "rent")) ||
    lines.find((l) => l.type === "income")
  );
}

export async function fetchSettlementGroup(groupId: string): Promise<SettlementLine[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select(SELECT)
    .eq("settlement_group_id", groupId)
    .neq("status", "cancelled");
  if (error) throw error;
  return (data || []) as SettlementLine[];
}

export async function fetchSettlementGroups(groupIds: string[]): Promise<Record<string, SettlementLine[]>> {
  const ids = Array.from(new Set(groupIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("financial_transactions")
    .select(SELECT)
    .in("settlement_group_id", ids)
    .neq("status", "cancelled");
  if (error) throw error;
  const out: Record<string, SettlementLine[]> = {};
  (data || []).forEach((l: any) => {
    (out[l.settlement_group_id] ||= []).push(l as SettlementLine);
  });
  return out;
}

/** Busca de uma vez os grupos das linhas visíveis. */
export function useSettlementGroups(groupIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(groupIds.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["settlement-groups", ids.join(",")],
    queryFn: () => fetchSettlementGroups(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Expande ids de lançamentos para incluir todas as linhas dos seus grupos.
 * Retorna os ids finais e quantos grupos foram envolvidos.
 */
export async function expandToSettlementGroups(
  transactionIds: string[]
): Promise<{ ids: string[]; groupCount: number }> {
  if (transactionIds.length === 0) return { ids: [], groupCount: 0 };
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("id, settlement_group_id")
    .in("id", transactionIds);
  if (error) throw error;
  const groupIds = Array.from(
    new Set((data || []).map((r: any) => r.settlement_group_id).filter(Boolean))
  ) as string[];
  const all = new Set(transactionIds);
  if (groupIds.length > 0) {
    const groups = await fetchSettlementGroups(groupIds);
    Object.values(groups).flat().forEach((l) => all.add(l.id));
  }
  return { ids: Array.from(all), groupCount: groupIds.length };
}

/**
 * "Marcar como pago" respeitando baixa conjunta. Retorna quantos lançamentos
 * foram marcados e se houve grupo (para o toast "Baixa conjunta: N lançamentos").
 */
export async function markPaidWithSettlement(
  transactionIds: string[],
  paidDate: string
): Promise<{ count: number; grouped: boolean }> {
  const { ids, groupCount } = await expandToSettlementGroups(transactionIds);
  if (ids.length === 0) return { count: 0, grouped: false };
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ status: "paid", paid_date: paidDate })
    .in("id", ids)
    .neq("status", "cancelled")
    .select("id");
  if (error) throw error;
  return { count: data?.length || 0, grouped: groupCount > 0 };
}
