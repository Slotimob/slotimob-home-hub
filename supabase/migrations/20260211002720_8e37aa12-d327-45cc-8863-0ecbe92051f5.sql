
-- Create admin actions audit log table
CREATE TABLE IF NOT EXISTS public.admin_actions_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions_logs ENABLE ROW LEVEL SECURITY;

-- is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$;

-- RLS policies
CREATE POLICY "Super admins can view admin logs"
ON public.admin_actions_logs FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin logs"
ON public.admin_actions_logs FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Cockpit data function
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
      )
    ) as org
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Admin action: add manual credits
CREATE OR REPLACE FUNCTION public.admin_add_credits(
  p_target_user_id uuid,
  p_credit_type text,
  p_amount integer,
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
    jsonb_build_object('credit_type', p_credit_type, 'amount', p_amount),
    p_reason
  );
END;
$$;

-- Admin action: adjust limits
CREATE OR REPLACE FUNCTION public.admin_adjust_limits(
  p_target_user_id uuid,
  p_extra_users integer,
  p_extra_unit_packs integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_users integer;
  v_old_units integer;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(extra_users_count, 0), COALESCE(extra_unit_packs, 0)
  INTO v_old_users, v_old_units
  FROM subscriptions WHERE user_id = p_target_user_id;

  UPDATE subscriptions
  SET extra_users_count = p_extra_users,
      extra_unit_packs = p_extra_unit_packs,
      updated_at = now()
  WHERE user_id = p_target_user_id;

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, details, reason)
  VALUES (auth.uid(), p_target_user_id, 'adjust_limits',
    jsonb_build_object(
      'old_extra_users', v_old_users, 'new_extra_users', p_extra_users,
      'old_extra_unit_packs', v_old_units, 'new_extra_unit_packs', p_extra_unit_packs
    ),
    p_reason
  );
END;
$$;
