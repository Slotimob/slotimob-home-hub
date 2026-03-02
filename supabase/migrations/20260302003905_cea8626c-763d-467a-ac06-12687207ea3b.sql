
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
  -- Get subscription data including status
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

  -- Override limit based on subscription status:
  -- PRO paid (active) = 250 credits, Trial = 50 credits, Free = 0
  IF v_plan_id IN ('pro', 'business') THEN
    IF v_status = 'active' THEN
      v_limit := 250;
    ELSIF v_status = 'trialing' THEN
      v_limit := 50;
    ELSE
      v_limit := 0;
    END IF;
  ELSIF v_plan_id = 'essencial' THEN
    IF v_status = 'active' THEN
      v_limit := 100;
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
