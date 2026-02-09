-- Remove the overly permissive "Anyone can view" SELECT policy
DROP POLICY IF EXISTS "Anyone can view early adopter claims count" ON public.early_adopter_claims;

-- The existing "Users can view their own claims" policy (USING auth.uid() = user_id) remains,
-- so users can still see their own claims. The count is handled by the RPC function get_early_adopter_count().