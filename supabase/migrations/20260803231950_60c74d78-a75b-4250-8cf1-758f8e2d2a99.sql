DO $$
DECLARE
  r record;
  internal text[] := ARRAY[
    'get_early_adopter_count',
    'check_user_limit',
    'get_effective_limits',
    'validate_permissions_payload',
    'regenerate_feed_token',
    'register_export_download',
    'claim_early_adopter_slot'
  ];
BEGIN
  FOR r IN
    SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(internal)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;