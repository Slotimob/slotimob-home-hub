
-- Replace overly permissive INSERT policy with service-role-only approach
-- Drop the permissive policy; edge functions use service role key which bypasses RLS
DROP POLICY "Service role can insert email notifications" ON public.email_notifications;
