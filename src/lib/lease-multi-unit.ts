import { supabase } from "@/integrations/supabase/client";
import { leaseUnitFilter } from "@/hooks/useLeases";
import { obligationTypeMatches } from "@/lib/obligation-labels";

/** Vínculo de um imóvel (unidade inteira) com o contrato vivo (active/pending). */
export interface UnitLeaseLink {
  leaseId: string;
  rent_grace: unknown;
  start_date: string;
  isPrimary: boolean;
  primaryUnitId: string | null;
  /** Rótulo do imóvel principal (empreendimento — unidade, ou endereço). */
  primaryLabel: string;
  /** Total de imóveis no contrato. */
  unitCount: number;
}

export function unitLabel(u: { unit_number?: string | null; address?: string | null; property?: { name?: string | null } | null } | null | undefined): string {
  if (!u) return "imóvel principal";
  return [u.property?.name, u.unit_number].filter(Boolean).join(" — ") || u.address || "imóvel principal";
}

/**
 * Contrato vivo de cada imóvel, encontrado pelo principal (leases.unit_id) OU por
 * lease_units (imóvel adicional). Só unidade inteira (sem fração), mais recente primeiro.
 */
export async function fetchUnitLeaseLinks(unitIds: string[]): Promise<Map<string, UnitLeaseLink>> {
  const map = new Map<string, UnitLeaseLink>();
  if (!unitIds.length) return map;
  const filter = await leaseUnitFilter(unitIds, { wholeUnitOnly: true });
  const { data, error } = await supabase
    .from("leases")
    .select(
      "id, unit_id, unit_subdivision_id, rent_grace, start_date, created_at, unit:units!leases_unit_id_fkey(unit_number, address, property:properties(name)), lease_units(unit_id, unit_subdivision_id, is_primary)"
    )
    .or(filter)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const wanted = new Set(unitIds);
  for (const l of (data as any[]) || []) {
    const rows: any[] = l.lease_units?.length
      ? l.lease_units
      : [{ unit_id: l.unit_id, unit_subdivision_id: l.unit_subdivision_id, is_primary: true }];
    for (const r of rows) {
      if (!wanted.has(r.unit_id) || r.unit_subdivision_id || map.has(r.unit_id)) continue;
      map.set(r.unit_id, {
        leaseId: l.id,
        rent_grace: l.rent_grace,
        start_date: l.start_date,
        isPrimary: !!r.is_primary || r.unit_id === l.unit_id,
        primaryUnitId: l.unit_id,
        primaryLabel: unitLabel(l.unit),
        unitCount: rows.length,
      });
    }
  }
  return map;
}

/** Lançamentos de aluguel dos contratos (por lease_id) numa competência. */
export async function fetchLeaseRentTransactions(leaseIds: string[], competency: string) {
  if (!leaseIds.length) return [] as any[];
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("id, lease_id, unit_id, amount, status, transaction_date, due_date, paid_date, obligation_type, competency_period, is_reconciled, type")
    .in("lease_id", leaseIds)
    .eq("competency_period", competency)
    .neq("status", "cancelled");
  if (error) throw error;
  return ((data as any[]) || []).filter(
    (t) => t.type !== "expense" && (t.obligation_type == null || obligationTypeMatches("rent", t.obligation_type))
  );
}

/** "Pago pelo contrato X" / "Pendente pelo contrato X". */
export function viaLeaseText(status: string, primaryLabel: string): string {
  return `${status === "paid" ? "Pago" : "Pendente"} pelo contrato ${primaryLabel}`;
}

/** Nota de rateio: "Inclui X% do contrato <id curto> (rateio entre N imóveis)". */
export function allocationNote(leaseId: string, factor: number, unitCount: number): string {
  const pct = Math.round(factor * 10000) / 100;
  return `Inclui ${pct.toLocaleString("pt-BR")}% do contrato ${leaseId.slice(0, 8)} (rateio entre ${unitCount} imóveis)`;
}

/** Nº de imóveis por contrato (lease_units). */
export async function fetchLeaseUnitCounts(leaseIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const ids = Array.from(new Set(leaseIds.filter(Boolean)));
  if (!ids.length) return out;
  const { data } = await supabase.from("lease_units").select("lease_id").in("lease_id", ids);
  for (const r of data || []) out[r.lease_id] = (out[r.lease_id] || 0) + 1;
  return out;
}

/**
 * Notas únicas (por contrato) a partir de linhas da view v_financial_transactions_by_unit
 * já filtradas para um imóvel.
 */
export async function allocationNotesFor(
  rows: { is_allocated?: boolean | null; lease_id?: string | null; alloc_factor?: number | null }[]
): Promise<string[]> {
  const byLease = new Map<string, number>();
  for (const r of rows) {
    if (r.is_allocated && r.lease_id && !byLease.has(r.lease_id)) byLease.set(r.lease_id, Number(r.alloc_factor) || 0);
  }
  if (!byLease.size) return [];
  const counts = await fetchLeaseUnitCounts(Array.from(byLease.keys()));
  return Array.from(byLease.entries()).map(([id, f]) => allocationNote(id, f, counts[id] || 0));
}
