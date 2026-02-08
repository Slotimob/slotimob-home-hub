-- Remove plain text credential columns now that encrypted versions are in use
-- and edge functions handle all credential operations

-- Remove plain text columns from portal_connections
ALTER TABLE public.portal_connections 
DROP COLUMN IF EXISTS api_key,
DROP COLUMN IF EXISTS credentials;

-- Remove plain text columns from integrations
ALTER TABLE public.integrations 
DROP COLUMN IF EXISTS api_key,
DROP COLUMN IF EXISTS config;

-- Remove plain text API key column from whatsapp_connections
-- (keeping webhook_secret as it's not sensitive - it's used for verification, not authentication)
ALTER TABLE public.whatsapp_connections 
DROP COLUMN IF EXISTS evolution_api_key;