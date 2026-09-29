import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SubdivisionAvailabilityInput } from "@/lib/unit-availability";
import { unitAvailability } from "@/lib/unit-availability";

/** Frações das unidades informadas numa consulta só, agrupadas por unit_id. */
export function useUnitsAvailability(unitIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(unitIds.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["units-availability", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_subdivisions")
        .select("unit_id, status, tenant_contact_id")
        .in("unit_id", ids);
      if (error) throw error;
      const map: Record<string, SubdivisionAvailabilityInput[]> = {};
      for (const s of data ?? []) (map[s.unit_id] ||= []).push(s);
      return map;
    },
  });
}

/** Rótulo do badge de status considerando frações ("Parcialmente alugado (X de Y frações)"). */
export function useUnitStatusLabels(units: { id: string; status?: string | null; has_subdivisions?: boolean | null }[]) {
  const { data: subs } = useUnitsAvailability(
    units.filter((u) => u.has_subdivisions && u.status === "rented").map((u) => u.id),
  );
  return (unit: { id: string; status?: string | null; has_subdivisions?: boolean | null }, fallback: string) => {
    const a = unitAvailability(unit, subs?.[unit.id]);
    if (a.kind === "partial") return a.label;
    if (a.kind === "available" && unit.status !== "available") return "Disponível";
    return fallback;
  };
}
