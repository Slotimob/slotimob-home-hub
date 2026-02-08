-- =====================================================
-- SISTEMA DE ASSINATURAS E PLANOS
-- =====================================================

-- Tabela de definição de planos
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_original NUMERIC(10,2),
  price_anchor NUMERIC(10,2),
  price_early_adopter NUMERIC(10,2),
  early_adopter_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Todos podem ver planos ativos
CREATE POLICY "Anyone can view active plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Inserir planos
INSERT INTO public.subscription_plans (id, name, description, price_original, price_anchor, price_early_adopter, early_adopter_limit, features) VALUES
('free', 'Free', 'Para começar a organizar', 0, 0, 0, NULL, '{
  "assets_limit": 3,
  "contacts_limit": 15,
  "asset_health_tracking_limit": 3,
  "crm_basic": true,
  "crm_full": false,
  "finance_simple": true,
  "finance_full": false,
  "finance_dre": false,
  "finance_categories_edit": false,
  "reports_overview": true,
  "reports_weekly": false,
  "reports_monthly": false,
  "reports_period_limit_months": 6,
  "documents_my_docs": true,
  "documents_templates_per_month": 1,
  "documents_edit_layout": false,
  "pipeline_create_stages": false,
  "integrations": ["google_calendar"],
  "portals_limit": 0,
  "team_management": false
}'::jsonb),
('ouro', 'Ouro', 'Para corretores que querem crescer', 147, 97, 79, 200, '{
  "assets_limit": 50,
  "contacts_limit": -1,
  "asset_health_tracking_limit": 10,
  "crm_basic": true,
  "crm_full": true,
  "finance_simple": true,
  "finance_full": true,
  "finance_dre": false,
  "finance_categories_edit": false,
  "reports_overview": true,
  "reports_weekly": true,
  "reports_monthly": true,
  "reports_period_limit_months": -1,
  "documents_my_docs": true,
  "documents_templates_per_month": -1,
  "documents_edit_layout": false,
  "pipeline_create_stages": true,
  "integrations": ["google_calendar", "signature_services"],
  "portals_limit": 2,
  "team_management": false
}'::jsonb),
('diamante', 'Diamante', 'Para imobiliárias e equipes', 297, 197, 179, 100, '{
  "assets_limit": -1,
  "contacts_limit": -1,
  "asset_health_tracking_limit": -1,
  "crm_basic": true,
  "crm_full": true,
  "finance_simple": true,
  "finance_full": true,
  "finance_dre": true,
  "finance_categories_edit": true,
  "reports_overview": true,
  "reports_weekly": true,
  "reports_monthly": true,
  "reports_period_limit_months": -1,
  "documents_my_docs": true,
  "documents_templates_per_month": -1,
  "documents_edit_layout": true,
  "pipeline_create_stages": true,
  "integrations": ["google_calendar", "signature_services", "whatsapp", "all_portals"],
  "portals_limit": -1,
  "team_management": true
}'::jsonb);

-- Tabela de assinaturas dos usuários
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  is_early_adopter BOOLEAN DEFAULT false,
  price_locked NUMERIC(10,2),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver sua própria assinatura
CREATE POLICY "Users can view their own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Usuários podem inserir sua própria assinatura
CREATE POLICY "Users can insert their own subscription" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar sua própria assinatura
CREATE POLICY "Users can update their own subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Tabela para rastrear Early Adopters
CREATE TABLE public.early_adopter_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  user_id UUID NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  subscription_id UUID REFERENCES public.subscriptions(id),
  UNIQUE(plan_id, user_id)
);

-- Enable RLS
ALTER TABLE public.early_adopter_claims ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver contagem de claims (para mostrar vagas restantes)
CREATE POLICY "Anyone can view early adopter claims count" 
ON public.early_adopter_claims 
FOR SELECT 
USING (true);

-- Usuários podem inserir seu próprio claim
CREATE POLICY "Users can insert their own claim" 
ON public.early_adopter_claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Adicionar agency_id para multi-tenancy (Diamante)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable realtime para early_adopter_claims (contador em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.early_adopter_claims;

-- Função para obter contagem de vagas restantes de Early Adopter
CREATE OR REPLACE FUNCTION public.get_early_adopter_remaining_slots(p_plan_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_claimed INTEGER;
BEGIN
  -- Obter limite do plano
  SELECT early_adopter_limit INTO v_limit
  FROM subscription_plans WHERE id = p_plan_id;
  
  -- Se não tem limite, retorna NULL
  IF v_limit IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Contar claims ativos
  SELECT COUNT(*) INTO v_claimed
  FROM early_adopter_claims eac
  JOIN subscriptions s ON eac.subscription_id = s.id
  WHERE eac.plan_id = p_plan_id
  AND s.status = 'active';
  
  RETURN GREATEST(0, v_limit - v_claimed);
END;
$$;

-- Função para verificar limites do usuário
CREATE OR REPLACE FUNCTION public.check_user_limit(
  p_user_id UUID,
  p_resource TEXT,
  p_current_count INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_features JSONB;
  v_limit INTEGER;
BEGIN
  -- Buscar plano do usuário via subscription ou default free
  SELECT COALESCE(s.plan_id, 'free') INTO v_plan_id
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = p_user_id;
  
  -- Default to free if no profile found
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Buscar features do plano
  SELECT features INTO v_features
  FROM subscription_plans WHERE id = v_plan_id;

  -- Obter limite do recurso
  v_limit := (v_features->>p_resource)::INTEGER;

  -- Se limite é -1, é ilimitado
  IF v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', p_current_count, 'remaining', -1, 'plan', v_plan_id);
  END IF;

  -- Retornar status
  RETURN jsonb_build_object(
    'allowed', COALESCE(p_current_count, 0) < v_limit,
    'limit', v_limit,
    'current', COALESCE(p_current_count, 0),
    'remaining', GREATEST(0, v_limit - COALESCE(p_current_count, 0)),
    'plan', v_plan_id
  );
END;
$$;

-- Função para obter features do plano do usuário
CREATE OR REPLACE FUNCTION public.get_user_plan_features(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_features JSONB;
  v_is_early_adopter BOOLEAN;
BEGIN
  -- Buscar plano e status de early adopter
  SELECT COALESCE(s.plan_id, 'free'), COALESCE(s.is_early_adopter, false) 
  INTO v_plan_id, v_is_early_adopter
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = p_user_id;
  
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
    v_is_early_adopter := false;
  END IF;

  -- Buscar features do plano
  SELECT features INTO v_features
  FROM subscription_plans WHERE id = v_plan_id;

  RETURN jsonb_build_object(
    'plan', v_plan_id,
    'is_early_adopter', v_is_early_adopter,
    'features', v_features
  );
END;
$$;