
-- PART 1: Update get_user_plan_features to merge member permissions
CREATE OR REPLACE FUNCTION public.get_user_plan_features(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_effective_id UUID;
  v_plan_id TEXT;
  v_features JSONB;
  v_is_early_adopter BOOLEAN;
  v_member_permissions JSONB;
  v_is_member BOOLEAN := false;
BEGIN
  -- Get effective broker (owner) ID
  v_effective_id := get_effective_broker_id(p_user_id);

  -- Check if the user is a member (not the owner)
  IF v_effective_id != p_user_id THEN
    v_is_member := true;
    -- Fetch member permissions from organization_members
    SELECT permissions INTO v_member_permissions
    FROM organization_members
    WHERE user_id = p_user_id
      AND organization_owner_id = v_effective_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Fetch plan from the effective user (owner's subscription)
  SELECT COALESCE(s.plan_id, 'free'), COALESCE(s.is_early_adopter, false) 
  INTO v_plan_id, v_is_early_adopter
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status IN ('active', 'trialing')
  WHERE p.id = v_effective_id;
  
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
    v_is_early_adopter := false;
  END IF;

  SELECT features INTO v_features
  FROM subscription_plans WHERE id = v_plan_id;

  -- If the user is a member, restrict features based on their permissions
  IF v_is_member AND v_member_permissions IS NOT NULL AND v_features IS NOT NULL THEN
    -- Financial module: if member lacks financial permissions, disable finance features
    IF NOT COALESCE((v_member_permissions->'financial'->>'read')::boolean, false) THEN
      v_features := v_features || jsonb_build_object(
        'finance_simple', false,
        'finance_full', false,
        'finance_dre', false,
        'finance_categories_edit', false
      );
    ELSE
      -- Has read but check for DRE specifically
      IF NOT COALESCE((v_member_permissions->'financial'->>'dre')::boolean, false) THEN
        v_features := v_features || jsonb_build_object('finance_dre', false);
      END IF;
    END IF;

    -- Documents module
    IF NOT COALESCE((v_member_permissions->'documents'->>'read')::boolean, false) 
       AND NOT COALESCE((v_member_permissions->'documents'->>'generate')::boolean, false) THEN
      v_features := v_features || jsonb_build_object(
        'documents_my_docs', false,
        'documents_templates_per_month', 0,
        'documents_edit_layout', false
      );
    END IF;

    -- Reports: if member has no financial read, disable reports
    IF NOT COALESCE((v_member_permissions->'financial'->>'read')::boolean, false) THEN
      v_features := v_features || jsonb_build_object(
        'reports_overview', false,
        'reports_weekly', false,
        'reports_monthly', false
      );
    END IF;

    -- Assets module
    IF NOT COALESCE((v_member_permissions->'assets'->>'read')::boolean, false) THEN
      v_features := v_features || jsonb_build_object(
        'asset_management', false
      );
    END IF;

    -- CRM module
    IF NOT COALESCE((v_member_permissions->'crm'->>'read')::boolean, false) THEN
      v_features := v_features || jsonb_build_object(
        'crm_basic', false,
        'crm_full', false,
        'pipeline_create_stages', false
      );
    END IF;

    -- Team management: members never manage teams
    v_features := v_features || jsonb_build_object('team_management', false);
  END IF;

  RETURN jsonb_build_object(
    'plan', v_plan_id,
    'is_early_adopter', v_is_early_adopter,
    'features', v_features
  );
END;
$function$;

-- PART 2: Update get_user_trial_status to skip members
CREATE OR REPLACE FUNCTION public.get_user_trial_status(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_effective_id UUID;
  v_is_member BOOLEAN := false;
BEGIN
  v_effective_id := get_effective_broker_id(p_user_id);
  
  -- If the user is a member (not the owner), return no trial
  IF v_effective_id != p_user_id THEN
    RETURN jsonb_build_object(
      'plan_id', 'member',
      'trial_ends_at', NULL,
      'is_trial_active', false,
      'trial_days_remaining', 0
    );
  END IF;
  
  RETURN (
    SELECT jsonb_build_object(
      'plan_id', s.plan_id,
      'trial_ends_at', s.trial_ends_at,
      'is_trial_active', (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now()),
      'trial_days_remaining', GREATEST(0, EXTRACT(DAY FROM (s.trial_ends_at - now()))::int)
    )
    FROM public.subscriptions s
    WHERE s.user_id = v_effective_id
    LIMIT 1
  );
END;
$function$;
