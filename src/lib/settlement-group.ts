import { useQuery , keepPreviousData} from "@tanstack/react-query";
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
  paid_date?: string | null;
  metadata?: Record<string, any> | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const SELECT = "id, type, amount, obligation_type, status, bank_account_id, settlement_group_id, description, paid_date, metadata";

/** Σ receitas − Σ despesas (linhas canceladas são ignoradas). */
export function settlementNet(lines: SettlementLine[]): number {
  return round2(
    lines
      .filter((l) => l.status !== "cancelled")
      .reduce((s, l) => s + (l.type === "income" ? 1 : -1) * (Number(l.amount) || 0), 0)
  );
}

export interface SettlementBreakdown {
  /** Aluguel bruto (linhas de aluguel: obligation_type nulo, `rent` ou `rent_balance`). */
  rent: number;
  /** Acréscimos: multa/juros e outros acréscimos (`rent_addition_*` e demais receitas do grupo). */
  additions: number;
  /** Abatimentos (despesa do proprietário, `rent_deduction_*`). */
  deductions: number;
  irrf: number;
  /** Descontos concedidos (`rent_discount`). */
  discounts: number;
  /** Outras despesas do grupo que não são abatimento/IRRF/desconto. */
  otherExpenses: number;
  /** Líquido = aluguel + acréscimos − abatimentos − IRRF − descontos − outras. */
  net: number;
}

const RENT_TYPES = new Set(["rent", "rent_balance"]);
const isRentLine = (l: SettlementLine) =>
  l.type === "income" && (!l.obligation_type || RENT_TYPES.has(l.obligation_type));

export function settlementBreakdown(lines: SettlementLine[]): SettlementBreakdown {
  const active = lines.filter((l) => l.status !== "cancelled");
  let rent = 0, additions = 0, deductions = 0, irrf = 0, discounts = 0, otherExpenses = 0;
  for (const l of active) {
    const v = Number(l.amount) || 0;
    if (l.type === "income") {
      if (isRentLine(l)) rent += v;
      else additions += v;
    } else if (l.obligation_type === "irrf") irrf += v;
    else if ((l.obligation_type || "").startsWith("rent_deduction_")) deductions += v;
    else if (l.obligation_type === "rent_discount") discounts += v;
    else otherExpenses += v;
  }
  return {
    rent: round2(rent),
    additions: round2(additions),
    deductions: round2(deductions),
    irrf: round2(irrf),
    discounts: round2(discounts),
    otherExpenses: round2(otherExpenses),
    net: settlementNet(active),
  };
}

/** "Aluguel R$ X + acréscimos R$ Y − abatimentos R$ Z − IRRF R$ W − descontos R$ D = líquido R$ N" (só partes não nulas). */
export function describeSettlement(b: SettlementBreakdown): string {
  const f = formatCurrencyBRL;
  const parts = [`Aluguel ${f(b.rent)}`];
  if (b.additions > 0) parts.push(`+ acréscimos ${f(b.additions)}`);
  if (b.deductions > 0) parts.push(`− abatimentos ${f(b.deductions)}`);
  if (b.irrf > 0) parts.push(`− IRRF ${f(b.irrf)}`);
  if (b.discounts > 0) parts.push(`− descontos ${f(b.discounts)}`);
  if (b.otherExpenses > 0) parts.push(`− outros ${f(b.otherExpenses)}`);
  return `${parts.join(" ")} = líquido ${f(b.net)}`;
}

export type CompositionKind = "deduction" | "irrf" | "late_fee" | "other_addition" | "discount";

export function compositionKindOf(l: SettlementLine): CompositionKind | null {
  const t = l.obligation_type || "";
  if (t === "irrf") return "irrf";
  if (t.startsWith("rent_deduction_")) return "deduction";
  if (t === "rent_addition_late_fee") return "late_fee";
  if (t === "rent_addition_other") return "other_addition";
  if (t === "rent_discount") return "discount";
  return null;
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
    placeholderData: keepPreviousData,
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

// ---------------------------------------------------------------------------
// Mês de aluguel completo: grupo da âncora + saldos de pagamento parcial
// (`rent_balance` com metadata.balance_of = âncora) + grupos desses saldos.
// ---------------------------------------------------------------------------

export interface RentMonthReceipt {
  date: string;
  amount: number;
}

export interface RentMonthSummary extends SettlementBreakdown {
  /** Bruto do mês: metadata.original_amount da âncora (parcial) ou soma do aluguel. */
  gross: number;
  /** Recebimentos agrupados por paid_date (líquido), em ordem crescente. */
  receipts: RentMonthReceipt[];
  /** Líquido ainda pendente. */
  openBalance: number;
  /** Houve saldo/pagamento parcial neste mês. */
  hasBalance: boolean;
}

/** Linhas de saldo da âncora e as linhas dos grupos desses saldos (sem duplicar). */
export function collectRentMonthLines(
  anchor: SettlementLine,
  anchorGroup: SettlementLine[],
  balanceLines: SettlementLine[]
): SettlementLine[] {
  const map = new Map<string, SettlementLine>();
  [anchor, ...anchorGroup, ...balanceLines].forEach((l) => l && map.set(l.id, l));
  return Array.from(map.values());
}

export function rentMonthSummary(anchor: SettlementLine, lines: SettlementLine[]): RentMonthSummary {
  const active = lines.filter((l) => l.status !== "cancelled");
  const b = settlementBreakdown(active);
  const original = Number(anchor.metadata?.original_amount);
  const gross = anchor.metadata?.partial_payment && original > 0 ? round2(original) : b.rent;
  const byDate = new Map<string, number>();
  let open = 0;
  for (const l of active) {
    const v = (l.type === "income" ? 1 : -1) * (Number(l.amount) || 0);
    if (l.status === "paid") {
      const d = l.paid_date || "";
      byDate.set(d, (byDate.get(d) || 0) + v);
    } else {
      open += v;
    }
  }
  const receipts = Array.from(byDate.entries())
    .map(([date, amount]) => ({ date, amount: round2(amount) }))
    .filter((r) => Math.abs(r.amount) >= 0.005)
    .sort((a, b2) => a.date.localeCompare(b2.date));
  return {
    ...b,
    gross,
    receipts,
    openBalance: round2(open),
    hasBalance: active.some((l) => l.obligation_type === "rent_balance"),
  };
}

/**
 * Busca de uma vez (2 queries no máximo) os saldos das âncoras e os grupos
 * desses saldos. Retorna { [anchorId]: linhas extras }.
 */
export async function fetchRentBalanceLines(anchorIds: string[]): Promise<Record<string, SettlementLine[]>> {
  const ids = Array.from(new Set(anchorIds.filter(Boolean)));
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("financial_transactions")
    .select(SELECT)
    .eq("obligation_type", "rent_balance")
    .in("metadata->>balance_of", ids)
    .neq("status", "cancelled");
  if (error) throw error;
  const balances = (data || []) as SettlementLine[];
  const groups = await fetchSettlementGroups(balances.map((b) => b.settlement_group_id as string));
  const out: Record<string, SettlementLine[]> = {};
  for (const bl of balances) {
    const key = bl.metadata?.balance_of as string;
    const extra = bl.settlement_group_id ? groups[bl.settlement_group_id] || [bl] : [bl];
    (out[key] ||= []).push(...extra);
    if (!extra.some((l) => l.id === bl.id)) out[key].push(bl);
  }
  return out;
}

export function useRentBalanceLines(anchorIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(anchorIds.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["settlement-groups", "rent-balances", ids.join(",")],
    queryFn: () => fetchRentBalanceLines(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
