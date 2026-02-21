
-- Add Meta Cloud API columns to whatsapp_connections
ALTER TABLE public.whatsapp_connections 
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS api_provider text NOT NULL DEFAULT 'meta',
  ALTER COLUMN instance_name DROP NOT NULL,
  ALTER COLUMN evolution_api_url DROP NOT NULL;

-- Make evolution columns nullable since Meta connections won't use them
COMMENT ON COLUMN public.whatsapp_connections.api_provider IS 'meta or evolution';
COMMENT ON COLUMN public.whatsapp_connections.phone_number_id IS 'Meta WhatsApp Phone Number ID';
COMMENT ON COLUMN public.whatsapp_connections.waba_id IS 'Meta WhatsApp Business Account ID';

-- Add contact_id to whatsapp_conversations for CRM linking  
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id);
