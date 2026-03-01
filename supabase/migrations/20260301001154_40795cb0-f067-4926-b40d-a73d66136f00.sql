
INSERT INTO subscription_plans (id, name, description, is_active, price_original, price_anchor, price_early_adopter, early_adopter_limit, features)
VALUES (
  'start',
  'Plano Start',
  'Comece grátis e teste o PRO por 14 dias',
  true,
  0.00,
  0.00,
  0.00,
  NULL,
  '{
    "assets_limit": 5,
    "users_limit": 1,
    "contacts_limit": -1,
    "asset_health_tracking_limit": 0,
    "whatsapp_instances_limit": 0,
    "crm_basic": true,
    "crm_full": false,
    "finance_simple": true,
    "finance_full": false,
    "finance_dre": false,
    "finance_categories_edit": false,
    "reports_overview": false,
    "reports_weekly": false,
    "reports_monthly": false,
    "reports_period_limit_months": 0,
    "documents_my_docs": false,
    "documents_templates_per_month": 0,
    "documents_edit_layout": false,
    "pipeline_create_stages": false,
    "integrations": [],
    "portals_limit": 0,
    "team_management": false,
    "ai_chat": false,
    "asset_management": false
  }'::jsonb
);
