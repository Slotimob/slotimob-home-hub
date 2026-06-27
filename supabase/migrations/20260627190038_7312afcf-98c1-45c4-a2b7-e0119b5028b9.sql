
-- 1. data_export_requests
DROP POLICY IF EXISTS "Super admin manages all" ON public.data_export_requests;
CREATE POLICY "Super admin manages all" ON public.data_export_requests
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. pipeline_stages workspace access
DROP POLICY IF EXISTS "Brokers can view their own stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Brokers can update their own stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Brokers can delete their own stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Brokers can create their own stages" ON public.pipeline_stages;

CREATE POLICY "Workspace can view pipeline stages" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (broker_id = ANY (public.get_workspace_user_ids(auth.uid())));
CREATE POLICY "Workspace can insert pipeline stages" ON public.pipeline_stages
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));
CREATE POLICY "Workspace can update pipeline stages" ON public.pipeline_stages
  FOR UPDATE TO authenticated
  USING (public.can_write_as_broker(auth.uid(), broker_id))
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));
CREATE POLICY "Workspace can delete pipeline stages" ON public.pipeline_stages
  FOR DELETE TO authenticated
  USING (public.can_write_as_broker(auth.uid(), broker_id));

-- 3. documents bucket workspace INSERT
DROP POLICY IF EXISTS "Brokers can upload their documents" ON storage.objects;
CREATE POLICY "Workspace can upload documents bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR ((storage.foldername(name))[1])::uuid = ANY (public.get_workspace_user_ids(auth.uid()))
    )
  );

-- 4. drop duplicate property-media policies
DROP POLICY IF EXISTS "Brokers can upload property media" ON storage.objects;
DROP POLICY IF EXISTS "Brokers can delete property media" ON storage.objects;
DROP POLICY IF EXISTS "Brokers can update property media" ON storage.objects;

-- 5. unit-media workspace-scoped SELECT
DROP POLICY IF EXISTS "Brokers can view their unit media" ON storage.objects;
CREATE POLICY "Workspace can view unit media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'unit-media'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR ((storage.foldername(name))[1])::uuid = ANY (public.get_workspace_user_ids(auth.uid()))
    )
  );

-- 6. Function search_path
ALTER FUNCTION public.create_free_subscription_on_signup() SET search_path = public;

-- 7. Move pg_net out of public (drop + recreate in extensions schema)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 8. Revoke execute on trigger-only SECURITY DEFINER functions
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND pg_get_function_result(p.oid)='trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
