-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view claims for counting" ON public.early_adopter_claims;

-- Create a new policy that only allows users to view their own claims
CREATE POLICY "Users can view their own claims"
ON public.early_adopter_claims FOR SELECT
USING (auth.uid() = user_id);

-- Create a SECURITY DEFINER function for counting early adopters (for public display)
CREATE OR REPLACE FUNCTION public.get_early_adopter_count(p_plan_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer 
  FROM early_adopter_claims eac
  JOIN subscriptions s ON eac.subscription_id = s.id
  WHERE eac.plan_id = p_plan_id
  AND s.status = 'active';
$$;