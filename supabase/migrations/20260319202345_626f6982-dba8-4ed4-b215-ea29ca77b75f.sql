-- Add pipeline_type to pipeline_stages and deals for multi-pipeline support
ALTER TABLE public.pipeline_stages 
  ADD COLUMN IF NOT EXISTS pipeline_type text NOT NULL DEFAULT 'sale';

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS pipeline_type text NOT NULL DEFAULT 'sale';

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_type ON public.pipeline_stages (broker_id, pipeline_type);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_type ON public.deals (broker_id, pipeline_type);