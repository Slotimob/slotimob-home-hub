
CREATE OR REPLACE FUNCTION public.get_user_plan_features(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_effective UUID;
  v_effective_id UUID;
  v_plan_id TEXT;
  v_features JSONB;
  v_is_early_adopter BOOLEAN;
  v_is_member BOOLEAN := false;
begin
  -- Allow: self, super_admin, or when caller's effective broker equals target
  -- (i.e. an active member requesting their owner's plan features).
  v_caller_effective := public.get_effective_broker_id(auth.uid());
  if auth.uid() is distinct from p_user_id
     and not public.is_super_admin(auth.uid())
     and v_caller_effective is distinct from p_user_id then
    raise exception 'not authorized';
  end if;

  v_effective_id := public.get_effective_broker_id(p_user_id);

  if v_effective_id != p_user_id then
    v_is_member := true;
  end if;

  select
    case
      when s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at <= now() then 'start'
      else coalesce(s.plan_id, 'free')
    end,
    coalesce(s.is_early_adopter, false)
  into v_plan_id, v_is_early_adopter
  from profiles p
  left join subscriptions s on s.user_id = p.id and s.status in ('active', 'trialing')
  where p.id = v_effective_id;

  if v_plan_id is null then
    v_plan_id := 'free';
    v_is_early_adopter := false;
  end if;

  select features into v_features
  from subscription_plans where id = v_plan_id;

  -- When the caller is a member (not the owner), never expose team_management.
  if (auth.uid() is distinct from p_user_id or v_is_member) and v_features is not null then
    v_features := v_features || jsonb_build_object('team_management', false);
  end if;

  return jsonb_build_object(
    'plan', v_plan_id,
    'is_early_adopter', v_is_early_adopter,
    'features', v_features
  );
end;
$function$;
