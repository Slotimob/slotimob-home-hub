import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssetTimelineEvent } from "@/lib/asset-timeline";

/**
 * Histórico da vida real do imóvel (view `asset_timeline`).
 * Unidade: por unit_id. Empreendimento: property_id + unidades filhas.
 */
export function useAssetTimeline(assetType: "property" | "unit", assetId: string | undefined) {
  return useQuery({
    queryKey: ["asset-timeline", assetType, assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<AssetTimelineEvent[]> => {
      if (!assetId) return [];
      let q = supabase.from("asset_timeline").select("*");
      if (assetType === "unit") {
        q = q.in("unit_id", [assetId]);
      } else {
        const { data: children, error: cErr } = await supabase
          .from("units")
          .select("id")
          .eq("property_id", assetId);
        if (cErr) throw cErr;
        const ids = (children || []).map((u) => u.id);
        q = ids.length
          ? q.or(`property_id.eq.${assetId},unit_id.in.(${ids.join(",")})`)
          : q.eq("property_id", assetId);
      }
      const { data, error } = await q
        .order("occurred_on", { ascending: false, nullsFirst: false })
        .order("occurred_at", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as AssetTimelineEvent[];
    },
  });
}
