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

/** Tipos fixos aceitos em `leases.additional_obligations` */
const FIXED_ADDITIONAL_TYPES = ["condominium", "energy", "water", "gas", "other"];

const isAdditionalKey = (key: string) =>
  FIXED_ADDITIONAL_TYPES.includes(key) || key.startsWith("custom_");

/**
 * Próxima data de vencimento (YYYY-MM-DD) a partir de um dia do mês.
 * Usada apenas quando a obrigação está sendo ativada pela primeira vez e o
 * contrato ainda não possui uma data definida.
 */
export function nextDueDateFromDay(dueDay: number, base: Date = new Date()): string {
  const day = Math.min(Math.max(Number(dueDay) || 10, 1), 28);
  const due = new Date(base.getFullYear(), base.getMonth(), day);
  if (due < base) due.setMonth(due.getMonth() + 1);
  const m = String(due.getMonth() + 1).padStart(2, "0");
  const d = String(due.getDate()).padStart(2, "0");
  return `${due.getFullYear()}-${m}-${d}`;
}

export interface LeaseChargesPatch {
  due_day?: number;
  fire_insurance?: FireInsuranceConfig;
  iptu_charge?: IptuChargeConfig;
  additional_obligations?: ObligationChargeConfig[];
}

export interface LeaseChargesTarget {
  dueDay: number;
  tenantContactId?: string | null;
  ownerContactId?: string | null;
  fireInsurance?: FireInsuranceConfig | null;
  iptuCharge?: IptuChargeConfig | null;
  additionalObligations?: ObligationChargeConfig[] | null;
}

/**
 * Mapeamento reverso de `units.obligations_config` para os encargos do contrato
 * (`leases.fire_insurance`, `leases.iptu_charge`, `leases.additional_obligations`
 * e `leases.due_day`). Função irmã de `buildObligationsConfigFromLease`.
 *
 * Nunca sobrescreve uma `first_due_date` já existente no contrato: só define
 * uma nova quando a obrigação está sendo ativada e o contrato não tem valor.
 */
export function buildLeaseChargesFromObligationsConfig(
  config: Record<string, ObligationConfig | undefined>,
  target: LeaseChargesTarget
): LeaseChargesPatch {
  const patch: LeaseChargesPatch = {};

  const chargeToOf = (c: ObligationConfig): LeaseChargeResponsible => {
    const r = String(c.responsible || "tenant").toLowerCase();
    if (r === "owner") return "owner";
    if (r === "agency") return "agency";
    return "tenant";
  };

  const linkOf = (c: ObligationConfig, chargeTo: LeaseChargeResponsible) => ({
    agency_contact_id: chargeTo === "agency" ? c.agency_contact_id ?? null : null,
    responsible_contact_id: resolveResponsibleContactId(
      chargeTo,
      { agency_contact_id: c.agency_contact_id ?? null, responsible_contact_id: (c as any).responsible_contact_id ?? null },
      target
    ),
  });

  // Aluguel — dia de vencimento central do contrato
  const rentDueDay = Number(config.rent?.due_day);
  if (rentDueDay >= 1 && rentDueDay <= 31 && rentDueDay !== target.dueDay) {
    patch.due_day = rentDueDay;
  }
  const baseDueDay = patch.due_day || target.dueDay || 10;

  // Seguro incêndio
  const insurance = config.insurance;
  if (insurance) {
    const current = target.fireInsurance || null;
    const enabled = !!insurance.active;
    const chargeTo = chargeToOf(insurance);
    patch.fire_insurance = {
      total_amount: current?.total_amount ?? 0,
      installments: current?.installments ?? 12,
      ...(current || {}),

      ...linkOf(insurance, chargeTo),
      enabled,
      charge_to: chargeTo,
      installment_amount: insurance.amount ?? current?.installment_amount ?? 0,
      first_due_date:
        current?.first_due_date ||
        (enabled ? nextDueDateFromDay(insurance.due_day || baseDueDay) : null),
    } as FireInsuranceConfig;
  }

  // IPTU
  const iptu = config.iptu;
  if (iptu) {
    const current = target.iptuCharge || null;
    const enabled = !!iptu.active;
    const chargeTo = chargeToOf(iptu);
    patch.iptu_charge = {
      annual_amount: current?.annual_amount ?? 0,
      installments: current?.installments ?? 10,
      source: current?.source ?? "manual",
      ...(current || {}),
      ...linkOf(iptu, chargeTo),
      enabled,
      charge_to: chargeTo,
      installment_amount: iptu.amount ?? current?.installment_amount ?? 0,
      first_due_date:
        current?.first_due_date ||
        (enabled ? nextDueDateFromDay(iptu.due_day || baseDueDay) : null),
    } as IptuChargeConfig;
  }

  // Encargos adicionais (tipos fixos + custom_<uuid>)
  const additionalKeys = Object.keys(config).filter(
    (k) => k !== "__meta" && isAdditionalKey(k) && !!config[k]
  );
  if (additionalKeys.length > 0) {
    const existing = [...(target.additionalObligations || [])];
    additionalKeys.forEach((key) => {
      const c = config[key]!;
      const chargeTo = chargeToOf(c);
      const idx = existing.findIndex((o) => o?.type === key);
      const current = idx >= 0 ? existing[idx] : null;
      const next: ObligationChargeConfig = {
        ...(current || { type: key, label: null }),
        ...linkOf(c, chargeTo),
        type: key,
        enabled: !!c.active,
        charge_to: chargeTo,
        installment_amount: c.amount ?? current?.installment_amount ?? 0,
        first_due_date:
          current?.first_due_date ||
          (c.active ? nextDueDateFromDay(c.due_day || baseDueDay) : null),
      };
      if (idx >= 0) existing[idx] = next;
      else existing.push(next);
    });
    patch.additional_obligations = existing;
  }

  return patch;
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
