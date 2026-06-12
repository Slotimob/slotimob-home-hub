import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { Database } from '@/integrations/supabase/types';

type PipelineStage = Database['public']['Enums']['pipeline_stage'];

export interface Deal {
  id: string;
  stage: PipelineStage;
  custom_stage_id?: string | null;
  estimated_value: number | null;
  estimated_commission: number | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  priority?: string;
  probability?: number;
  expected_close_date?: string | null;
  loss_reason?: string | null;
  temperature?: 'hot' | 'warm' | 'cold';
  business_type?: 'sale' | 'rental';
  pipeline_type?: string;
  assigned_user_id?: string | null;
  lead: { id: string; name: string; email: string | null; phone: string | null; origin?: string | null };
  property: { id: string; name: string } | null;
  unit: { id: string; unit_number: string; status?: string } | null;
}

export const PIPELINE_DEALS_QUERY_KEY = ['pipeline-deals'] as const;

export interface UsePipelineDealsOptions {
  activePipeline: string;
  teamFilter: string;
  userId?: string;
}

export const usePipelineDeals = ({ activePipeline, teamFilter, userId }: UsePipelineDealsOptions) => {
  const { effectiveBrokerId } = useWorkspace();
  const queryClient = useQueryClient();

  const queryKey = [...PIPELINE_DEALS_QUERY_KEY, activePipeline, teamFilter, effectiveBrokerId, userId];

  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('deals')
        .select(`
          *,
          lead:leads(id, name, email, phone, origin),
          property:properties(id, name),
          unit:units(id, unit_number, status)
        `)
        .eq('pipeline_type', activePipeline)
        .order('created_at', { ascending: false });

      if (teamFilter === 'mine' && userId) {
        query = query.eq('assigned_user_id', userId);
      } else if (teamFilter !== 'all' && teamFilter !== 'mine') {
        query = query.eq('assigned_user_id', teamFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Deal[];
    },
    enabled: !!effectiveBrokerId,
    staleTime: 30_000,
  });

  const invalidateDeals = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PIPELINE_DEALS_QUERY_KEY });
  }, [queryClient]);

  /** Optimistic in-place update of the cached deals list. */
  const setDealsOptimistic = useCallback(
    (updater: (prev: Deal[]) => Deal[]) => {
      queryClient.setQueryData<Deal[]>(queryKey, (prev) => updater(prev ?? []));
    },
    [queryClient, queryKey.join('|')] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { deals, loadingDeals, invalidateDeals, setDealsOptimistic };
};
