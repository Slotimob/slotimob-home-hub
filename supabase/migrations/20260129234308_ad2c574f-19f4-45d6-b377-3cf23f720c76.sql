-- Add columns to financial_transactions for obligation linking
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS obligation_type text,
ADD COLUMN IF NOT EXISTS competency_period text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_obligation 
ON public.financial_transactions(unit_id, obligation_type, competency_period);

-- Add comment for documentation
COMMENT ON COLUMN public.financial_transactions.obligation_type IS 'Type of obligation: rent, condominium, iptu, energy, water, gas, insurance, other';
COMMENT ON COLUMN public.financial_transactions.competency_period IS 'Period in YYYY-MM format that this transaction refers to';