
-- Fix overly permissive RLS policy on ai_credits
DROP POLICY IF EXISTS "Service role can manage AI credits" ON public.ai_credits;

-- Only allow inserts via service role (which bypasses RLS anyway)
-- So we just need the SELECT policy for users, which is already set
