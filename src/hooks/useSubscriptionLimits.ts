import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkspace } from './useWorkspace';

export interface PlanFeatures {
  assets_limit: number;
  users_limit: number;
  contacts_limit: number;
  asset_health_tracking_limit: number;
  whatsapp_instances_limit: number;
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
  ai_chat: boolean;
  asset_management: boolean;
}

export type PlanId = 'free' | 'start' | 'essencial' | 'pro' | 'business' | 'ouro' | 'diamante';

export interface SubscriptionLimits {
  plan: PlanId;
  isEarlyAdopter: boolean;
  isTrialActive: boolean;
  features: PlanFeatures | null;
  isLoading: boolean;
  canUse: (feature: keyof PlanFeatures) => boolean;
  checkLimit: (resource: string, currentCount: number) => { allowed: boolean; limit: number; remaining: number };
  getUpgradeReason: (feature: keyof PlanFeatures) => string;
}

const defaultFeatures: PlanFeatures = {
  assets_limit: 5,
  users_limit: 1,
  contacts_limit: -1,
  asset_health_tracking_limit: 0,
  whatsapp_instances_limit: 0,
  crm_basic: true,
  crm_full: false,
  finance_simple: true,
  finance_full: false,
  finance_dre: false,
  finance_categories_edit: false,
  reports_overview: false,
  reports_weekly: false,
  reports_monthly: false,
  reports_period_limit_months: 0,
  documents_my_docs: false,
  documents_templates_per_month: 0,
  documents_edit_layout: false,
  pipeline_create_stages: false,
  integrations: [],
  portals_limit: 0,
  team_management: false,
  ai_chat: false,
  asset_management: false,
};

const featureDescriptions: Record<string, { name: string; upgradeMessage: string }> = {
  assets_limit: { name: 'Unidades', upgradeMessage: 'Faça upgrade para gerenciar mais unidades' },
  users_limit: { name: 'Usuários', upgradeMessage: 'Faça upgrade para o plano Business para mais usuários' },
  contacts_limit: { name: 'Contatos', upgradeMessage: 'Faça upgrade para contatos ilimitados' },
  asset_health_tracking_limit: { name: 'Gestão de Ativos', upgradeMessage: 'Faça upgrade para o plano Pro para gestão completa de ativos' },
  asset_management: { name: 'Gestão de Ativos', upgradeMessage: 'Faça upgrade para o plano Pro para gestão completa de ativos' },
  whatsapp_instances_limit: { name: 'Conexões WhatsApp', upgradeMessage: 'Faça upgrade para o plano Pro para conectar instâncias WhatsApp' },
  crm_full: { name: 'CRM Completo', upgradeMessage: 'Faça upgrade para o CRM completo com histórico de atividades' },
  finance_full: { name: 'Financeiro Completo', upgradeMessage: 'Faça upgrade para fluxo de caixa completo' },
  finance_dre: { name: 'DRE', upgradeMessage: 'Faça upgrade para o plano Pro para acessar o DRE' },
  finance_categories_edit: { name: 'Edição de Categorias', upgradeMessage: 'Faça upgrade para o plano Pro para editar categorias' },
  reports_overview: { name: 'Relatórios', upgradeMessage: 'Faça upgrade para o plano Pro para acessar relatórios' },
  reports_weekly: { name: 'Relatório Semanal', upgradeMessage: 'Faça upgrade para o plano Pro para relatórios semanais' },
  reports_monthly: { name: 'Relatório Mensal', upgradeMessage: 'Faça upgrade para o plano Pro para relatórios mensais' },
  documents_my_docs: { name: 'Documentos', upgradeMessage: 'Faça upgrade para o plano Pro para acessar documentos' },
  documents_edit_layout: { name: 'Edição de Layout', upgradeMessage: 'Faça upgrade para o plano Pro para editar layouts' },
  pipeline_create_stages: { name: 'Criar Estágios', upgradeMessage: 'Faça upgrade para criar estágios personalizados no pipeline' },
  portals_limit: { name: 'Portais', upgradeMessage: 'Faça upgrade para conectar portais imobiliários' },
  team_management: { name: 'Gestão de Equipe', upgradeMessage: 'Faça upgrade para o plano Business para gerenciar sua equipe' },
  ai_chat: { name: 'Chat IA', upgradeMessage: 'Faça upgrade para o plano Pro para acessar o Chat IA' },
};

