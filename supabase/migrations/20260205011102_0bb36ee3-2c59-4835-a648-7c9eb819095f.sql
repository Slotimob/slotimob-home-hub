-- Add new columns to leases table for contract lifecycle management
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS signature_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS signed_contract_path text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS termination_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS termination_reason text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.leases.signature_status IS 'Contract signature status: pending or signed';
COMMENT ON COLUMN public.leases.signed_contract_path IS 'Path to uploaded signed contract PDF in storage';
COMMENT ON COLUMN public.leases.termination_date IS 'Date when contract was terminated';
COMMENT ON COLUMN public.leases.termination_reason IS 'Reason for contract termination';