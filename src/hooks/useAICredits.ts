import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AICreditsData {
  plan_id: string;
  limit: number;
  used: number;
  remaining: number;
  bonus_credits: number;
  total_available: number;
}

export function useAICredits() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-credits', user?.id],
    queryFn: async (): Promise<AICreditsData> => {
      const { data, error } = await supabase.rpc('get_ai_credits_balance', {
        p_user_id: user!.id,
      });

      if (error) throw error;

      return data as unknown as AICreditsData;
    },
    enabled: !!user?.id,
    staleTime: 30_000, // 30s
    refetchOnWindowFocus: true,
  });

  return {
    credits: data ?? null,
    isLoading,
    refetch,
  };
}
