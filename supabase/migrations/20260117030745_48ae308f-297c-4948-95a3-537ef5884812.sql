-- Add webhook_secret column for signature verification
ALTER TABLE public.whatsapp_connections 
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Generate unique secret for existing connections
UPDATE public.whatsapp_connections 
SET webhook_secret = encode(gen_random_bytes(32), 'hex')
WHERE webhook_secret IS NULL;