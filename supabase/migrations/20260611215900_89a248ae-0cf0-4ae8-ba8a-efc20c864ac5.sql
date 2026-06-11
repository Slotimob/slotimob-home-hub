
-- 1) audit_logs: block authenticated INSERTs (only service_role / SECURITY DEFINER triggers may insert)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2) Storage: remove the overly broad authenticated-any policies on property-media
DROP POLICY IF EXISTS "Authenticated users can delete their property media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their property media" ON storage.objects;
