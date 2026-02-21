-- Add unique constraint on instance_name for ON CONFLICT to work
ALTER TABLE public.whatsapp_connections ADD CONSTRAINT whatsapp_connections_instance_name_key UNIQUE (instance_name);