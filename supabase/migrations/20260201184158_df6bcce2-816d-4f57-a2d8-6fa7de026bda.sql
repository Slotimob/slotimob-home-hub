-- Add initial_balance column to bank_accounts for progressive balance calculation
-- This is an immutable anchor value set once during account creation

ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS initial_balance numeric DEFAULT 0;

-- Copy existing balance values to initial_balance for existing accounts
UPDATE public.bank_accounts 
SET initial_balance = COALESCE(balance, 0) 
WHERE initial_balance IS NULL OR initial_balance = 0;

-- Add comment for documentation
COMMENT ON COLUMN public.bank_accounts.initial_balance IS 'Immutable opening balance set once at account creation. Used as anchor for progressive balance calculations.';