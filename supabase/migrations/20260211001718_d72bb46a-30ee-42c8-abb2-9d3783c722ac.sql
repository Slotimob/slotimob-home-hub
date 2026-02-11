
-- Add add-on tracking columns to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS extra_users_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_unit_packs integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_addon_users_item_id text,
ADD COLUMN IF NOT EXISTS stripe_addon_units_item_id text;

-- Add pack_type to whatsapp_message_credits to distinguish whatsapp vs ai credits
ALTER TABLE public.whatsapp_message_credits 
ADD COLUMN IF NOT EXISTS credit_type text NOT NULL DEFAULT 'whatsapp';

-- Create ai_credits table for AI credit purchases
CREATE TABLE IF NOT EXISTS public.ai_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES public.profiles(id),
  credits_purchased integer NOT NULL,
  credits_remaining integer NOT NULL,
  price_paid numeric NOT NULL,
  stripe_payment_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI credits"
ON public.ai_credits FOR SELECT
USING (broker_id = auth.uid());

CREATE POLICY "Service role can manage AI credits"
ON public.ai_credits FOR ALL
USING (true)
WITH CHECK (true);

-- Update the get_user_plan_features function to include add-on limits
CREATE OR REPLACE FUNCTION public.get_effective_limits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_sub record;
  v_plan_features jsonb;
  v_base_assets integer;
  v_base_users integer;
BEGIN
  SELECT s.*, sp.features
  INTO v_sub
  FROM subscriptions s
  LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = p_user_id
  AND s.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'assets_limit', 2,
      'users_limit', 1,
      'extra_users', 0,
      'extra_unit_packs', 0
    );
  END IF;

  v_plan_features := COALESCE(v_sub.features, '{}'::jsonb);
  v_base_assets := COALESCE((v_plan_features->>'assets_limit')::integer, 2);
  v_base_users := COALESCE((v_plan_features->>'users_limit')::integer, 1);

  RETURN jsonb_build_object(
    'plan_id', v_sub.plan_id,
    'assets_limit', v_base_assets + (COALESCE(v_sub.extra_unit_packs, 0) * 50),
    'users_limit', v_base_users + COALESCE(v_sub.extra_users_count, 0),
    'base_assets', v_base_assets,
    'base_users', v_base_users,
    'extra_users', COALESCE(v_sub.extra_users_count, 0),
    'extra_unit_packs', COALESCE(v_sub.extra_unit_packs, 0),
    'is_early_adopter', v_sub.is_early_adopter,
    'stripe_customer_id', v_sub.stripe_customer_id
  );
END;
$$;
