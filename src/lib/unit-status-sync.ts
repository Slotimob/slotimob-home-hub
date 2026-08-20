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

    const hasActiveLease = (leases || []).length > 0;
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
