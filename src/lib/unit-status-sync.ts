import { supabase } from "@/integrations/supabase/client";

/**
 * Status considerados terminais para um contrato de locação.
 * Qualquer outro status (active, pending, ...) conta como "vigente".
 */
const TERMINAL_LEASE_STATUSES = ["terminated", "expired", "cancelled"];

/**
 * Sincroniza `units.status` a partir dos contratos de locação vigentes da unidade.
 *
 * Regras:
 * - Nunca sobrescreve `sold` (venda tem prioridade sobre locação).
 * - Se `intent_type` for rental/both e existir ao menos 1 lease não-terminal -> `rented`.
 * - Se não sobrar nenhum lease vigente -> `available`.
 * - Só executa o UPDATE se o status atual for diferente do desejado.
 *
 * É best-effort: nunca lança. Em caso de erro apenas loga no console,
 * para não quebrar a operação principal (criar/editar/encerrar/excluir contrato).
 *
 * Esta é apenas uma sincronização automática de conveniência — o usuário
 * continua podendo editar o status manualmente a qualquer momento.
 */
export async function syncUnitStatusForLease(
  unitId: string | null | undefined,
): Promise<void> {
  if (!unitId) return;

  try {
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id, status, intent_type")
      .eq("id", unitId)
      .maybeSingle();

    if (unitError) {
      console.error("[syncUnitStatusForLease] Erro ao buscar unidade:", unitError);
      return;
    }
    if (!unit) return;

    // Venda tem prioridade: nunca sobrescreve `sold`.
    if (unit.status === "sold") return;

    const { data: leases, error: leasesError } = await supabase
      .from("leases")
      .select("id, status")
      .eq("unit_id", unitId)
      .not("status", "in", `(${TERMINAL_LEASE_STATUSES.join(",")})`);

    if (leasesError) {
      console.error("[syncUnitStatusForLease] Erro ao buscar contratos:", leasesError);
      return;
    }

    // Contratos com vários imóveis: vínculo adicional via lease_units
    let linked = 0;
    if ((leases || []).length === 0) {
      const { data: links } = await supabase
        .from("lease_units")
        .select("lease_id, lease:leases!inner(status)")
        .eq("unit_id", unitId)
        .not("lease.status", "in", `(${TERMINAL_LEASE_STATUSES.join(",")})`);
      linked = (links || []).length;
    }

    const hasActiveLease = (leases || []).length > 0 || linked > 0;
    const isRentable =
      unit.intent_type === "rental" || unit.intent_type === "both";

    let desiredStatus: "rented" | "available" | null = null;

    if (hasActiveLease && isRentable) {
      desiredStatus = "rented";
    } else if (!hasActiveLease) {
      desiredStatus = "available";
    }

    if (!desiredStatus || desiredStatus === unit.status) return;

    const { error: updateError } = await supabase
      .from("units")
      .update({ status: desiredStatus })
      .eq("id", unitId);

    if (updateError) {
      console.error("[syncUnitStatusForLease] Erro ao atualizar status:", updateError);
    }
  } catch (error) {
    console.error("[syncUnitStatusForLease] Falha inesperada:", error);
  }
}


const LIVE_LEASE_STATUSES = ["active", "pending"];

/**
 * Todos os imóveis de um contrato (principal em `leases.unit_id` + `lease_units`).
 * Capture ANTES de excluir o contrato (lease_units cai em cascata).
 */
export async function getLeaseUnitIds(leaseId: string): Promise<string[]> {
  const ids = new Set<string>();
  const [{ data: lease }, { data: links }] = await Promise.all([
    supabase.from("leases").select("unit_id").eq("id", leaseId).maybeSingle(),
    supabase.from("lease_units").select("unit_id").eq("lease_id", leaseId),
  ]);
  if (lease?.unit_id) ids.add(lease.unit_id);
  (links || []).forEach((l) => l.unit_id && ids.add(l.unit_id));
  return Array.from(ids);
}

/** True se o imóvel tem outro contrato vivo (active/pending), direto ou via lease_units. */
export async function unitHasOtherLiveLease(unitId: string, excludeLeaseId: string): Promise<boolean> {
  const [{ data: direct, error: e1 }, { data: links, error: e2 }] = await Promise.all([
    supabase
      .from("leases")
      .select("id")
      .eq("unit_id", unitId)
      .neq("id", excludeLeaseId)
      .in("status", LIVE_LEASE_STATUSES)
      .limit(1),
    supabase
      .from("lease_units")
      .select("lease_id, lease:leases!inner(status)")
      .eq("unit_id", unitId)
      .neq("lease_id", excludeLeaseId)
      .in("lease.status", LIVE_LEASE_STATUSES)
      .limit(1),
  ]);
  // Em caso de erro, assume que há outro contrato (não libera às cegas)
  if (e1 || e2) {
    console.error("[unitHasOtherLiveLease]", e1 || e2);
    return true;
  }
  return (direct || []).length > 0 || (links || []).length > 0;
}

/**
 * Libera os imóveis de um contrato encerrado/excluído: só zera ocupação e
 * inquilino dos que NÃO têm outro contrato vivo; depois sincroniza o status.
 * Best-effort: nunca lança.
 */
export async function releaseLeaseUnits(leaseId: string, unitIds: string[]): Promise<void> {
  for (const unitId of unitIds) {
    try {
      if (!(await unitHasOtherLiveLease(unitId, leaseId))) {
        const { error } = await supabase
          .from("units")
          .update({ is_occupied: false, tenant_contact_id: null })
          .eq("id", unitId);
        if (error) console.error("[releaseLeaseUnits] Erro ao liberar imóvel:", error);
      }
      await syncUnitStatusForLease(unitId);
    } catch (error) {
      console.error("[releaseLeaseUnits] Falha inesperada:", error);
    }
  }
}

/** Ocupa todos os imóveis do contrato (sync_unit_tenant_from_lease em cada um). Best-effort. */
export async function occupyLeaseUnits(params: {
  leaseId: string;
  tenantContactId: string;
  startDate: string;
  unitIds?: string[];
}): Promise<void> {
  const unitIds = params.unitIds ?? (await getLeaseUnitIds(params.leaseId));
  for (const unitId of unitIds) {
    const { error } = await supabase.rpc("sync_unit_tenant_from_lease", {
      p_unit_id: unitId,
      p_tenant_contact_id: params.tenantContactId,
      p_lease_id: params.leaseId,
      p_start_date: params.startDate,
    });
    if (error) console.error("[occupyLeaseUnits] Falha ao sincronizar imóvel:", error);
    await syncUnitStatusForLease(unitId);
  }
}
