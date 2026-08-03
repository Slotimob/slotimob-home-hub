-- 1. role_templates: remove cross-tenant read
DROP POLICY IF EXISTS "Authenticated users can view role templates" ON public.role_templates;

-- 2. Public buckets: remove broad SELECT (listing) policies.
-- Files remain reachable through public object URLs; only enumeration is removed.
DROP POLICY IF EXISTS "Blog images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Property media is publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Unit media is publicly readable" ON storage.objects;

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions
DO $$
DECLARE
  r record;
  keep_anon text[] := ARRAY['get_early_adopter_remaining_slots'];
  internal text[] := ARRAY[
    'audit_diff','cleanup_old_rate_limits','maintain_audit_partitions',
    'mark_overdue_access_reviews','open_access_review_cycles',
    'reset_ai_credits_for_user','verify_cron_secret',
    'encrypt_asaas_api_key','decrypt_asaas_api_key'
  ];
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname,
           format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) AS sig,
           (p.prorettype = 'pg_catalog.trigger'::regtype) AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    -- anon must not execute any SECURITY DEFINER function except the public pricing helper
    IF NOT (r.proname = ANY(keep_anon)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    END IF;

    -- trigger functions and internal maintenance/crypto routines are not callable by clients
    IF r.is_trigger OR r.proname = ANY(internal) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END IF;
  END LOOP;
END $$;