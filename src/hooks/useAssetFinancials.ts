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
  financial_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetExpenseTransaction {
  id: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  status: string | null;
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
      affects_market_value: boolean;
      invoice_doc_path?: string | null;
      financial_transaction_id?: string | null;
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

export function useUnitFinancialTransactions(
  assetType: AssetType,
  assetId: string | undefined
) {
  return useQuery({
    queryKey: ['asset-expense-transactions', assetType, assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const select = 'id, description, amount, transaction_date, status';

      if (assetType === 'property') {
        const { data: childUnits, error: unitsError } = await supabase
          .from('units')
          .select('id')
          .eq('property_id', assetId);
        if (unitsError) throw unitsError;

        const unitIds = (childUnits || []).map((u: any) => u.id).filter(Boolean);

        let query = supabase
          .from('financial_transactions')
          .select(select)
          .eq('type', 'expense');

        query = unitIds.length
          ? query.or(`property_id.eq.${assetId},unit_id.in.(${unitIds.join(',')})`)
          : query.eq('property_id', assetId);

        const { data, error } = await query.order('transaction_date', { ascending: false });
        if (error) throw error;

        const seen = new Set<string>();
        const unique = (data || []).filter((t: any) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        return unique as AssetExpenseTransaction[];
      }

      const col = fkColumn(assetType);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(select)
        .eq('type', 'expense')
        .eq(col, assetId)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      return (data || []) as AssetExpenseTransaction[];
    },

    enabled: !!assetId,
  });
}

export function useReconcileImprovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      assetType: AssetType;
      assetId: string;
      financial_transaction_id: string | null;
    }) => {
      const { error } = await supabase
        .from('asset_improvements')
        .update({ financial_transaction_id: payload.financial_transaction_id } as any)
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

/**
 * Re-syncs units.market_value / properties.market_value with the most recent
 * market_value_history entry for the asset. There is no DB trigger for this
 * (only an INSERT audit trigger), so it is handled here after edits/deletes.
 */
async function resyncCurrentMarketValue(assetType: AssetType, assetId: string) {
  const { data, error } = await supabase
    .from('market_value_history')
    .select('value, effective_date')
    .eq(fkColumn(assetType), assetId)
    .order('effective_date', { ascending: false })
    .order('recorded_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const latest = (data || [])[0] as { value: number } | undefined;
  const { error: updateError } = await supabase
    .from(tableName(assetType))
    .update({ market_value: latest ? latest.value : null })
    .eq('id', assetId);
  if (updateError) throw updateError;
}

export function useUpdateMarketValueEntry(assetType: AssetType, assetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      value: number;
      effective_date: string;
      source?: string;
      appraiser_name?: string | null;
      note?: string | null;
    }) => {
      if (!assetId) throw new Error('Missing context');
      const { id, ...fields } = payload;
      const { error } = await supabase
        .from('market_value_history')
        .update({
          value: fields.value,
          effective_date: fields.effective_date,
          ...(fields.source !== undefined ? { source: fields.source } : {}),
          appraiser_name: fields.appraiser_name ?? null,
          note: fields.note ?? null,
        } as any)
        .eq('id', id);
      if (error) throw error;

      await resyncCurrentMarketValue(assetType, assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-value-history', assetType, assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-acquisition', assetType, assetId] });
      queryClient.invalidateQueries({ queryKey: ['unit', assetId] });
      queryClient.invalidateQueries({ queryKey: ['property', assetId] });
    },
  });
}

export function useDeleteMarketValueEntry(assetType: AssetType, assetId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!assetId) throw new Error('Missing context');
      const { error } = await supabase.from('market_value_history').delete().eq('id', id);
      if (error) throw error;

      await resyncCurrentMarketValue(assetType, assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-value-history', assetType, assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-acquisition', assetType, assetId] });
      queryClient.invalidateQueries({ queryKey: ['unit', assetId] });
      queryClient.invalidateQueries({ queryKey: ['property', assetId] });
    },
  });
}
