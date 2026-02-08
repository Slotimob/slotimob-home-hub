-- Part 1: Strengthen RLS policies for leads table
-- Drop existing policies
DROP POLICY IF EXISTS "Brokers can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Brokers can create their own leads" ON public.leads;
DROP POLICY IF EXISTS "Brokers can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Brokers can delete their own leads" ON public.leads;

-- Create stronger RLS policies that explicitly verify auth.uid()
CREATE POLICY "Brokers can view their own leads" 
ON public.leads 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own leads" 
ON public.leads 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own leads" 
ON public.leads 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

-- Part 2: Strengthen RLS policies for owners table
DROP POLICY IF EXISTS "Brokers can view their own owners" ON public.owners;
DROP POLICY IF EXISTS "Brokers can create their own owners" ON public.owners;
DROP POLICY IF EXISTS "Brokers can update their own owners" ON public.owners;
DROP POLICY IF EXISTS "Brokers can delete their own owners" ON public.owners;

CREATE POLICY "Brokers can view their own owners" 
ON public.owners 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own owners" 
ON public.owners 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own owners" 
ON public.owners 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own owners" 
ON public.owners 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

-- Part 3: Make audit_logs immutable (prevent UPDATE and DELETE)
DROP POLICY IF EXISTS "Brokers can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Brokers can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No updates to audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No deletes from audit logs" ON public.audit_logs;

-- Allow brokers to view their own audit logs
CREATE POLICY "Brokers can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = broker_id);

-- Allow authenticated users to insert audit logs
CREATE POLICY "Authenticated users can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Explicitly deny UPDATE operations (no policy = no access, but being explicit)
-- Note: Not creating UPDATE policy means no updates allowed

-- Explicitly deny DELETE operations (no policy = no access, but being explicit)
-- Note: Not creating DELETE policy means no deletes allowed

-- Part 4: Add encrypted_credentials column to portal_connections if not exists
ALTER TABLE public.portal_connections 
ADD COLUMN IF NOT EXISTS encrypted_credentials TEXT;

-- Part 5: Add encrypted columns to integrations table
ALTER TABLE public.integrations 
ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT,
ADD COLUMN IF NOT EXISTS encrypted_config TEXT;