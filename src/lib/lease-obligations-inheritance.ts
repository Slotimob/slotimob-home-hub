import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  ObligationsConfig,
  ObligationConfig,
  ObligationsConfigMeta,
  ResponsibleRole,
} from "@/hooks/useAssetHealth";
import type {
  FireInsuranceConfig,
  IptuChargeConfig,
  ObligationChargeConfig,
  LeaseChargeResponsible,
} from "@/hooks/useLeases";

export interface LeaseObligationsSource {
  leaseId: string;
  unitId: string;
  dueDay: number;
  tenantContactId?: string | null;
  ownerContactId?: string | null;
  fireInsurance?: FireInsuranceConfig | null;
  iptuCharge?: IptuChargeConfig | null;
  additionalObligations?: ObligationChargeConfig[] | null;
}

const dayFromDate = (value?: string | null, fallback = 10): number => {
  if (!value) return fallback;
  const match = /^\d{4}-\d{2}-(\d{2})/.exec(value);
  const day = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : fallback;
};

/**
 * Resolve a referência real do responsável de um encargo do contrato.
 * tenant -> inquilino do contrato; owner -> proprietário do imóvel;
 * agency -> imobiliária escolhida no combobox.
 */
export function resolveResponsibleContactId(
  chargeTo: LeaseChargeResponsible,
  link: { responsible_contact_id?: string | null; agency_contact_id?: string | null },
  source: { tenantContactId?: string | null; ownerContactId?: string | null }
): string | null {
  if (chargeTo === "tenant") return source.tenantContactId || null;
  if (chargeTo === "owner") return source.ownerContactId || null;
  return link.agency_contact_id || link.responsible_contact_id || null;
}

/**
 * Converte os encargos configurados no contrato para o formato da
 * Configuração de Obrigações a nível de imóvel (`units.obligations_config`).
 */
export function buildObligationsConfigFromLease(
  source: LeaseObligationsSource
): Record<string, ObligationConfig> {
  const out: Record<string, ObligationConfig> = {};

  const put = (
    key: string,
    chargeTo: LeaseChargeResponsible,
    link: { responsible_contact_id?: string | null; agency_contact_id?: string | null },
    dueDay: number,
    amount: number | null
  ) => {
    out[key] = {
      active: true,
      due_day: dueDay,
      responsible: chargeTo as ResponsibleRole,
      agency_contact_id: chargeTo === "agency" ? link.agency_contact_id ?? null : null,
      responsible_contact_id: resolveResponsibleContactId(chargeTo, link, source),
      control_type: "financial",
      amount,
    };
  };

  // Aluguel — sempre cobrado do inquilino
  put(
    "rent",
    "tenant",
    { responsible_contact_id: source.tenantContactId ?? null },
    source.dueDay || 10,
    null
  );

  if (source.fireInsurance?.enabled) {
    put(
      "insurance",
      source.fireInsurance.charge_to,
      source.fireInsurance,
      dayFromDate(source.fireInsurance.first_due_date, source.dueDay || 10),
      source.fireInsurance.installment_amount || null
    );
  }

  if (source.iptuCharge?.enabled) {
    put(
      "iptu",
      source.iptuCharge.charge_to,
      source.iptuCharge,
      dayFromDate(source.iptuCharge.first_due_date, source.dueDay || 10),
      source.iptuCharge.installment_amount || null
    );
  }

  (source.additionalObligations || [])
    .filter((o) => o?.enabled)
    .forEach((o) => {
      put(
        o.type,
        o.charge_to,
        o,
        dayFromDate(o.first_due_date, source.dueDay || 10),
        o.installment_amount || null
      );
    });

  return out;
}

/**
 * Herança automática ao finalizar/ativar o contrato.
 *
 * Mescla a configuração de obrigações vinda do contrato na configuração a
 * nível de imóvel, marcando-a como **pendente de revisão** (`__meta`) até que
 * um usuário confirme em "Salvar Configurações".
 */
export async function inheritObligationsConfigFromLease(
  source: LeaseObligationsSource
): Promise<Record<string, ObligationConfig>> {
  const inherited = buildObligationsConfigFromLease(source);

  const { data: unit, error: readError } = await supabase
    .from("units")
    .select("obligations_config")
    .eq("id", source.unitId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const current = ((unit?.obligations_config as ObligationsConfig) || {}) as Record<
    string,
    unknown
  >;

  const meta: ObligationsConfigMeta = {
    pending_review: true,
    inherited_from_lease_id: source.leaseId,
    inherited_at: new Date().toISOString(),
    reviewed_at: null,
  };

  const merged: Record<string, unknown> = { ...current };
  Object.entries(inherited).forEach(([key, value]) => {
    const existing = (current[key] as ObligationConfig | undefined) || undefined;
    merged[key] = { ...(existing || {}), ...value };
  });
  merged.__meta = meta;

  const { error: updateError } = await supabase
    .from("units")
    .update({ obligations_config: JSON.parse(JSON.stringify(merged)) as Json })
    .eq("id", source.unitId);

  if (updateError) throw new Error(updateError.message);

  return inherited;
}

/** Registra na Jornada do contrato que as obrigações foram herdadas */
export async function markLeaseObligationsInherited(
  leaseId: string,
  currentMetadata: Record<string, unknown> | null | undefined
): Promise<void> {
  const { error } = await supabase
    .from("leases")
    .update({
      metadata: {
        ...(currentMetadata || {}),
        obligations_configured: true,
        obligations_inherited_at: new Date().toISOString(),
        obligations_pending_review: true,
      } as unknown as Json,
    })
    .eq("id", leaseId);

  if (error) throw new Error(error.message);
}
