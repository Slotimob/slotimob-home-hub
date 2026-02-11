
-- Add trial_ends_at to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Update the 'free' plan to be active with 2-unit limit and basic features only
UPDATE public.subscription_plans 
SET 
  is_active = true,
  features = jsonb_set(
    features::jsonb,
    '{assets_limit}',
    '2'
  )
WHERE id = 'free';

-- Also ensure ai_chat and asset_management are false on free plan
UPDATE public.subscription_plans 
SET features = features::jsonb || '{"ai_chat": false, "asset_management": false, "users_limit": 1, "whatsapp_conversations_included": 0}'::jsonb
WHERE id = 'free';

-- Create a function to auto-create subscription with trial for new users
CREATE OR REPLACE FUNCTION public.create_free_subscription_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
  VALUES (
    NEW.id,
    'free',
    'active',
    now() + interval '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles (fires after profile creation on signup)
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_subscription_on_signup();

-- Create RPC to get trial status
CREATE OR REPLACE FUNCTION public.get_user_trial_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'plan_id', s.plan_id,
    'trial_ends_at', s.trial_ends_at,
    'is_trial_active', (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now()),
    'trial_days_remaining', GREATEST(0, EXTRACT(DAY FROM (s.trial_ends_at - now()))::int)
  )
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
$$;
