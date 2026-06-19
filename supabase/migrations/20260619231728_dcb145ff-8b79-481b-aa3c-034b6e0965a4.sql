
-- 1. WhatsApp media: drop permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload whatsapp media" ON storage.objects;

-- 2. Documents bucket: add workspace-aware SELECT policy
DROP POLICY IF EXISTS "Workspace can read documents bucket" ON storage.objects;
CREATE POLICY "Workspace can read documents bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR ((storage.foldername(name))[1])::uuid = ANY (public.get_workspace_user_ids(auth.uid()))
  )
);

-- 3. audit_logs_legacy: remove permissive INSERT
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs_legacy;

-- 4. profile_directory view: set security_invoker
ALTER VIEW public.profile_directory SET (security_invoker = true);

-- 5. realtime.messages: enable RLS and require authenticated
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can use realtime"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (true);
