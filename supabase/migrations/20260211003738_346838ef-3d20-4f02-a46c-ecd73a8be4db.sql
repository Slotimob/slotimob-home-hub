
-- 1. Add 'agent' to app_role enum so useUserRole works
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';

-- 2. Create RPC to change a user's plan from cockpit
CREATE OR REPLACE FUNCTION public.admin_change_plan(
  p_target_user_id uuid,
  p_new_plan_id text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Upsert subscription
  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (p_target_user_id, p_new_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET plan_id = p_new_plan_id, status = 'active', updated_at = now();

  -- Log
  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (auth.uid(), p_target_user_id, 'change_plan', p_reason,
    jsonb_build_object('new_plan', p_new_plan_id));
END;
$$;

-- 3. Create RPC to change a user's role
CREATE OR REPLACE FUNCTION public.admin_change_role(
  p_target_user_id uuid,
  p_role text,
  p_action text, -- 'grant' or 'revoke'
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_action = 'grant' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (p_target_user_id, p_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_action = 'revoke' THEN
    DELETE FROM user_roles WHERE user_id = p_target_user_id AND role = p_role::app_role;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- Log
  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (auth.uid(), p_target_user_id, 'change_role', p_reason,
    jsonb_build_object('role', p_role, 'action', p_action));
END;
$$;

-- 4. Update get_cockpit_organizations to include roles
CREATE OR REPLACE FUNCTION public.get_cockpit_organizations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_agg(org ORDER BY org->>'created_at' DESC)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'created_at', p.created_at,
      'plan_id', COALESCE(s.plan_id, 'free'),
      'subscription_status', COALESCE(s.status, 'none'),
      'is_early_adopter', COALESCE(s.is_early_adopter, false),
      'extra_users_count', COALESCE(s.extra_users_count, 0),
      'extra_unit_packs', COALESCE(s.extra_unit_packs, 0),
      'stripe_customer_id', s.stripe_customer_id,
      'trial_ends_at', s.trial_ends_at,
      'current_period_end', s.current_period_end,
      'cancel_at_period_end', COALESCE(s.cancel_at_period_end, false),
      'units_count', (SELECT count(*) FROM units u WHERE u.broker_id = p.id),
      'contacts_count', (SELECT count(*) FROM contacts c WHERE c.broker_id = p.id),
      'whatsapp_credits', (
        SELECT COALESCE(SUM(credits_remaining), 0)
        FROM whatsapp_message_credits wc
        WHERE wc.broker_id = p.id AND wc.credits_remaining > 0
        AND (wc.expires_at IS NULL OR wc.expires_at > now())
      ),
      'whatsapp_sent_month', (
        SELECT COALESCE(total_messages_sent, 0)
        FROM whatsapp_usage_stats wus
        WHERE wus.broker_id = p.id
        AND wus.period_start = date_trunc('month', current_date)::date
      ),
      'ai_credits', (
        SELECT COALESCE(SUM(credits_remaining), 0)
        FROM ai_credits ac
        WHERE ac.broker_id = p.id AND ac.credits_remaining > 0
        AND (ac.expires_at IS NULL OR ac.expires_at > now())
      ),
      'roles', (
        SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb)
        FROM user_roles ur
        WHERE ur.user_id = p.id
      )
    ) as org
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 5. Setup the requesting user as Business with super_admin
INSERT INTO subscriptions (user_id, plan_id, status)
VALUES ('b52081c9-b184-4125-bd09-69f90b2b94a3', 'business', 'active')
ON CONFLICT (user_id)
DO UPDATE SET plan_id = 'business', status = 'active', updated_at = now();
