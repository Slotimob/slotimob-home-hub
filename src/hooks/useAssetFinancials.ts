import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

export type AssetType = 'property' | 'unit';

export interface AcquisitionData {
  acquisition_value: number | null;
  acquisition_date: string | null;
  acquisition_costs: number | null;
  acquisition_notes: string | null;
}

export interface Improvement {
  id: string;
  broker_id: string;
  asset_type: string;
  property_id: string | null;
  unit_id: string | null;
  improvement_type: string;
  description: string;
  cost: number;
  completed_at: string;
  invoice_doc_path: string | null;
  affects_market_value: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketValueEntry {
  id: string;
  value: number;
  effective_date: string;
  source: string;
  appraiser_name: string | null;
  note: string | null;
  recorded_at: string;
}

const tableName = (assetType: AssetType) =>
  assetType === 'property' ? 'properties' : 'units';

const fkColumn = (assetType: AssetType) =>
  assetType === 'property' ? 'property_id' : 'unit_id';

export function useAssetAcquisition(assetType: AssetType, assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-acquisition', assetType, assetId],
    queryFn: async () => {
      if (!assetId) return null;
      const { data, error } = await supabase
        .from(tableName(assetType))
        .select('acquisition_value, acquisition_date, acquisition_costs, acquisition_notes')
        .eq('id', assetId)
        .single();
      if (error) throw error;
      return data as AcquisitionData;
    },
    enabled: !!assetId,
  });
}

export function useSaveAcquisition(assetType: AssetType, assetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AcquisitionData>) => {
      if (!assetId) throw new Error('No asset ID');
      const { error } = await supabase
        .from(tableName(assetType))
        .update(payload)
        .eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-acquisition', assetType, assetId] });
    },
  });
}

export function useAssetImprovements(assetType: AssetType, assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-improvements', assetType, assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const col = fkColumn(assetType);
      const { data, error } = await supabase
        .from('asset_improvements')
        .select('*')
        .eq(col, assetId)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Improvement[];
    },
    enabled: !!assetId,
    select: (data) => {
      const totalCost = data.reduce((s, i) => s + i.cost, 0);
      const totalCostAffectsMarket = data.reduce(
        (s, i) => s + (i.affects_market_value ? i.cost : 0), 0
      );
      return { items: data, totalCost, totalCostAffectsMarket };
    },
  });
}

export function useCreateImprovement() {
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: {
      assetType: AssetType;
      assetId: string;
      improvement_type: string;
      description: string;
      cost: number;
      completed_at: string;
      affects_market_value: boolean;
      invoice_doc_path?: string | null;
    }) => {
      const { assetType, assetId, ...rest } = payload;
      const insert: Record<string, unknown> = {
        ...rest,
        broker_id: effectiveBrokerId,
        asset_type: assetType,
        [fkColumn(assetType)]: assetId,
      };
      // For unit improvements, also set property_id if available
      const { data, error } = await supabase
        .from('asset_improvements')
        .insert(insert as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-improvements', vars.assetType, vars.assetId] });
    },
  });
}

export function useUpdateImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      assetType: AssetType;
      assetId: string;
      improvement_type: string;
      description: string;
      cost: number;
      completed_at: string;
      affects_market_value: boolean;
      invoice_doc_path?: string | null;
    }) => {
      const { id, assetType, assetId, ...rest } = payload;
      const { error } = await supabase
        .from('asset_improvements')
        .update(rest as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-improvements', vars.assetType, vars.assetId] });
    },
  });
}

export function useDeleteImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; assetType: AssetType; assetId: string }) => {
      const { error } = await supabase
        .from('asset_improvements')
        .delete()
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-improvements', vars.assetType, vars.assetId] });
    },
  });
}

export function useMarketValueHistory(
  assetType: AssetType,
  assetId: string | undefined,
  periodFrom?: string,
  periodTo?: string
) {
  return useQuery({
    queryKey: ['market-value-history', assetType, assetId, periodFrom, periodTo],
    queryFn: async () => {
      if (!assetId) return [];
      const col = fkColumn(assetType);
      let query = supabase
        .from('market_value_history')
        .select('id, value, effective_date, source, appraiser_name, note, recorded_at')
        .eq(col, assetId)
        .order('effective_date', { ascending: true });

      if (periodFrom) query = query.gte('effective_date', periodFrom);
      if (periodTo) query = query.lte('effective_date', periodTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketValueEntry[];
    },
    enabled: !!assetId,
  });
}

export function useRecordMarketValue(assetType: AssetType, assetId: string | undefined) {
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  return useMutation({
    mutationFn: async (payload: {
      value: number;
      effective_date: string;
      source: string;
      appraiser_name?: string | null;
      note?: string | null;
    }) => {
      if (!assetId || !effectiveBrokerId) throw new Error('Missing context');

      // Insert history entry
      const insert: Record<string, unknown> = {
        broker_id: effectiveBrokerId,
        asset_type: assetType,
        [fkColumn(assetType)]: assetId,
        value: payload.value,
        effective_date: payload.effective_date,
        source: payload.source,
        appraiser_name: payload.appraiser_name || null,
        note: payload.note || null,
      };

      const { error: historyError } = await supabase
        .from('market_value_history')
        .insert(insert as any);
      if (historyError) throw historyError;

      // Only update the current market_value if effective_date is today
      const today = new Date().toISOString().split('T')[0];
      if (payload.effective_date === today) {
        const { error: updateError } = await supabase
          .from(tableName(assetType))
          .update({ market_value: payload.value })
          .eq('id', assetId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-value-history', assetType, assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-acquisition', assetType, assetId] });
    },
  });
}
