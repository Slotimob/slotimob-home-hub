
-- Create proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  lead_name TEXT,
  introduction_message TEXT,
  include_financing BOOLEAN NOT NULL DEFAULT false,
  include_cover BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies using workspace functions
CREATE POLICY "Users can view workspace proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (broker_id = ANY(public.get_workspace_user_ids(auth.uid())));

CREATE POLICY "Users can insert proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Users can update workspace proposals"
  ON public.proposals FOR UPDATE TO authenticated
  USING (broker_id = ANY(public.get_workspace_user_ids(auth.uid())));

CREATE POLICY "Users can delete workspace proposals"
  ON public.proposals FOR DELETE TO authenticated
  USING (broker_id = ANY(public.get_workspace_user_ids(auth.uid())));

-- Index for performance
CREATE INDEX idx_proposals_broker_id ON public.proposals(broker_id);
CREATE INDEX idx_proposals_created_at ON public.proposals(created_at DESC);
