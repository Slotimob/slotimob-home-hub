-- Add columns for OFX balance extraction
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS last_reconciled_balance numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_reconciled_date date DEFAULT NULL;