-- Add pipeline_stage_order field to profiles to store the complete stage ordering
ALTER TABLE public.profiles 
ADD COLUMN pipeline_stage_order JSONB DEFAULT NULL;

-- This stores an array like: ["new_lead", "custom_abc123", "in_contact", "custom_xyz789", ...]
COMMENT ON COLUMN public.profiles.pipeline_stage_order IS 'Custom ordering of all pipeline stages (default + custom)';