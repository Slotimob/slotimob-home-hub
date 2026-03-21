ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_price_id_annual_early_adopter text;