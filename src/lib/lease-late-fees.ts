import { supabase } from "@/integrations/supabase/client";

export interface LateFeeRates { multaPercent: number; jurosPercent: number }

/** Contrato do lançamento: lease_id ou reference = 'lease:<id>'. */
export function leaseIdOfTransaction(t: { lease_id?: string | null; reference?: string | null }): string | null {
  if (t.lease_id) return t.lease_id;
  const m = /^lease:([0-9a-f-]{36})$/i.exec(t.reference || "");
  return m ? m[1] : null;
}

/** Percentuais do contrato (billing_automation.multa_percent/juros_percent; padrão do card 10% e 1%). */
export function ratesFromBillingAutomation(ba: any): LateFeeRates {
  const multa = Number(ba?.multa_percent);
  const juros = Number(ba?.juros_percent);
  return {
    multaPercent: Number.isFinite(multa) && ba?.multa_percent != null ? multa : 10,
    jurosPercent: Number.isFinite(juros) && ba?.juros_percent != null ? juros : 1,
  };
}

export async function fetchLeaseLateFeeRates(leaseIds: string[]): Promise<Map<string, LateFeeRates>> {
  const map = new Map<string, LateFeeRates>();
  const ids = Array.from(new Set(leaseIds.filter(Boolean)));
  if (!ids.length) return map;
  const { data } = await supabase.from("leases").select("id, billing_automation").in("id", ids);
  for (const l of (data as any[]) || []) map.set(l.id, ratesFromBillingAutomation(l.billing_automation));
  return map;
}

export function describeLateFeeRule(r: LateFeeRates | null | undefined): string {
  if (!r) return "Regra: padrão (2% + 1% a.m.)";
  const f = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `Contrato (${f(r.multaPercent)}% + ${f(r.jurosPercent)}% a.m.)`;
}
