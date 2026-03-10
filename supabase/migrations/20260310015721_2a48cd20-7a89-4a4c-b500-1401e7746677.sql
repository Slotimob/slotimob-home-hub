
-- Make INSERT policies more flexible: allow broker_id to be either the user's own ID
-- or their organization owner's ID. This supports the transition period.

-- Helper function to check if a user can write as a given broker_id
CREATE OR REPLACE FUNCTION public.can_write_as_broker(p_user_id uuid, p_broker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p_user_id = p_broker_id
    OR EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = p_user_id
        AND organization_owner_id = p_broker_id
        AND is_active = true
    );
$$;

-- Update INSERT policies to use flexible check
DROP POLICY IF EXISTS "Workspace can insert properties" ON properties;
CREATE POLICY "Workspace can insert properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert units" ON units;
CREATE POLICY "Workspace can insert units" ON units FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert contacts" ON contacts;
CREATE POLICY "Workspace can insert contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert deals" ON deals;
CREATE POLICY "Workspace can insert deals" ON deals FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert leads" ON leads;
CREATE POLICY "Workspace can insert leads" ON leads FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert transactions" ON financial_transactions;
CREATE POLICY "Workspace can insert transactions" ON financial_transactions FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert leases" ON leases;
CREATE POLICY "Workspace can insert leases" ON leases FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert deal activities" ON deal_activities;
CREATE POLICY "Workspace can insert deal activities" ON deal_activities FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert deal tasks" ON deal_tasks;
CREATE POLICY "Workspace can insert deal tasks" ON deal_tasks FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert deal stage history" ON deal_stage_history;
CREATE POLICY "Workspace can insert deal stage history" ON deal_stage_history FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert bank accounts" ON bank_accounts;
CREATE POLICY "Workspace can insert bank accounts" ON bank_accounts FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert categories" ON financial_categories;
CREATE POLICY "Workspace can insert categories" ON financial_categories FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert documents" ON documents;
CREATE POLICY "Workspace can insert documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert generated documents" ON generated_documents;
CREATE POLICY "Workspace can insert generated documents" ON generated_documents FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert adjustments" ON lease_adjustments;
CREATE POLICY "Workspace can insert adjustments" ON lease_adjustments FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Workspace can insert sales" ON sales;
CREATE POLICY "Workspace can insert sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

-- Also update get_user_plan_features to support workspace inheritance
-- Members should get their owner's plan features
CREATE OR REPLACE FUNCTION public.get_user_plan_features(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_effective_id UUID;
  v_plan_id TEXT;
  v_features JSONB;
  v_is_early_adopter BOOLEAN;
BEGIN
  -- Get effective broker (owner) ID
  v_effective_id := get_effective_broker_id(p_user_id);

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

  RETURN jsonb_build_object(
    'plan', v_plan_id,
    'is_early_adopter', v_is_early_adopter,
    'features', v_features
  );
END;
$$;

-- Also update get_user_trial_status to check the effective owner
CREATE OR REPLACE FUNCTION public.get_user_trial_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_effective_id UUID;
BEGIN
  v_effective_id := get_effective_broker_id(p_user_id);
  
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
$$;
