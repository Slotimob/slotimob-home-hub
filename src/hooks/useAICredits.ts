import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';

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
  const { effectiveBrokerId } = useWorkspace();

  const targetId = effectiveBrokerId || user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-credits', targetId],
    queryFn: async (): Promise<AICreditsData> => {
      const { data, error } = await supabase.rpc('get_ai_credits_balance', {
        p_user_id: targetId!,
      });

      if (error) throw error;

      return data as unknown as AICreditsData;
    },
    enabled: !!targetId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return {
    credits: data ?? null,
    isLoading,
    refetch,
  };
}
