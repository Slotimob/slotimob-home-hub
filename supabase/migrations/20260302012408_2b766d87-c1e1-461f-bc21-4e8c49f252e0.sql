
-- =============================================
-- 1. UPDATE FREE PLAN FEATURES
-- =============================================
UPDATE subscription_plans
SET features = jsonb_build_object(
  'assets_limit', 5,
  'users_limit', 1,
  'contacts_limit', -1,
  'asset_health_tracking_limit', -1,
  'asset_management', true,
  'whatsapp_instances_limit', 0,
  'whatsapp_conversations_included', 0,
  'crm_basic', true,
  'crm_full', false,
  'finance_simple', true,
  'finance_full', false,
  'finance_dre', false,
  'finance_categories_edit', false,
  'reports_overview', false,
  'reports_weekly', false,
  'reports_monthly', false,
  'reports_period_limit_months', 0,
  'documents_my_docs', false,
  'documents_templates_per_month', 0,
  'documents_edit_layout', false,
  'pipeline_create_stages', false,
  'integrations', '[]'::jsonb,
  'portals_limit', 0,
  'team_management', false,
  'ai_chat', false
)
WHERE id = 'free';

-- =============================================
-- 2. UPDATE START PLAN (post-trial = same as Free)
-- =============================================
UPDATE subscription_plans
SET features = jsonb_build_object(
  'assets_limit', 5,
  'users_limit', 1,
  'contacts_limit', -1,
  'asset_health_tracking_limit', -1,
  'asset_management', true,
  'whatsapp_instances_limit', 0,
  'whatsapp_conversations_included', 0,
  'crm_basic', true,
  'crm_full', false,
  'finance_simple', true,
  'finance_full', false,
  'finance_dre', false,
  'finance_categories_edit', false,
  'reports_overview', false,
  'reports_weekly', false,
  'reports_monthly', false,
  'reports_period_limit_months', 0,
  'documents_my_docs', false,
  'documents_templates_per_month', 0,
  'documents_edit_layout', false,
  'pipeline_create_stages', false,
  'integrations', '[]'::jsonb,
  'portals_limit', 0,
  'team_management', false,
  'ai_chat', false
)
WHERE id = 'start';

-- =============================================
-- 3. UPDATE ESSENCIAL PLAN
-- assets_limit: 15, CRM Completo, Financeiro Simples,
-- IA 50 tokens, SEM WhatsApp, SEM Documentos, SEM Relatórios
-- Early Adopter: 10 vagas
-- =============================================
UPDATE subscription_plans
SET 
  early_adopter_limit = 10,
  features = jsonb_build_object(
    'assets_limit', 15,
    'users_limit', 1,
    'contacts_limit', -1,
    'asset_health_tracking_limit', -1,
    'asset_management', true,
    'whatsapp_instances_limit', 0,
    'whatsapp_conversations_included', 0,
    'crm_basic', true,
    'crm_full', true,
    'finance_simple', true,
    'finance_full', false,
    'finance_dre', false,
    'finance_categories_edit', false,
    'reports_overview', false,
    'reports_weekly', false,
    'reports_monthly', false,
    'reports_period_limit_months', 0,
    'documents_my_docs', false,
    'documents_templates_per_month', 0,
    'documents_edit_layout', false,
    'pipeline_create_stages', true,
    'integrations', '[]'::jsonb,
    'portals_limit', 0,
    'team_management', false,
    'ai_chat', true
  )
WHERE id = 'essencial';

