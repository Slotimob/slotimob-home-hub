import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CancelSubscriptionResult {
  immediate: boolean;
  accessUntil: string | null;
  protocol: string;
}

interface CancelSubscriptionParams {
  reason?: string;
  feedback?: string;
}

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<CancelSubscriptionResult, Error, CancelSubscriptionParams>({
    mutationFn: async ({ reason, feedback }: CancelSubscriptionParams) => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { reason, feedback },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return {
        immediate: !!data?.immediate,
        accessUntil: data?.access_until ?? null,
        protocol: data?.protocol ?? '',
      } as CancelSubscriptionResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-details'] });
      queryClient.invalidateQueries({ queryKey: ['trial-status'] });
      queryClient.invalidateQueries({ queryKey: ['trial-status-limits'] });
      // Keys usadas pelo useSubscriptionLimits
      queryClient.invalidateQueries({ queryKey: ['user-plan-features'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-addons'] });
    },
  });
};