export const useSubscriptionLimits = (): SubscriptionLimits => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();

  // Use effectiveBrokerId so members inherit the owner's plan features
  const resolvedUserId = effectiveBrokerId || user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['user-plan-features', resolvedUserId],
    queryFn: async () => {
      if (!resolvedUserId) return null;
      
      const { data, error } = await supabase.rpc('get_user_plan_features', {
        p_user_id: resolvedUserId
      });
      
      if (error) {
        console.error('Error fetching plan features:', error);
        return null;
      }
      
      return data as unknown as { plan: string; is_early_adopter: boolean; features: PlanFeatures };
    },
    enabled: !!resolvedUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch add-on counts from subscriptions (use effective broker for members)
  const { data: addonData } = useQuery({
    queryKey: ['subscription-addons', effectiveBrokerId],
    queryFn: async () => {
      if (!effectiveBrokerId) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('extra_users_count, extra_unit_packs')
        .eq('user_id', effectiveBrokerId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!effectiveBrokerId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch trial status for free users
  const { data: trialData } = useQuery({
    queryKey: ['trial-status-limits', resolvedUserId],
    queryFn: async () => {
      if (!resolvedUserId) return null;
      const { data, error } = await supabase.rpc('get_user_trial_status', {
        p_user_id: resolvedUserId,
      });
      if (error) return null;
      return data as unknown as {
        plan_id: string;
        trial_ends_at: string | null;
        is_trial_active: boolean;
        trial_days_remaining: number;
      };
    },
    enabled: !!resolvedUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Map legacy plan names to new ones, but keep 'free' as 'free'
  const rawPlan = data?.plan || 'free';
  const planMap: Record<string, PlanId> = { 'ouro': 'pro', 'diamante': 'business' };
  const plan = (planMap[rawPlan] || rawPlan) as PlanId;
  
  const isEarlyAdopter = data?.is_early_adopter || false;
  const isTrialActive = trialData?.is_trial_active || false;
  
  // During trial, free users get START (Trial) powers
  let features = data?.features || defaultFeatures;
  // During trial, users get START plan features regardless of base plan
  const effectiveTrialing = isTrialActive || (data?.plan === 'pro' && trialData?.is_trial_active);
  if (effectiveTrialing && features) {
    features = {
      ...features,
      // START (Trial): 10 unidades, CRM Completo, Financeiro Completo
      assets_limit: 10,
      crm_full: true,
      pipeline_create_stages: true,
      finance_full: true,
      finance_dre: true,
      finance_categories_edit: true,
      // IA 50 tokens
      ai_chat: true,
      // WhatsApp 1 Instância
      integrations: ['whatsapp'],
      whatsapp_instances_limit: 1,
      // Documentos e Relatórios liberados
      documents_my_docs: true,
      documents_templates_per_month: -1,
      documents_edit_layout: true,
      reports_overview: true,
      reports_weekly: true,
      reports_monthly: true,
      reports_period_limit_months: -1,
      // Gestão de Ativos liberada
      asset_management: true,
      asset_health_tracking_limit: -1,
    };
  }

  // Apply add-on expansions
  const extraUsers = addonData?.extra_users_count || 0;
  const extraUnitPacks = addonData?.extra_unit_packs || 0;
  if (features && (extraUsers > 0 || extraUnitPacks > 0)) {
    features = {
      ...features,
      users_limit: (features.users_limit === -1 ? -1 : features.users_limit + extraUsers),
      assets_limit: (features.assets_limit === -1 ? -1 : features.assets_limit + (extraUnitPacks * 50)),
    };
  }

  const canUse = (feature: keyof PlanFeatures): boolean => {
    const value = features[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === -1 || value > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  const checkLimit = (resource: string, currentCount: number): { allowed: boolean; limit: number; remaining: number } => {
    const limit = features[resource as keyof PlanFeatures];
    if (typeof limit !== 'number') return { allowed: true, limit: -1, remaining: -1 };
    if (limit === -1) return { allowed: true, limit: -1, remaining: -1 };
    const remaining = Math.max(0, limit - currentCount);
    return { allowed: currentCount < limit, limit, remaining };
  };

  const getUpgradeReason = (feature: keyof PlanFeatures): string => {
    return featureDescriptions[feature]?.upgradeMessage || 'Faça upgrade para desbloquear esta funcionalidade';
  };

  return { plan, isEarlyAdopter, isTrialActive: !!effectiveTrialing, features, isLoading, canUse, checkLimit, getUpgradeReason };
};
