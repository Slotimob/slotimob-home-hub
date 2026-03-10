-- Fix overly permissive INSERT policy on email_notifications
DROP POLICY IF EXISTS "Service role can insert email notifications" ON public.email_notifications;

-- New policy: only allow users to insert their own records
-- Service role edge functions bypass RLS entirely and don't need a policy
CREATE POLICY "Users can insert own email notifications"
ON public.email_notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = broker_id);