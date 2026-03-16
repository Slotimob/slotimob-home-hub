
-- Table for tracking async sync jobs
CREATE TABLE public.whatsapp_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_chats integer NOT NULL DEFAULT 0,
  processed_chats integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.whatsapp_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Workspace members can read jobs from their org
CREATE POLICY "Users can read own workspace sync jobs"
  ON public.whatsapp_sync_jobs
  FOR SELECT
  TO authenticated
  USING (
    broker_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_owner_id = whatsapp_sync_jobs.broker_id
        AND om.is_active = true
    )
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sync_jobs;
