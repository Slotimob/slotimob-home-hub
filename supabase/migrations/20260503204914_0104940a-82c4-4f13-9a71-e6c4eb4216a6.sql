
CREATE TABLE public.custom_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pipeline_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (broker_id, pipeline_key)
);

ALTER TABLE public.custom_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace pipelines"
  ON public.custom_pipelines FOR SELECT
  TO authenticated
  USING (
    broker_id = auth.uid()
    OR broker_id IN (
      SELECT organization_owner_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Owners can create pipelines"
  ON public.custom_pipelines FOR INSERT
  TO authenticated
  WITH CHECK (broker_id = auth.uid());

CREATE POLICY "Owners can update own pipelines"
  ON public.custom_pipelines FOR UPDATE
  TO authenticated
  USING (broker_id = auth.uid());

CREATE POLICY "Owners can delete own pipelines"
  ON public.custom_pipelines FOR DELETE
  TO authenticated
  USING (broker_id = auth.uid());

CREATE INDEX idx_custom_pipelines_broker ON public.custom_pipelines(broker_id);

CREATE TRIGGER update_custom_pipelines_updated_at
  BEFORE UPDATE ON public.custom_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
