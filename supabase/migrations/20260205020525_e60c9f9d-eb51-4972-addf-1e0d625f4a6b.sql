-- Add guarantee and payment fields to leases table
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS guarantee_type text DEFAULT 'caucao',
ADD COLUMN IF NOT EXISTS guarantor_data jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS payment_info jsonb DEFAULT null;

-- Add comment for documentation
COMMENT ON COLUMN public.leases.guarantee_type IS 'Type of guarantee: fiador, caucao, seguro_fianca, none';
COMMENT ON COLUMN public.leases.guarantor_data IS 'JSON data for guarantor including spouse info and property details if applicable';
COMMENT ON COLUMN public.leases.payment_info IS 'JSON data for payment info (PIX, bank account, etc.)';