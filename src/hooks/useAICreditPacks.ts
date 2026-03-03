import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AICreditPack {
  id: string;
  name: string;
  credits_amount: number;
  price: number;
  stripe_price_id: string;
  sort_order: number;
}

export function useAICreditPacks() {
  return useQuery({
    queryKey: ['ai-credit-packs'],
    queryFn: async (): Promise<AICreditPack[]> => {
      const { data, error } = await supabase
        .from('ai_credit_packs' as any)
        .select('id, name, credits_amount, price, stripe_price_id, sort_order')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data as any) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
