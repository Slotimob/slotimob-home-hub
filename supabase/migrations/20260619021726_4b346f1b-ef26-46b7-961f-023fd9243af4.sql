
-- 1. Profiles: tighten SELECT to own row; expose safe directory via view
DROP POLICY IF EXISTS "Users can view own and workspace profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE VIEW public.profile_directory
WITH (security_invoker = false) AS
SELECT
  id,
  full_name,
  email,
  avatar_url,
  bio_mini,
  linkedin_url,
  instagram_url,
  author_role,
  theme_preference,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profile_directory TO anon, authenticated;

-- 2. Audit log partitions: remove permissive public INSERT policies
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs_2026_05;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs_2026_06;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs_2026_07;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs_2026_08;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs_default;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='audit_logs_2026_05'
      AND policyname='Only service role can insert audit logs'
  ) THEN
    CREATE POLICY "Only service role can insert audit logs"
      ON public.audit_logs_2026_05 FOR INSERT TO service_role WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='audit_logs_default'
      AND policyname='Only service role can insert audit logs'
  ) THEN
    CREATE POLICY "Only service role can insert audit logs"
      ON public.audit_logs_default FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END$$;

-- 3. Storage: allow users to read their own delivered exports
DROP POLICY IF EXISTS "Users can read own deliveries" ON storage.objects;
CREATE POLICY "Users can read own deliveries"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-deliveries'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
