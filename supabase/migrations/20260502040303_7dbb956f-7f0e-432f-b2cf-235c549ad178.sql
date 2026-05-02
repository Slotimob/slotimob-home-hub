
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS asset_expense_category TEXT
  CHECK (asset_expense_category IS NULL OR asset_expense_category IN (
    'iptu','condo_fee','maintenance','management_fee','utilities',
    'insurance','property_tax','repairs','renovation','marketing',
    'cleaning','security','legal_fees','vacancy_costs','other'
  ));

CREATE INDEX IF NOT EXISTS idx_fin_trans_asset_category
  ON public.financial_transactions(asset_expense_category)
  WHERE asset_expense_category IS NOT NULL;

COMMENT ON COLUMN public.financial_transactions.asset_expense_category IS
  'Categoria canônica de despesas operacionais de imóvel. Usada em relatórios patrimoniais. Independente de financial_categories.';
