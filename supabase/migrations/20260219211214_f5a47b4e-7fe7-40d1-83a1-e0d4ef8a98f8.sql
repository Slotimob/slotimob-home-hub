-- Add AI credits tracking columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ai_credits_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_credits_used integer NOT NULL DEFAULT 0;

-- Set default limits based on existing plans
-- Pro = 250, Business = 750, others = 0
UPDATE public.subscriptions
SET ai_credits_limit = CASE
  WHEN plan_id = 'pro' THEN 250
  WHEN plan_id = 'business' THEN 750
  ELSE 0
END
WHERE ai_credits_limit = 0;

-- Create a function to reset AI credits monthly (called by cron or webhook)
CREATE OR REPLACE FUNCTION public.reset_ai_credits_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE subscriptions
  SET ai_credits_used = 0, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Create a function to get AI credits balance
CREATE OR REPLACE FUNCTION public.get_ai_credits_balance(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit integer;
  v_used integer;
  v_bonus integer;
  v_plan_id text;
BEGIN
  -- Get subscription data
  SELECT s.ai_credits_limit, s.ai_credits_used, COALESCE(s.plan_id, 'free')
  INTO v_limit, v_used, v_plan_id
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;

  IF v_limit IS NULL THEN
    v_limit := 0;
    v_used := 0;
    v_plan_id := 'free';
  END IF;

  -- Get bonus credits from ai_credits table (purchased credits that don't expire)
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_bonus
  FROM ai_credits
  WHERE broker_id = p_user_id
    AND credits_remaining > 0
    AND (expires_at IS NULL OR expires_at > now());

  RETURN jsonb_build_object(
    'plan_id', v_plan_id,
    'limit', v_limit,
    'used', v_used,
    'remaining', GREATEST(0, v_limit - v_used),
    'bonus_credits', v_bonus,
    'total_available', GREATEST(0, v_limit - v_used) + v_bonus
  );
END;
$$;