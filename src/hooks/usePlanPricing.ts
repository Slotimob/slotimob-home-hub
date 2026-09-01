import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanPricing {
  id: string;
  name: string;
  price_original: number;
  price_annual: number;
  /** Limites lidos de subscription_plans.features (fonte única: banco) */
  assets_limit: number;
  users_limit: number;
  ai_credits: number;
  whatsapp_instances_limit: number;
  team_management: boolean;
  features: Record<string, unknown>;
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : Number(v ?? fallback) || fallback;

export const usePlanPricing = () => {
  return useQuery({
    queryKey: ['plan-pricing'],
    queryFn: async (): Promise<Record<string, PlanPricing>> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_original, price_annual, features')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching plan pricing:', error);
        return {};
      }

      const map: Record<string, PlanPricing> = {};
      for (const plan of data || []) {
        const f = (plan.features ?? {}) as Record<string, unknown>;
        map[plan.id] = {
          id: plan.id,
          name: plan.name,
          price_original: Number(plan.price_original) || 0,
          price_annual: Number(plan.price_annual) || 0,
          assets_limit: num(f.assets_limit),
          users_limit: num(f.users_limit, 1),
          ai_credits: num(f.ai_credits),
          whatsapp_instances_limit: num(f.whatsapp_instances_limit),
          team_management: f.team_management === true,
          features: f,
        };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};
