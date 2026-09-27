import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PlannedInstallment } from "@/lib/lease-projection";
import { buildWithholdingInstallments } from "@/lib/lease-special-conditions";

export interface IrrfRecalcResult {
  updated: number;
  /** Linhas cujo recálculo deu ≤ 0: valor mantido, marcadas `needs_review`. */
  zeroed: number;
}

/**
 * Recalcula as linhas PENDENTES de IRRF do contrato após reajuste (ou desfazer).
 * Só modos `percent`/`table`; `fixed` não muda. Pagas/conciliadas nunca são tocadas.
 * O novo valor usa a mesma regra de `buildWithholdingInstallments`, com o aluguel
 * atual da competência (linha de aluguel já atualizada).
 */
export async function recalculatePendingIrrf(
  leaseId: string,
  fromCompetency?: string | null
): Promise<IrrfRecalcResult> {
  const empty = { updated: 0, zeroed: 0 };

  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("rent_withholding, iptu_charge, additional_obligations, admin_fee_percentage")
    .eq("id", leaseId)
    .maybeSingle();
  if (leaseError) throw leaseError;
  const withholding = (lease as any)?.rent_withholding;
  if (!withholding?.enabled || (withholding.mode !== "percent" && withholding.mode !== "table")) {
    return empty;
  }

  const leaseFilter = `lease_id.eq.${leaseId},reference.eq.lease:${leaseId}`;
  let irrfQuery = supabase
    .from("financial_transactions")
    .select("id, competency_period, due_date, metadata")
    .or(leaseFilter)
    .eq("obligation_type", "irrf")
    .eq("status", "pending")
    .or("is_reconciled.is.null,is_reconciled.eq.false");
  if (fromCompetency) irrfQuery = irrfQuery.gte("competency_period", fromCompetency);
  const { data: irrfRows, error: irrfError } = await irrfQuery;
  if (irrfError) throw irrfError;
  if (!irrfRows?.length) return empty;

  const comps = Array.from(new Set(irrfRows.map((r) => r.competency_period).filter(Boolean))) as string[];
  const { data: rentRows, error: rentError } = await supabase
    .from("financial_transactions")
    .select("competency_period, amount, due_date, status")
    .or(leaseFilter)
    .or("obligation_type.eq.rent,obligation_type.is.null")
    .in("competency_period", comps)
    .neq("status", "cancelled");
  if (rentError) throw rentError;
  const rentByComp = new Map<string, number>();
  (rentRows || []).forEach((r) => {
    if (r.competency_period) rentByComp.set(r.competency_period, Number(r.amount) || 0);
  });

  const l = lease as any;
  const iptu = l.iptu_charge?.enabled ? Number(l.iptu_charge.installment_amount) || 0 : 0;
  const condominium =
    Number(
      (l.additional_obligations || []).find((o: any) => o?.type === "condominium" && o?.enabled)
        ?.installment_amount
    ) || 0;

  const result = { ...empty };
  for (const row of irrfRows) {
    const comp = row.competency_period as string;
    const rentAmount = rentByComp.get(comp);
    if (rentAmount === undefined) continue;
    const rent: PlannedInstallment = {
      key: `rent:${comp}`,
      obligationType: "rent",
      competencyPeriod: comp,
      competencyLabel: comp,
      dueDate: row.due_date || `${comp}-01`,
      issueDate: row.due_date || `${comp}-01`,
      amount: rentAmount,
      description: "",
      alreadyExists: true,
    };
    const [calc] = buildWithholdingInstallments({
      withholding,
      rentInstallments: [rent],
      baseDeductions: { iptu, condominium, adminFeePercent: Number(l.admin_fee_percentage) || 0 },
    });
    const value = calc?.amount ?? 0;
    const base = calc?.meta?.base ?? 0;
    const current = (row.metadata as Record<string, unknown>) || {};
    // CHECK amount > 0: com cálculo ≤ 0 o valor fica como está e a linha é
    // marcada para revisão manual.
    const isZero = !(value > 0);
    const metadata = isZero
      ? { ...current, needs_review: true, suggested_amount: 0 }
      : { ...current, kind: "irrf", base, needs_review: false, suggested_amount: null };
    const patch = isZero
      ? { metadata: metadata as unknown as Json }
      : { amount: value, metadata: metadata as unknown as Json };
    const { error } = await supabase
      .from("financial_transactions")
      .update(patch)
      .eq("id", row.id)
      .eq("status", "pending");
    if (error) throw error;
    if (isZero) result.zeroed += 1;
    else result.updated += 1;
  }
  return result;
}

/** Texto curto para toasts: "3 aluguel · 2 IRRF" + aviso de zerados. */
export function describeAdjustmentCascade(rent: number, irrf: IrrfRecalcResult | null): string {
  const parts = [`${rent} parcela(s) de aluguel`];
  if (irrf && irrf.updated > 0) parts.push(`${irrf.updated} de IRRF`);
  let text = `${parts.join(" e ")} atualizada(s)`;
  if (irrf && irrf.zeroed > 0) {
    text += ` • ${irrf.zeroed} linha(s) de IRRF precisam de revisão manual (o cálculo deu R$ 0,00)`;
  }
  return text;
}
