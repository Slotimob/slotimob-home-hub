-- Add new columns for DRE support
ALTER TABLE public.financial_categories 
ADD COLUMN IF NOT EXISTS category_group text,
ADD COLUMN IF NOT EXISTS dre_type text;

-- Add comments for documentation
COMMENT ON COLUMN public.financial_categories.category_group IS 'Grouping for charts: Operacional, Serviços, Parcerias, Financeiro, Marketing, etc.';
COMMENT ON COLUMN public.financial_categories.dre_type IS 'DRE classification: gross_revenue, financial_revenue, variable_cost, tax_deduction, sales_expense, admin_expense, financial_expense, profit_distribution';