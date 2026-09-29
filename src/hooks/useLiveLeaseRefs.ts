import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LIVE_LEASE_STATUSES } from "@/lib/unit-status-sync";

const NO_LEASE = "00000000-0000-0000-0000-000000000000";

export interface LiveLeaseRefs {
  wholeUnitBusy: boolean;
  busySubdivisionIds: Set<string>;
  /** Inquilinos dos contratos vivos (um por contrato), com o rótulo da fração quando houver. */
  tenants: { leaseId: string; name: string | null; subdivisionLabel: string | null }[];
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
          .select("lease_id, unit_subdivision_id, subdivision:unit_subdivisions(label), lease:leases!inner(status, tenant:contacts!leases_tenant_contact_id_fkey(name))")
          .eq("unit_id", unitId!)
          .neq("lease_id", exclude)
          .in("lease.status", LIVE_LEASE_STATUSES),
        supabase
          .from("leases")
          .select("id, unit_subdivision_id, subdivision:unit_subdivisions!leases_unit_subdivision_id_fkey(label), tenant:contacts!leases_tenant_contact_id_fkey(name)")
          .eq("unit_id", unitId!)
          .neq("id", exclude)
          .in("status", LIVE_LEASE_STATUSES),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const busy = new Set<string>();
      let whole = false;
      const tenants = new Map<string, LiveLeaseRefs["tenants"][number]>();
      [...(links || []), ...(direct || [])].forEach((r: any) => {
        if (r.unit_subdivision_id) busy.add(r.unit_subdivision_id);
        else whole = true;
        const leaseId = r.lease_id ?? r.id;
        if (leaseId && !tenants.has(leaseId)) {
          tenants.set(leaseId, {
            leaseId,
            name: (r.lease?.tenant ?? r.tenant)?.name ?? null,
            subdivisionLabel: r.subdivision?.label ?? null,
          });
        }
      });
      return { wholeUnitBusy: whole, busySubdivisionIds: busy, tenants: Array.from(tenants.values()) };
    },
    enabled: !!unitId,
  });
  return {
    wholeUnitBusy: q.data?.wholeUnitBusy ?? false,
    busySubdivisionIds: q.data?.busySubdivisionIds ?? new Set<string>(),
    tenants: q.data?.tenants ?? [],
    isLoading: q.isLoading,
  };
}
