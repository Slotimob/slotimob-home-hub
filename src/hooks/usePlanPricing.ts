import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanPricing {
  id: string;
  name: string;
  price_original: number;
  price_annual: number;
  price_early_adopter: number;
  price_annual_early_adopter: number;
  early_adopter_limit: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_early_adopter: string | null;
}

export const usePlanPricing = () => {
  return useQuery({
    queryKey: ['plan-pricing'],
    queryFn: async (): Promise<Record<string, PlanPricing>> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_original, price_annual, price_early_adopter, price_annual_early_adopter, early_adopter_limit, stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_early_adopter')
        .eq('is_active', true)
        .in('id', ['start', 'essencial', 'pro', 'business']);

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
          price_early_adopter: Number(plan.price_early_adopter) || 0,
          price_annual_early_adopter: Number(plan.price_annual_early_adopter) || 0,
          early_adopter_limit: plan.early_adopter_limit,
          stripe_price_id_monthly: plan.stripe_price_id_monthly,
          stripe_price_id_yearly: plan.stripe_price_id_yearly,
          stripe_price_id_early_adopter: plan.stripe_price_id_early_adopter,
        };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};
