-- Fix owners table RLS: Drop the restrictive SELECT policy and create a proper PERMISSIVE one
-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Brokers can view their own owners" ON public.owners;

-- Create a proper PERMISSIVE SELECT policy (default is PERMISSIVE)
CREATE POLICY "Brokers can view their own owners"
ON public.owners
FOR SELECT
TO authenticated
USING (auth.uid() = broker_id);

-- Also fix the duplicate INSERT policies - drop one and ensure proper access
DROP POLICY IF EXISTS "Brokers can insert their own owners" ON public.owners;

-- The "Brokers can create their own owners" policy already has proper NULL check