import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EarlyAdopterSlots {
  essencial: { remaining: number; total: number } | null;
  pro: { remaining: number; total: number } | null;
  business: { remaining: number; total: number } | null;
}

export const useEarlyAdopterCount = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['early-adopter-slots'],
    queryFn: async (): Promise<EarlyAdopterSlots> => {
      const [essencialResult, proResult, businessResult, plansResult] = await Promise.all([
        supabase.rpc('get_early_adopter_remaining_slots', { p_plan_id: 'essencial' }),
        supabase.rpc('get_early_adopter_remaining_slots', { p_plan_id: 'pro' }),
        supabase.rpc('get_early_adopter_remaining_slots', { p_plan_id: 'business' }),
        supabase.from('subscription_plans')
          .select('id, early_adopter_limit')
          .in('id', ['essencial', 'pro', 'business']),
      ]);

      const getLimit = (id: string) => plansResult.data?.find(p => p.id === id)?.early_adopter_limit || 50;

      return {
        essencial: essencialResult.data !== null ? { remaining: essencialResult.data, total: getLimit('essencial') } : null,
        pro: proResult.data !== null ? { remaining: proResult.data, total: getLimit('pro') } : null,
        business: businessResult.data !== null ? { remaining: businessResult.data, total: getLimit('business') } : null,
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Realtime subscription removed: landing page is accessible to anonymous users
  // and the realtime.messages RLS policy now requires workspace-scoped topics.
  // The `refetchInterval` of 60s keeps the slot counts fresh enough.

  return {
    slots: data || { essencial: null, pro: null, business: null },
    isLoading,
    error,
  };
};
