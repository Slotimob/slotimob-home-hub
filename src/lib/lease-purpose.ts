/** Finalidade da locação (residencial/comercial) e prazo em meses. */

export type LeasePurpose = "residencial" | "comercial";

const COMMERCIAL_TYPES = new Set(["galpao", "loja", "sala_comercial"]);

export function defaultLeasePurpose(propertyTypes: (string | null | undefined)[]): LeasePurpose {
  return propertyTypes.some((t) => t && COMMERCIAL_TYPES.has(t)) ? "comercial" : "residencial";
}

/**
 * Usa lease.metadata.purpose quando válido; senão o padrão pelos tipos do
 * imóvel principal (lease.unit.property_type) e de lease_units[].unit.property_type.
 */
export function resolveLeasePurpose(lease: any): LeasePurpose {
  const meta = typeof lease?.metadata === "string" ? safeParse(lease.metadata) : lease?.metadata;
  const p = meta?.purpose;
  if (p === "residencial" || p === "comercial") return p;
  const types: (string | null | undefined)[] = [lease?.unit?.property_type, lease?.property_type];
  for (const lu of (lease?.lease_units || []) as any[]) types.push(lu?.unit?.property_type ?? lu?.property_type);
  return defaultLeasePurpose(types);
}

function safeParse(v: string) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

/** Meses entre início e fim, contando o mês final quando o fim é a véspera do aniversário. */
export function leaseTermMonths(start: string, end: string): number {
  const [sy, sm, sd] = start.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = end.slice(0, 10).split("-").map(Number);
  const e = new Date(Date.UTC(ey, em - 1, ed + 1));
  let months = (e.getUTCFullYear() - sy) * 12 + (e.getUTCMonth() - (sm - 1));
  if (e.getUTCDate() < sd) months -= 1;
  return Math.max(0, months);
}
