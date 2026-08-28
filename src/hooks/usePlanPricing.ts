import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanPricing {
  id: string;
  name: string;
  price_original: number;
  price_annual: number;
}

export const usePlanPricing = () => {
  return useQuery({
    queryKey: ['plan-pricing'],
    queryFn: async (): Promise<Record<string, PlanPricing>> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_original, price_annual')
        .eq('is_active', true)
        .in('id', ['start', 'pro', 'business']);

      if (error) {
        console.error('Error fetching plan pricing:', error);
        return {};
      }

      const map: Record<string, PlanPricing> = {};
      for (const plan of data || []) {
        map[plan.id] = {
          id: plan.id,
          name: plan.name,
          price_original: Number(plan.price_original) || 0,
          price_annual: Number(plan.price_annual) || 0,
        };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};
