import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SubdivisionAvailabilityInput } from "@/lib/unit-availability";

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
