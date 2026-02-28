
-- Add whatsapp_instances_limit to all subscription plans
UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 0}'::jsonb
WHERE id = 'free' AND NOT (features ? 'whatsapp_instances_limit');

UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 0}'::jsonb
WHERE id = 'essencial' AND NOT (features ? 'whatsapp_instances_limit');

UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 1}'::jsonb
WHERE id = 'pro' AND NOT (features ? 'whatsapp_instances_limit');

UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 3}'::jsonb
WHERE id = 'business' AND NOT (features ? 'whatsapp_instances_limit');

UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 5}'::jsonb
WHERE id = 'ouro' AND NOT (features ? 'whatsapp_instances_limit');

UPDATE public.subscription_plans
SET features = features || '{"whatsapp_instances_limit": 10}'::jsonb
WHERE id = 'diamante' AND NOT (features ? 'whatsapp_instances_limit');
