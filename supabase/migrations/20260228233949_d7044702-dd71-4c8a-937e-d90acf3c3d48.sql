-- Update the signup trigger to create a Pro trial instead of Free
CREATE OR REPLACE FUNCTION public.create_free_subscription_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
  VALUES (
    NEW.id,
    'pro',
    'trialing',
    now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;