
-- 1. WhatsApp Usage Stats - monthly tracking per broker
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.profiles(id),
  period_start date NOT NULL, -- always 1st of month
  period_end date NOT NULL, -- last day of month
  service_conversations integer NOT NULL DEFAULT 0,
  total_messages_sent integer NOT NULL DEFAULT 0,
  total_messages_received integer NOT NULL DEFAULT 0,
  billing_events integer NOT NULL DEFAULT 0, -- new 24h windows opened
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(broker_id, period_start)
);

ALTER TABLE public.whatsapp_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage stats" ON public.whatsapp_usage_stats
  FOR SELECT USING (broker_id = auth.uid());

CREATE POLICY "System can manage usage stats" ON public.whatsapp_usage_stats
  FOR ALL USING (broker_id = auth.uid());

-- 2. WhatsApp Message Credits - pre-paid credit packs
CREATE TABLE IF NOT EXISTS public.whatsapp_message_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.profiles(id),
  credits_purchased integer NOT NULL,
  credits_remaining integer NOT NULL,
  price_paid numeric(10,2) NOT NULL,
  stripe_payment_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- optional expiry
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.whatsapp_message_credits
  FOR SELECT USING (broker_id = auth.uid());

CREATE POLICY "Users can manage own credits" ON public.whatsapp_message_credits
  FOR ALL USING (broker_id = auth.uid());

-- 3. Add conversation assignment columns to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unassigned'; -- unassigned, assigned, resolved

-- 4. Add billing event flag + internal note support to whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS is_billing_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_internal_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES auth.users(id);

-- 5. Add WhatsApp franchise config to subscription_plans features
-- Update plans with whatsapp_conversations_included
UPDATE public.subscription_plans 
SET features = features || '{"whatsapp_conversations_included": 500}'::jsonb
WHERE id IN ('pro', 'business') AND NOT (features ? 'whatsapp_conversations_included');

UPDATE public.subscription_plans 
SET features = features || '{"whatsapp_conversations_included": 0}'::jsonb
WHERE id = 'essencial' AND NOT (features ? 'whatsapp_conversations_included');

-- 6. Credit pack products table
CREATE TABLE IF NOT EXISTS public.whatsapp_credit_packs (
  id text PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price numeric(10,2) NOT NULL,
  stripe_price_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs" ON public.whatsapp_credit_packs
  FOR SELECT USING (is_active = true);

-- Insert default credit packs
INSERT INTO public.whatsapp_credit_packs (id, name, credits, price)
VALUES 
  ('pack-500', '500 Créditos', 500, 49.00),
  ('pack-1000', '1.000 Créditos', 1000, 89.00),
  ('pack-2500', '2.500 Créditos', 2500, 199.00)
ON CONFLICT (id) DO NOTHING;

-- 7. Function to get current month usage
CREATE OR REPLACE FUNCTION public.get_whatsapp_monthly_usage(p_broker_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_period_start date;
  v_usage record;
  v_credits_remaining integer;
  v_franchise integer;
  v_plan_id text;
BEGIN
  v_period_start := date_trunc('month', current_date)::date;
  
  -- Get current usage
  SELECT * INTO v_usage FROM whatsapp_usage_stats
  WHERE broker_id = p_broker_id AND period_start = v_period_start;
  
  -- Get available credits
  SELECT COALESCE(SUM(credits_remaining), 0) INTO v_credits_remaining
  FROM whatsapp_message_credits
  WHERE broker_id = p_broker_id AND credits_remaining > 0
  AND (expires_at IS NULL OR expires_at > now());
  
  -- Get plan franchise
  SELECT COALESCE(s.plan_id, 'essencial') INTO v_plan_id
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = p_broker_id;
  
  SELECT COALESCE((features->>'whatsapp_conversations_included')::integer, 0) INTO v_franchise
  FROM subscription_plans WHERE id = COALESCE(v_plan_id, 'essencial');
  
  RETURN jsonb_build_object(
    'service_conversations', COALESCE(v_usage.service_conversations, 0),
    'billing_events', COALESCE(v_usage.billing_events, 0),
    'total_sent', COALESCE(v_usage.total_messages_sent, 0),
    'total_received', COALESCE(v_usage.total_messages_received, 0),
    'credits_remaining', v_credits_remaining,
    'franchise_limit', v_franchise,
    'meta_free_tier', 1000,
    'period_start', v_period_start,
    'plan', v_plan_id,
    'can_send', (COALESCE(v_usage.service_conversations, 0) < 1000 OR v_credits_remaining > 0)
  );
END;
$$;
