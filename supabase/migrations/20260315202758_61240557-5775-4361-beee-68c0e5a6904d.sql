-- Allow workspace members to read whatsapp_connections of their organization
DROP POLICY IF EXISTS "Brokers can view their own connections" ON public.whatsapp_connections;

CREATE POLICY "Workspace members can view connections"
  ON public.whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (can_access_whatsapp_connection(auth.uid(), broker_id));