// Baixa conjunta: soma as linhas do grupo direto no banco.
// Espelha src/lib/settlement-group.ts (settlementBreakdown).
export interface SettlementNet {
  rent: number;
  deductions: number;
  irrf: number;
  other: number;
  net: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export async function fetchSettlementNet(
  supabase: any,
  groupId: string,
  brokerId: string,
): Promise<SettlementNet | null> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("type, amount, obligation_type, status")
    .eq("settlement_group_id", groupId)
    .eq("broker_id", brokerId)
    .neq("status", "cancelled");
  if (error || !data || data.length < 2) return null;
  let rent = 0, deductions = 0, irrf = 0, other = 0;
  for (const l of data) {
    const v = Number(l.amount) || 0;
    if (l.type === "income") rent += v;
    else if (l.obligation_type === "irrf") irrf += v;
    else if (String(l.obligation_type || "").startsWith("rent_deduction_")) deductions += v;
    else other += v;
  }
  return { rent: r2(rent), deductions: r2(deductions), irrf: r2(irrf), other: r2(other), net: r2(rent - deductions - irrf - other) };
}

export function describeSettlementNet(s: SettlementNet): string {
  const o = s.other > 0 ? ` − outros ${brl(s.other)}` : "";
  return `líquido: aluguel ${brl(s.rent)} − abatimentos ${brl(s.deductions)} − IRRF ${brl(s.irrf)}${o}`;
}
