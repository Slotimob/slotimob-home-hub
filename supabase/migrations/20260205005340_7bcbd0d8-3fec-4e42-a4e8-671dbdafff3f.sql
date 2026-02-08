-- Add explicit DENY policies for UPDATE and DELETE on audit_logs table
-- This ensures audit log immutability and prevents tampering

-- First, drop existing policies if any (to recreate with proper restrictive settings)
DROP POLICY IF EXISTS "Block audit_logs updates" ON public.audit_logs;
DROP POLICY IF EXISTS "Block audit_logs deletes" ON public.audit_logs;

-- Create explicit DENY policy for UPDATE operations
-- Using RESTRICTIVE policy with 'false' condition to block all updates
CREATE POLICY "Block audit_logs updates"
ON public.audit_logs
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Create explicit DENY policy for DELETE operations
-- Using RESTRICTIVE policy with 'false' condition to block all deletes
CREATE POLICY "Block audit_logs deletes"
ON public.audit_logs
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);