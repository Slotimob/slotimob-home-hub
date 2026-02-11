
-- 1. Create table for support debug sessions
CREATE TABLE public.support_debug_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_by uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  notes text
);

ALTER TABLE public.support_debug_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage debug sessions"
ON public.support_debug_sessions
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'support')
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'support')
);

-- 2. admin_change_role: ONLY super_admin
CREATE OR REPLACE FUNCTION public.admin_change_role(p_target_user_id uuid, p_role text, p_action text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super_admin can manage roles';
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

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (auth.uid(), p_target_user_id, 'change_role', p_reason,
    jsonb_build_object('role', p_role, 'action', p_action));
END;
$$;

-- 3. admin_add_credits: admin OR super_admin
CREATE OR REPLACE FUNCTION public.admin_add_credits(p_target_user_id uuid, p_credit_type text, p_amount integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_credit_type = 'whatsapp' THEN
    INSERT INTO whatsapp_message_credits (broker_id, credits_purchased, credits_remaining, price_paid, credit_type)
    VALUES (p_target_user_id, p_amount, p_amount, 0, 'whatsapp');
  ELSIF p_credit_type = 'ai' THEN
    INSERT INTO ai_credits (broker_id, credits_purchased, credits_remaining, price_paid)
    VALUES (p_target_user_id, p_amount, p_amount, 0);
  ELSE
    RAISE EXCEPTION 'Invalid credit type';
  END IF;

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, details, reason)
  VALUES (auth.uid(), p_target_user_id, 'add_credits',
    jsonb_build_object('credit_type', p_credit_type, 'amount', p_amount), p_reason);
END;
$$;

-- 4. admin_adjust_limits: admin OR super_admin
CREATE OR REPLACE FUNCTION public.admin_adjust_limits(p_target_user_id uuid, p_extra_users integer, p_extra_unit_packs integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_users integer;
  v_old_units integer;
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(extra_users_count, 0), COALESCE(extra_unit_packs, 0)
  INTO v_old_users, v_old_units
  FROM subscriptions WHERE user_id = p_target_user_id;

  UPDATE subscriptions
  SET extra_users_count = p_extra_users, extra_unit_packs = p_extra_unit_packs, updated_at = now()
  WHERE user_id = p_target_user_id;

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, details, reason)
  VALUES (auth.uid(), p_target_user_id, 'adjust_limits',
    jsonb_build_object('old_extra_users', v_old_users, 'new_extra_users', p_extra_users,
      'old_extra_unit_packs', v_old_units, 'new_extra_unit_packs', p_extra_unit_packs), p_reason);
END;
$$;

-- 5. admin_change_plan: admin OR super_admin
CREATE OR REPLACE FUNCTION public.admin_change_plan(p_target_user_id uuid, p_new_plan_id text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (p_target_user_id, p_new_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET plan_id = p_new_plan_id, status = 'active', updated_at = now();

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (auth.uid(), p_target_user_id, 'change_plan', p_reason,
    jsonb_build_object('new_plan', p_new_plan_id));
END;
$$;

-- 6. get_cockpit_organizations: admin + support + super_admin
CREATE OR REPLACE FUNCTION public.get_cockpit_organizations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_agg(org ORDER BY org->>'created_at' DESC)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.id, 'full_name', p.full_name, 'email', p.email,
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
      'whatsapp_credits', (SELECT COALESCE(SUM(credits_remaining), 0) FROM whatsapp_message_credits wc WHERE wc.broker_id = p.id AND wc.credits_remaining > 0 AND (wc.expires_at IS NULL OR wc.expires_at > now())),
      'whatsapp_sent_month', (SELECT COALESCE(total_messages_sent, 0) FROM whatsapp_usage_stats wus WHERE wus.broker_id = p.id AND wus.period_start = date_trunc('month', current_date)::date),
      'ai_credits', (SELECT COALESCE(SUM(credits_remaining), 0) FROM ai_credits ac WHERE ac.broker_id = p.id AND ac.credits_remaining > 0 AND (ac.expires_at IS NULL OR ac.expires_at > now())),
      'roles', (SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb) FROM user_roles ur WHERE ur.user_id = p.id)
    ) as org
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. RPC: get user audit logs (support/admin/super_admin)
CREATE OR REPLACE FUNCTION public.get_user_audit_logs(p_target_user_id uuid, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(logs)::jsonb), '[]'::jsonb)
    FROM (
      SELECT id, action, table_name, record_id, old_data, new_data, metadata, created_at
      FROM audit_logs
      WHERE broker_id = p_target_user_id
      ORDER BY created_at DESC
      LIMIT p_limit
    ) logs
  );
END;
$$;

-- 8. RPC: get user support info (search by email/name)
CREATE OR REPLACE FUNCTION public.get_user_support_info(p_search text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(u)::jsonb), '[]'::jsonb)
    FROM (
      SELECT 
        p.id as user_id, p.full_name, p.email, p.created_at,
        p.updated_at as last_activity,
        COALESCE(s.plan_id, 'free') as plan_id,
        COALESCE(s.status, 'none') as subscription_status,
        s.trial_ends_at, s.current_period_end,
        (SELECT count(*) FROM units WHERE broker_id = p.id) as units_count,
        (SELECT count(*) FROM contacts WHERE broker_id = p.id) as contacts_count,
        (SELECT count(*) FROM deals WHERE broker_id = p.id) as deals_count,
        (SELECT count(*) FROM financial_transactions WHERE broker_id = p.id) as transactions_count,
        (SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb) FROM user_roles ur WHERE ur.user_id = p.id) as roles
      FROM profiles p
      LEFT JOIN subscriptions s ON s.user_id = p.id
      WHERE p.email ILIKE '%' || p_search || '%'
         OR p.full_name ILIKE '%' || p_search || '%'
      LIMIT 10
    ) u
  );
END;
$$;
