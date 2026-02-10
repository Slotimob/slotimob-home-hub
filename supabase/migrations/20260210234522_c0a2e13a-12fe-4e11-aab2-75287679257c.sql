
-- Add Stripe price ID columns to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_early_adopter text;

-- Update with real Stripe price IDs
UPDATE public.subscription_plans SET
  stripe_price_id_monthly = 'price_1Sz5W3AUMiQcSICy1r1dlICp',
  stripe_price_id_yearly = 'price_1Sz5WhAUMiQcSICy93DsxlVA',
  stripe_price_id_early_adopter = 'price_1Sz5XEAUMiQcSICyOyoufgss'
WHERE id = 'essencial';

UPDATE public.subscription_plans SET
  stripe_price_id_monthly = 'price_1Sz5UWAUMiQcSICy9Xb0mN8e',
  stripe_price_id_yearly = 'price_1Sz5UmAUMiQcSICyXW386rK0',
  stripe_price_id_early_adopter = 'price_1Sz5VKAUMiQcSICy4Hrx2DrC'
WHERE id = 'pro';

UPDATE public.subscription_plans SET
  stripe_price_id_monthly = 'price_1Sz5SRAUMiQcSICymdrS10i0',
  stripe_price_id_yearly = 'price_1Sz5SuAUMiQcSICyG9jE05vA',
  stripe_price_id_early_adopter = 'price_1Sz5TVAUMiQcSICypLhD92fA'
WHERE id = 'business';
