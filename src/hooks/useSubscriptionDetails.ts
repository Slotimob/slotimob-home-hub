import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';

export interface SubscriptionDetails {
  plan_id: string;
  status: string;
  is_early_adopter: boolean;
  extra_users_count: number;
  extra_unit_packs: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  trial_extension_count: number;
  last_modified_by_admin: string | null;
}

export const useSubscriptionDetails = () => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();

  // Use effectiveBrokerId so members inherit the owner's subscription
  const resolvedUserId = effectiveBrokerId || user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-details', resolvedUserId],
    queryFn: async (): Promise<SubscriptionDetails | null> => {
      if (!resolvedUserId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_id, status, is_early_adopter, extra_users_count, extra_unit_packs, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, trial_ends_at, trial_extension_count, last_modified_by_admin')
        .eq('user_id', resolvedUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription details:', error);
        return null;
      }

      return data as SubscriptionDetails;
    },
    enabled: !!resolvedUserId,
    staleTime: 2 * 60 * 1000,
  });

  const openCustomerPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const manageAddon = async (params: {
    action: 'add' | 'update' | 'remove';
    addon_type: string;
    quantity?: number;
  }) => {
    const { data, error } = await supabase.functions.invoke('manage-addons', {
      body: params,
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
    return data;
  };

  const buyCredits = async (addon_type: 'credits_whatsapp' | 'credits_ai', quantity = 1) => {
    const { data, error } = await supabase.functions.invoke('manage-addons', {
      body: { action: 'add', addon_type, quantity },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
    return data;
  };

  return {
    subscription: data,
    isLoading,
    refetch,
    openCustomerPortal,
    manageAddon,
    buyCredits,
  };
};
