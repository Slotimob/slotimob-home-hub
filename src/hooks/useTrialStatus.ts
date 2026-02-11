import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TrialStatus {
  planId: string;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isLoading: boolean;
}

export const useTrialStatus = (): TrialStatus => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['trial-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_user_trial_status', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching trial status:', error);
        return null;
      }

      return data as unknown as {
        plan_id: string;
        trial_ends_at: string | null;
        is_trial_active: boolean;
        trial_days_remaining: number;
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    planId: data?.plan_id || 'free',
    trialEndsAt: data?.trial_ends_at || null,
    isTrialActive: data?.is_trial_active || false,
    trialDaysRemaining: data?.trial_days_remaining || 0,
    isLoading,
  };
};
