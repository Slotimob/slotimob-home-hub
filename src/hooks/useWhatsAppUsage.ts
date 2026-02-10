import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WhatsAppUsage {
  service_conversations: number;
  billing_events: number;
  total_sent: number;
  total_received: number;
  credits_remaining: number;
  franchise_limit: number;
  meta_free_tier: number;
  period_start: string;
  plan: string;
  can_send: boolean;
}

export const useWhatsAppUsage = () => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['whatsapp-usage', user?.id],
    queryFn: async (): Promise<WhatsAppUsage | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_whatsapp_monthly_usage', {
        p_broker_id: user.id,
      });

      if (error) {
        console.error('Error fetching WhatsApp usage:', error);
        return null;
      }

      return data as unknown as WhatsAppUsage;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 5 * 60 * 1000, // 5 min
  });

  // Credit packs query
  const { data: creditPacks } = useQuery({
    queryKey: ['whatsapp-credit-packs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('credits');

      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const usagePercent = data
    ? (data.service_conversations / data.meta_free_tier) * 100
    : 0;

  const isNearLimit = usagePercent >= 80;
  const isAtLimit = data ? !data.can_send : false;

  return {
    usage: data,
    creditPacks: creditPacks || [],
    isLoading,
    error,
    refetch,
    usagePercent,
    isNearLimit,
    isAtLimit,
  };
};
