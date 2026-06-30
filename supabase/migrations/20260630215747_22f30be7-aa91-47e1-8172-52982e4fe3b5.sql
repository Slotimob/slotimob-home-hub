CREATE OR REPLACE FUNCTION public.get_cockpit_organizations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'roles', (SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb) FROM user_roles ur WHERE ur.user_id = p.id),
      'is_staff', EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = p.id)
    ) as org
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.id
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$