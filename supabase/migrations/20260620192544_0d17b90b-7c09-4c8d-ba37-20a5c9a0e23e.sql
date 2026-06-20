
-- organization_members_owner_read_gap: allow owners (and active members of the same workspace) to read membership rows
DROP POLICY IF EXISTS "Workspace owner and members can read membership" ON public.organization_members;
CREATE POLICY "Workspace owner and members can read membership"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = organization_owner_id
  OR auth.uid() = user_id
  OR organization_owner_id = ANY (public.get_workspace_user_ids(auth.uid()))
);
