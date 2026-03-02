-- Update Free plan assets_limit from 2 to 5
UPDATE subscription_plans
SET features = jsonb_set(features, '{assets_limit}', '5')
WHERE id = 'free';
