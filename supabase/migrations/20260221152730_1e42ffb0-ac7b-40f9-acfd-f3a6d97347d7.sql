
-- Add Evolution API columns to whatsapp_connections
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS instance_name text,
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS qr_code_base64 text;

-- Make Meta-specific columns optional
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN waba_id DROP NOT NULL;

-- Add unique constraint on instance_name (partial, non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_instance_name
  ON public.whatsapp_connections (instance_name)
  WHERE instance_name IS NOT NULL;

-- Update api_provider default to 'evolution'
ALTER TABLE public.whatsapp_connections
  ALTER COLUMN api_provider SET DEFAULT 'evolution';
