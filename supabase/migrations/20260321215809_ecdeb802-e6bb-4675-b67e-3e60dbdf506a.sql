
-- Create a SECURITY DEFINER function to look up an invitation by token
-- This replaces the direct SELECT on organization_invitations from anon users
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'email', oi.email,
    'invited_by_name', oi.invited_by_name,
    'organization_owner_id', oi.organization_owner_id
  ) INTO v_result
  FROM organization_invitations oi
  WHERE oi.token = p_token
    AND oi.used_at IS NULL
    AND oi.expires_at > now();

  RETURN v_result;
END;
$$;

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Read invitation by token for signup" ON public.organization_invitations;
