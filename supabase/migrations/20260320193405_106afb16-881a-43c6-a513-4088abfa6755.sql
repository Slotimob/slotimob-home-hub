-- Add RLS policy for account_deletion_logs: only staff (admin/super_admin) can read
CREATE POLICY "Staff can view deletion logs"
  ON public.account_deletion_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Users can insert their own deletion log
CREATE POLICY "Users can insert own deletion log"
  ON public.account_deletion_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());