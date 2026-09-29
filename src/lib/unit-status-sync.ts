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


export const LIVE_LEASE_STATUSES = ["active", "pending"];

/** Imóvel do contrato: unidade inteira (`unit_subdivision_id` nulo) ou uma fração. */
export interface LeaseUnitRef {
  unit_id: string;
  unit_subdivision_id: string | null;
}

/** Chave estável de um vínculo: "unitId" (inteiro) ou "unitId:subId" (fração). */
export const leaseUnitRefKey = (r: LeaseUnitRef) =>
  r.unit_subdivision_id ? `${r.unit_id}:${r.unit_subdivision_id}` : r.unit_id;

const toRef = (t: string | LeaseUnitRef): LeaseUnitRef =>
  typeof t === "string" ? { unit_id: t, unit_subdivision_id: null } : t;

/**
 * Todos os vínculos de um contrato (principal + lease_units), com a fração quando houver.
 * Capture ANTES de excluir o contrato (lease_units cai em cascata).
 */
export async function getLeaseUnitRefs(leaseId: string): Promise<LeaseUnitRef[]> {
  const [{ data: lease }, { data: links }] = await Promise.all([
    supabase.from("leases").select("unit_id, unit_subdivision_id").eq("id", leaseId).maybeSingle(),
    supabase.from("lease_units").select("unit_id, unit_subdivision_id").eq("lease_id", leaseId),
  ]);
  const map = new Map<string, LeaseUnitRef>();
  if (lease?.unit_id) {
    const r = { unit_id: lease.unit_id, unit_subdivision_id: (lease as any).unit_subdivision_id ?? null };
    map.set(leaseUnitRefKey(r), r);
  }
  (links || []).forEach((l: any) => {
    if (!l.unit_id) return;
    const r = { unit_id: l.unit_id, unit_subdivision_id: l.unit_subdivision_id ?? null };
    map.set(leaseUnitRefKey(r), r);
  });
  return Array.from(map.values());
}

/** Ids dos imóveis de um contrato (sem repetir o imóvel quando há mais de uma fração). */
export async function getLeaseUnitIds(leaseId: string): Promise<string[]> {
  const refs = await getLeaseUnitRefs(leaseId);
  return Array.from(new Set(refs.map((r) => r.unit_id)));
}

/**
 * True se o imóvel (ou a fração, quando informada) tem outro contrato vivo (active/pending),
 * direto ou via lease_units.
 */
export async function unitHasOtherLiveLease(
  unitId: string,
  excludeLeaseId: string,
  subdivisionId?: string | null,
): Promise<boolean> {
  let direct = supabase
    .from("leases")
    .select("id")
    .neq("id", excludeLeaseId)
    .in("status", LIVE_LEASE_STATUSES)
    .limit(1);
  let links = supabase
    .from("lease_units")
    .select("lease_id, lease:leases!inner(status)")
    .neq("lease_id", excludeLeaseId)
    .in("lease.status", LIVE_LEASE_STATUSES)
    .limit(1);
  if (subdivisionId) {
    direct = direct.eq("unit_subdivision_id", subdivisionId);
    links = links.eq("unit_subdivision_id", subdivisionId);
  } else {
    direct = direct.eq("unit_id", unitId);
    links = links.eq("unit_id", unitId);
  }
  const [{ data: d, error: e1 }, { data: l, error: e2 }] = await Promise.all([direct, links]);
  // Em caso de erro, assume que há outro contrato (não libera às cegas)
  if (e1 || e2) {
    console.error("[unitHasOtherLiveLease]", e1 || e2);
    return true;
  }
  return (d || []).length > 0 || (l || []).length > 0;
}

/**
 * Libera os imóveis/frações de um contrato encerrado/excluído: só zera ocupação e
 * inquilino dos que NÃO têm outro contrato vivo. Fração: limpa `unit_subdivisions`
 * (o trigger agrega o status do imóvel). Unidade inteira: limpa `units` e sincroniza
 * o status. Aceita ids (unidade inteira) ou vínculos. Best-effort: nunca lança.
 */
export async function releaseLeaseUnits(
  leaseId: string,
  targets: Array<string | LeaseUnitRef>,
): Promise<void> {
  for (const ref of targets.map(toRef)) {
    try {
      if (ref.unit_subdivision_id) {
        if (!(await unitHasOtherLiveLease(ref.unit_id, leaseId, ref.unit_subdivision_id))) {
          const { error } = await supabase
            .from("unit_subdivisions")
            .update({ tenant_contact_id: null, status: "available" })
            .eq("id", ref.unit_subdivision_id);
          if (error) console.error("[releaseLeaseUnits] Erro ao liberar fração:", error);
        }
        continue;
      }
      if (!(await unitHasOtherLiveLease(ref.unit_id, leaseId))) {
        const { error } = await supabase
          .from("units")
          .update({ is_occupied: false, tenant_contact_id: null })
          .eq("id", ref.unit_id);
        if (error) console.error("[releaseLeaseUnits] Erro ao liberar imóvel:", error);
      }
      await syncUnitStatusForLease(ref.unit_id);
    } catch (error) {
      console.error("[releaseLeaseUnits] Falha inesperada:", error);
    }
  }
}

/**
 * Ocupa todos os imóveis/frações do contrato. Fração: grava o inquilino e o status
 * `rented` em `unit_subdivisions` (o trigger agrega o imóvel). Unidade inteira:
 * `sync_unit_tenant_from_lease` + status. Sem `refs`/`unitIds`, busca os vínculos
 * do contrato. Best-effort.
 */
export async function occupyLeaseUnits(params: {
  leaseId: string;
  tenantContactId: string;
  startDate: string;
  refs?: LeaseUnitRef[];
  /** Legado: ids tratados como unidade inteira. Prefira `refs`. */
  unitIds?: string[];
}): Promise<void> {
  const refs =
    params.refs ??
    (params.unitIds ? params.unitIds.map((id) => toRef(id)) : await getLeaseUnitRefs(params.leaseId));
  for (const ref of refs) {
    if (ref.unit_subdivision_id) {
      const { error } = await supabase
        .from("unit_subdivisions")
        .update({ tenant_contact_id: params.tenantContactId, status: "rented" })
        .eq("id", ref.unit_subdivision_id)
        .eq("unit_id", ref.unit_id);
      if (error) console.error("[occupyLeaseUnits] Falha ao ocupar fração:", error);
      continue;
    }
    const { error } = await supabase.rpc("sync_unit_tenant_from_lease", {
      p_unit_id: ref.unit_id,
      p_tenant_contact_id: params.tenantContactId,
      p_lease_id: params.leaseId,
      p_start_date: params.startDate,
    });
    if (error) console.error("[occupyLeaseUnits] Falha ao sincronizar imóvel:", error);
    await syncUnitStatusForLease(ref.unit_id);
  }
}
