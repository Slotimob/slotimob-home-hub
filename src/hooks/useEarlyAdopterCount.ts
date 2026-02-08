import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EarlyAdopterSlots {
  ouro: { remaining: number; total: number } | null;
  diamante: { remaining: number; total: number } | null;
}

export const useEarlyAdopterCount = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['early-adopter-slots'],
    queryFn: async (): Promise<EarlyAdopterSlots> => {
      // Get remaining slots for both plans
      const [ouroResult, diamanteResult] = await Promise.all([
        supabase.rpc('get_early_adopter_remaining_slots', { p_plan_id: 'ouro' }),
        supabase.rpc('get_early_adopter_remaining_slots', { p_plan_id: 'diamante' }),
      ]);

      // Get total limits from plans
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, early_adopter_limit')
        .in('id', ['ouro', 'diamante']);

      const ouroLimit = plans?.find(p => p.id === 'ouro')?.early_adopter_limit || 200;
      const diamanteLimit = plans?.find(p => p.id === 'diamante')?.early_adopter_limit || 100;

      return {
        ouro: ouroResult.data !== null ? { remaining: ouroResult.data, total: ouroLimit } : null,
        diamante: diamanteResult.data !== null ? { remaining: diamanteResult.data, total: diamanteLimit } : null,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('early-adopter-claims-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'early_adopter_claims',
        },
        () => {
          // Invalidate query to refetch counts
          queryClient.invalidateQueries({ queryKey: ['early-adopter-slots'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    slots: data || { ouro: null, diamante: null },
    isLoading,
    error,
  };
};
