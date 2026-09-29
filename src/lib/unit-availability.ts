/**
 * Disponibilidade real de um imóvel considerando frações.
 * O banco marca units.status = 'rented' quando QUALQUER fração tem inquilino;
 * aqui separamos "parcialmente alugado" de "alugado".
 */
export type UnitAvailabilityKind = "available" | "partial" | "rented" | "sold" | "other";

export interface UnitAvailability {
  kind: UnitAvailabilityKind;
  label: string;
  freeCount: number;
  total: number;
}

export interface SubdivisionAvailabilityInput {
  status?: string | null;
  tenant_contact_id?: string | null;
}

export function isSubdivisionOccupied(s: SubdivisionAvailabilityInput): boolean {
  return !!s.tenant_contact_id || s.status === "rented";
}

export function unitAvailability(
  unit: { status?: string | null; has_subdivisions?: boolean | null },
  subdivisions?: SubdivisionAvailabilityInput[] | null,
): UnitAvailability {
  const status = unit?.status ?? null;
  if (status === "sold") return { kind: "sold", label: "Vendido", freeCount: 0, total: 0 };

  if (unit?.has_subdivisions && subdivisions && subdivisions.length > 0) {
    const total = subdivisions.length;
    const freeCount = subdivisions.filter((s) => !isSubdivisionOccupied(s)).length;
    if (freeCount === total) return { kind: "available", label: "Disponível", freeCount, total };
    if (freeCount === 0) return { kind: "rented", label: "Alugado", freeCount, total };
    return {
      kind: "partial",
      label: `Parcialmente alugado (${total - freeCount} de ${total} frações)`,
      freeCount,
      total,
    };
  }

  if (status === "available") return { kind: "available", label: "Disponível", freeCount: 1, total: 1 };
  if (status === "rented") return { kind: "rented", label: "Alugado", freeCount: 0, total: 1 };
  return { kind: "other", label: status ?? "", freeCount: 0, total: 1 };
}

export function freeFractionsLabel(a: UnitAvailability): string {
  return `${a.freeCount} ${a.freeCount === 1 ? "fração livre" : "frações livres"}`;
}
