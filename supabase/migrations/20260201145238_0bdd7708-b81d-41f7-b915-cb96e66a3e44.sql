-- Add assigned_user_id column for multi-tenancy support
-- This represents the individual user responsible for this contact
-- broker_id = Organization (Master), assigned_user_id = Individual User
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id);

-- Set default: assigned_user_id = broker_id for existing records
UPDATE public.contacts SET assigned_user_id = broker_id WHERE assigned_user_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_user_id ON public.contacts(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_categories ON public.contacts USING GIN(categories);

-- Add assigned_user_id to units table
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id);

UPDATE public.units SET assigned_user_id = broker_id WHERE assigned_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_units_assigned_user_id ON public.units(assigned_user_id);

-- Add assigned_user_id to deals table
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id);

UPDATE public.deals SET assigned_user_id = broker_id WHERE assigned_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_deals_assigned_user_id ON public.deals(assigned_user_id);

-- Add assigned_user_id to financial_transactions table
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id);

UPDATE public.financial_transactions SET assigned_user_id = broker_id WHERE assigned_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_assigned_user_id ON public.financial_transactions(assigned_user_id);

-- Add assigned_user_id to bank_accounts table
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id);

UPDATE public.bank_accounts SET assigned_user_id = broker_id WHERE assigned_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_assigned_user_id ON public.bank_accounts(assigned_user_id);

-- Comment on the new columns for documentation
COMMENT ON COLUMN public.contacts.assigned_user_id IS 'Individual user responsible for this contact. broker_id is the organization, assigned_user_id is the individual collaborator.';
COMMENT ON COLUMN public.units.assigned_user_id IS 'Individual user responsible for this unit.';
COMMENT ON COLUMN public.deals.assigned_user_id IS 'Individual user responsible for this deal.';
COMMENT ON COLUMN public.financial_transactions.assigned_user_id IS 'Individual user who created/manages this transaction.';
COMMENT ON COLUMN public.bank_accounts.assigned_user_id IS 'Individual user who created/manages this bank account.';