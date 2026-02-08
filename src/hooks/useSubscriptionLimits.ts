import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PlanFeatures {
  assets_limit: number;
  contacts_limit: number;
  asset_health_tracking_limit: number;
  crm_basic: boolean;
  crm_full: boolean;
  finance_simple: boolean;
  finance_full: boolean;
  finance_dre: boolean;
  finance_categories_edit: boolean;
  reports_overview: boolean;
  reports_weekly: boolean;
  reports_monthly: boolean;
  reports_period_limit_months: number;
  documents_my_docs: boolean;
  documents_templates_per_month: number;
  documents_edit_layout: boolean;
  pipeline_create_stages: boolean;
  integrations: string[];
  portals_limit: number;
  team_management: boolean;
}

export interface SubscriptionLimits {
  plan: 'free' | 'ouro' | 'diamante';
  isEarlyAdopter: boolean;
  features: PlanFeatures | null;
  isLoading: boolean;
  canUse: (feature: keyof PlanFeatures) => boolean;
  checkLimit: (resource: string, currentCount: number) => { allowed: boolean; limit: number; remaining: number };
  getUpgradeReason: (feature: keyof PlanFeatures) => string;
}

const defaultFeatures: PlanFeatures = {
  assets_limit: 3,
  contacts_limit: 15,
  asset_health_tracking_limit: 3,
  crm_basic: true,
  crm_full: false,
  finance_simple: true,
  finance_full: false,
  finance_dre: false,
  finance_categories_edit: false,
  reports_overview: true,
  reports_weekly: false,
  reports_monthly: false,
  reports_period_limit_months: 6,
  documents_my_docs: true,
  documents_templates_per_month: 1,
  documents_edit_layout: false,
  pipeline_create_stages: false,
  integrations: ['google_calendar'],
  portals_limit: 0,
  team_management: false,
};

const featureDescriptions: Record<string, { name: string; upgradeMessage: string }> = {
  assets_limit: { name: 'Ativos', upgradeMessage: 'Faça upgrade para gerenciar mais imóveis' },
  contacts_limit: { name: 'Contatos', upgradeMessage: 'Faça upgrade para contatos ilimitados' },
  asset_health_tracking_limit: { name: 'Gestão de Ativos', upgradeMessage: 'Faça upgrade para monitorar mais ativos' },
  crm_full: { name: 'CRM Completo', upgradeMessage: 'Faça upgrade para o CRM completo com histórico de atividades' },
  finance_full: { name: 'Financeiro Completo', upgradeMessage: 'Faça upgrade para fluxo de caixa completo' },
  finance_dre: { name: 'DRE', upgradeMessage: 'Faça upgrade para o plano Diamante para acessar o DRE' },
  finance_categories_edit: { name: 'Edição de Categorias', upgradeMessage: 'Faça upgrade para o plano Diamante para editar categorias' },
  reports_weekly: { name: 'Relatório Semanal', upgradeMessage: 'Faça upgrade para acessar relatórios semanais' },
  reports_monthly: { name: 'Relatório Mensal', upgradeMessage: 'Faça upgrade para acessar relatórios mensais' },
  documents_edit_layout: { name: 'Edição de Layout', upgradeMessage: 'Faça upgrade para o plano Diamante para editar layouts' },
  pipeline_create_stages: { name: 'Criar Estágios', upgradeMessage: 'Faça upgrade para criar estágios personalizados no pipeline' },
  portals_limit: { name: 'Portais', upgradeMessage: 'Faça upgrade para conectar mais portais imobiliários' },
  team_management: { name: 'Gestão de Equipe', upgradeMessage: 'Faça upgrade para o plano Diamante para gerenciar sua equipe' },
};

export const useSubscriptionLimits = (): SubscriptionLimits => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-plan-features', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc('get_user_plan_features', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error fetching plan features:', error);
        return null;
      }
      
      return data as unknown as { plan: string; is_early_adopter: boolean; features: PlanFeatures };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const plan = (data?.plan || 'free') as 'free' | 'ouro' | 'diamante';
  const isEarlyAdopter = data?.is_early_adopter || false;
  const features = data?.features || defaultFeatures;

  const canUse = (feature: keyof PlanFeatures): boolean => {
    const value = features[feature];
    
    // Boolean features
    if (typeof value === 'boolean') {
      return value;
    }
    
    // Numeric limits (-1 = unlimited)
    if (typeof value === 'number') {
      return value === -1 || value > 0;
    }
    
    // Array features (integrations)
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    return false;
  };

  const checkLimit = (resource: string, currentCount: number): { allowed: boolean; limit: number; remaining: number } => {
    const limit = features[resource as keyof PlanFeatures];
    
    if (typeof limit !== 'number') {
      return { allowed: true, limit: -1, remaining: -1 };
    }
    
    if (limit === -1) {
      return { allowed: true, limit: -1, remaining: -1 };
    }
    
    const remaining = Math.max(0, limit - currentCount);
    return {
      allowed: currentCount < limit,
      limit,
      remaining,
    };
  };

  const getUpgradeReason = (feature: keyof PlanFeatures): string => {
    return featureDescriptions[feature]?.upgradeMessage || 'Faça upgrade para desbloquear esta funcionalidade';
  };

  return {
    plan,
    isEarlyAdopter,
    features,
    isLoading,
    canUse,
    checkLimit,
    getUpgradeReason,
  };
};
