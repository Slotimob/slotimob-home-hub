
-- Fix: Replace overly permissive profiles SELECT policy with workspace-scoped policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own and workspace profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR id = ANY(get_workspace_user_ids(auth.uid())));