-- =============================================
-- 4. UPDATE PRO PLAN (verify/align)
-- 50 unidades, 1 usuário, CRM Completo, Financeiro Completo,
-- IA 250 tokens, WhatsApp 1 Instância, Documentos, Relatórios
-- =============================================
UPDATE subscription_plans
SET features = jsonb_build_object(
  'assets_limit', 50,
  'users_limit', 1,
  'contacts_limit', -1,
  'asset_health_tracking_limit', -1,
  'asset_management', true,
  'whatsapp_instances_limit', 1,
  'whatsapp_conversations_included', 500,
  'crm_basic', true,
  'crm_full', true,
  'finance_simple', true,
  'finance_full', true,
  'finance_dre', true,
  'finance_categories_edit', true,
  'reports_overview', true,
  'reports_weekly', true,
  'reports_monthly', true,
  'reports_period_limit_months', -1,
  'documents_my_docs', true,
  'documents_templates_per_month', -1,
  'documents_edit_layout', true,
  'pipeline_create_stages', true,
  'integrations', '["google_calendar","signature_services","whatsapp","all_portals"]'::jsonb,
  'portals_limit', -1,
  'team_management', false,
  'ai_chat', true
)
WHERE id = 'pro';

-- =============================================
-- 5. UPDATE BUSINESS PLAN
-- 80 unidades, 4 usuários, tudo liberado, WhatsApp 3 instâncias
-- =============================================
UPDATE subscription_plans
SET features = jsonb_build_object(
  'assets_limit', 80,
  'users_limit', 4,
  'contacts_limit', -1,
  'asset_health_tracking_limit', -1,
  'asset_management', true,
  'whatsapp_instances_limit', 3,
  'whatsapp_conversations_included', 500,
  'crm_basic', true,
  'crm_full', true,
  'finance_simple', true,
  'finance_full', true,
  'finance_dre', true,
  'finance_categories_edit', true,
  'reports_overview', true,
  'reports_weekly', true,
  'reports_monthly', true,
  'reports_period_limit_months', -1,
  'documents_my_docs', true,
  'documents_templates_per_month', -1,
  'documents_edit_layout', true,
  'pipeline_create_stages', true,
  'integrations', '["google_calendar","signature_services","whatsapp","all_portals"]'::jsonb,
  'portals_limit', -1,
  'team_management', true,
  'ai_chat', true
)
WHERE id = 'business';

-- =============================================
-- 6. UPDATE RPC get_ai_credits_balance
-- Business=750, Pro=250, Essencial=50, Trial=50, Free=0
-- =============================================
CREATE OR REPLACE FUNCTION public.get_ai_credits_balance(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_used integer;
  v_bonus integer;
  v_plan_id text;
  v_status text;
BEGIN
  SELECT s.ai_credits_limit, s.ai_credits_used, COALESCE(s.plan_id, 'free'), COALESCE(s.status, 'none')
  INTO v_limit, v_used, v_plan_id, v_status
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;

  IF v_limit IS NULL THEN
    v_limit := 0;
    v_used := 0;
    v_plan_id := 'free';
    v_status := 'none';
  END IF;

  -- Override limit based on plan + status
  IF v_plan_id = 'business' THEN
    IF v_status = 'active' THEN
      v_limit := 750;
    ELSIF v_status = 'trialing' THEN
      v_limit := 50;
    ELSE
      v_limit := 0;
    END IF;
  ELSIF v_plan_id = 'pro' THEN
    IF v_status = 'active' THEN
      v_limit := 250;
    ELSIF v_status = 'trialing' THEN
      v_limit := 50;
    ELSE
      v_limit := 0;
    END IF;
  ELSIF v_plan_id = 'essencial' THEN
    IF v_status = 'active' THEN
      v_limit := 50;
    ELSIF v_status = 'trialing' THEN
      v_limit := 50;
    ELSE
      v_limit := 0;
    END IF;
  ELSE
    v_limit := 0;
  END IF;

  -- Get bonus credits from ai_credits table (purchased credits)
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_bonus
  FROM ai_credits
  WHERE broker_id = p_user_id
    AND credits_remaining > 0
    AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'plan_id', v_plan_id,
    'status', v_status,
    'limit', v_limit,
    'used', COALESCE(v_used, 0),
    'remaining', GREATEST(0, v_limit - COALESCE(v_used, 0)),
    'bonus_credits', v_bonus,
    'total_available', GREATEST(0, v_limit - COALESCE(v_used, 0)) + v_bonus
  );
END;
$function$;
