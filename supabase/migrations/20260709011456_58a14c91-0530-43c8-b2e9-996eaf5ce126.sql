-- Fix RLS on public.custom_pipelines to support workspace members (multi-tenant).
-- Existing INSERT/UPDATE/DELETE policies check broker_id = auth.uid(), which breaks
-- when a member writes with effectiveBrokerId = organization_owner_id (their master),
-- even though SELECT already scoped writes to workspace members.
-- Use can_write_as_broker(auth.uid(), broker_id) which returns true for the owner
-- itself and for active members of that organization.

DROP POLICY IF EXISTS "Owners can create pipelines" ON public.custom_pipelines;
DROP POLICY IF EXISTS "Owners can update own pipelines" ON public.custom_pipelines;
DROP POLICY IF EXISTS "Owners can delete own pipelines" ON public.custom_pipelines;

CREATE POLICY "Workspace can create pipelines"
  ON public.custom_pipelines
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Workspace can update pipelines"
  ON public.custom_pipelines
  FOR UPDATE
  TO authenticated
  USING (public.can_write_as_broker(auth.uid(), broker_id))
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Workspace can delete pipelines"
  ON public.custom_pipelines
  FOR DELETE
  TO authenticated
  USING (public.can_write_as_broker(auth.uid(), broker_id));