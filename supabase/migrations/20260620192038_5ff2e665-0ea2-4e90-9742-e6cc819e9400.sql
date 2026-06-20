
-- =============================================================
-- 1) Prevent privilege escalation via profiles.is_super_admin
-- =============================================================
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);

  -- Allow service_role (edge functions / admin) to make any change
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For any other caller, reset privileged columns to their previous values
  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    NEW.is_super_admin := OLD.is_super_admin;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- =============================================================
-- 2) Hide Stripe price IDs on subscription_plans from public
--    (column-level SELECT revoke; service_role keeps full access)
-- =============================================================
REVOKE SELECT (
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  stripe_price_id_early_adopter,
  stripe_price_id_annual_early_adopter
) ON public.subscription_plans FROM anon, authenticated;

-- =============================================================
-- 3) documents bucket: allow workspace members to update files
--    (parity with existing SELECT policy)
-- =============================================================
DROP POLICY IF EXISTS "Workspace can update documents bucket" ON storage.objects;
CREATE POLICY "Workspace can update documents bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1])::uuid = ANY (public.get_workspace_user_ids(auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1])::uuid = ANY (public.get_workspace_user_ids(auth.uid()))
  )
);

-- =============================================================
-- 4) Realtime: scope channel access to workspace topics
-- =============================================================
CREATE OR REPLACE FUNCTION public.realtime_topic_allowed(p_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR p_topic IS NULL THEN
    RETURN false;
  END IF;

  IF p_topic LIKE '%' || v_uid::text || '%' THEN
    RETURN true;
  END IF;

  v_ids := public.get_workspace_user_ids(v_uid);
  IF v_ids IS NOT NULL THEN
    FOREACH v_id IN ARRAY v_ids LOOP
      IF p_topic LIKE '%' || v_id::text || '%' THEN
        RETURN true;
      END IF;
    END LOOP;
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;

CREATE POLICY "Workspace-scoped realtime read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_topic_allowed(realtime.topic()));

CREATE POLICY "Workspace-scoped realtime write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_topic_allowed(realtime.topic()));
