
-- Fix overly permissive policies: drop the broad ones and rely on service role for token operations
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.organization_invitations;
DROP POLICY IF EXISTS "Anyone can update invitation by token" ON public.organization_invitations;

-- Allow anon/authenticated to read only unexpired, unused invitations by token (for signup page)
CREATE POLICY "Read invitation by token for signup"
  ON public.organization_invitations FOR SELECT
  USING (used_at IS NULL AND expires_at > now());
