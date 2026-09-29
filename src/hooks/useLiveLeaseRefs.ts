import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LIVE_LEASE_STATUSES } from "@/lib/unit-status-sync";

const NO_LEASE = "00000000-0000-0000-0000-000000000000";

export interface LiveLeaseRefs {
  wholeUnitBusy: boolean;
  busySubdivisionIds: Set<string>;
}

/** Vínculos de contratos vivos (active/pending) do imóvel, ignorando `excludeLeaseId`. */
export function useLiveLeaseRefs(unitId: string | null | undefined, excludeLeaseId?: string | null) {
  const exclude = excludeLeaseId || NO_LEASE;
  const q = useQuery({
    queryKey: ["live-lease-refs", unitId, exclude],
    queryFn: async (): Promise<LiveLeaseRefs> => {
      const [{ data: links, error: e1 }, { data: direct, error: e2 }] = await Promise.all([
        supabase
          .from("lease_units")
          .select("unit_subdivision_id, lease:leases!inner(status)")
          .eq("unit_id", unitId!)
          .neq("lease_id", exclude)
          .in("lease.status", LIVE_LEASE_STATUSES),
        supabase
          .from("leases")
          .select("unit_subdivision_id")
          .eq("unit_id", unitId!)
          .neq("id", exclude)
          .in("status", LIVE_LEASE_STATUSES),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const busy = new Set<string>();
      let whole = false;
      [...(links || []), ...(direct || [])].forEach((r: any) => {
        if (r.unit_subdivision_id) busy.add(r.unit_subdivision_id);
        else whole = true;
      });
      return { wholeUnitBusy: whole, busySubdivisionIds: busy };
    },
    enabled: !!unitId,
  });
  return {
    wholeUnitBusy: q.data?.wholeUnitBusy ?? false,
    busySubdivisionIds: q.data?.busySubdivisionIds ?? new Set<string>(),
    isLoading: q.isLoading,
  };
}
