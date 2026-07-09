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
  -- Allow: self, super_admin, or any workspace member of p_user_id.
  -- AI credits are workspace-shared (billed to the owner/broker), so
  -- guests (organization members) must be able to read the owner's balance.
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_super_admin(auth.uid())
     AND NOT public.can_write_as_broker(auth.uid(), p_user_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

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

  IF v_plan_id = 'business' THEN
    IF v_status = 'active' THEN v_limit := 750;
    ELSIF v_status = 'trialing' THEN v_limit := 50;
    ELSE v_limit := 0;
    END IF;
  ELSIF v_plan_id = 'pro' THEN
    IF v_status = 'active' THEN v_limit := 250;
    ELSIF v_status = 'trialing' THEN v_limit := 50;
    ELSE v_limit := 0;
    END IF;
  ELSIF v_plan_id = 'essencial' THEN
    IF v_status = 'active' THEN v_limit := 50;
    ELSIF v_status = 'trialing' THEN v_limit := 50;
    ELSE v_limit := 0;
    END IF;
  ELSE
    v_limit := 0;
  END IF;

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