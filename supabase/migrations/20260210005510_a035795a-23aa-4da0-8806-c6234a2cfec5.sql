
-- Step 1: Deactivate old plans
UPDATE subscription_plans SET is_active = false WHERE id IN ('free', 'ouro', 'diamante');

-- Step 2: Insert new plans (upsert to handle conflicts)
INSERT INTO subscription_plans (id, name, description, price_original, price_anchor, price_early_adopter, early_adopter_limit, is_active, features)
VALUES 
  ('essencial', 'Essencial', 'Para começar a organizar seus imóveis', 39.90, 39.90, 19.90, 50, true, 
   '{"assets_limit": 10, "users_limit": 1, "contacts_limit": -1, "asset_health_tracking_limit": 0, "crm_basic": true, "crm_full": false, "finance_simple": true, "finance_full": true, "finance_dre": false, "finance_categories_edit": false, "reports_overview": false, "reports_weekly": false, "reports_monthly": false, "reports_period_limit_months": 0, "documents_my_docs": false, "documents_templates_per_month": 0, "documents_edit_layout": false, "pipeline_create_stages": false, "integrations": [], "portals_limit": 0, "team_management": false, "ai_chat": false, "asset_management": false}'::jsonb),
  
  ('pro', 'Pro', 'Para corretores que querem crescer', 147.00, 97.00, 79.00, 50, true,
   '{"assets_limit": 50, "users_limit": 1, "contacts_limit": -1, "asset_health_tracking_limit": -1, "crm_basic": true, "crm_full": true, "finance_simple": true, "finance_full": true, "finance_dre": true, "finance_categories_edit": true, "reports_overview": true, "reports_weekly": true, "reports_monthly": true, "reports_period_limit_months": -1, "documents_my_docs": true, "documents_templates_per_month": -1, "documents_edit_layout": true, "pipeline_create_stages": true, "integrations": ["google_calendar", "signature_services", "whatsapp", "all_portals"], "portals_limit": -1, "team_management": false, "ai_chat": true, "asset_management": true}'::jsonb),
  
  ('business', 'Business', 'Para imobiliárias e equipes', 297.00, 197.00, 179.00, 50, true,
   '{"assets_limit": 80, "users_limit": 3, "contacts_limit": -1, "asset_health_tracking_limit": -1, "crm_basic": true, "crm_full": true, "finance_simple": true, "finance_full": true, "finance_dre": true, "finance_categories_edit": true, "reports_overview": true, "reports_weekly": true, "reports_monthly": true, "reports_period_limit_months": -1, "documents_my_docs": true, "documents_templates_per_month": -1, "documents_edit_layout": true, "pipeline_create_stages": true, "integrations": ["google_calendar", "signature_services", "whatsapp", "all_portals"], "portals_limit": -1, "team_management": true, "ai_chat": true, "asset_management": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_original = EXCLUDED.price_original,
  price_anchor = EXCLUDED.price_anchor,
  price_early_adopter = EXCLUDED.price_early_adopter,
  early_adopter_limit = EXCLUDED.early_adopter_limit,
  is_active = EXCLUDED.is_active,
  features = EXCLUDED.features;

-- Step 3: Add annual pricing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_annual') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_annual numeric(10,2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_plans' AND column_name = 'price_annual_early_adopter') THEN
    ALTER TABLE subscription_plans ADD COLUMN price_annual_early_adopter numeric(10,2) DEFAULT NULL;
  END IF;
END $$;

-- Step 4: Set annual prices
UPDATE subscription_plans SET price_annual = 29.90, price_annual_early_adopter = 19.90 WHERE id = 'essencial';
UPDATE subscription_plans SET price_annual = 97.00, price_annual_early_adopter = 79.00 WHERE id = 'pro';
UPDATE subscription_plans SET price_annual = 197.00, price_annual_early_adopter = 179.00 WHERE id = 'business';

-- Step 5: Create add-ons table
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  addon_type text NOT NULL, -- 'units' or 'users'
  quantity_per_addon integer NOT NULL DEFAULT 1,
  applicable_plans text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active addons" ON public.subscription_addons
  FOR SELECT USING (is_active = true);

-- Insert add-on definitions
INSERT INTO subscription_addons (id, name, description, price, addon_type, quantity_per_addon, applicable_plans)
VALUES 
  ('extra-units-50', '+50 Unidades', 'Adicione 50 unidades extras ao seu plano', 29.90, 'units', 50, ARRAY['essencial', 'pro', 'business']),
  ('extra-user', '+1 Usuário', 'Adicione um usuário adicional ao plano Business', 19.90, 'users', 1, ARRAY['business'])
ON CONFLICT (id) DO NOTHING;
