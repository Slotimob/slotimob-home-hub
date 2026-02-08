-- Add tags column to units table for custom tagging system
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create index for efficient tag filtering
CREATE INDEX IF NOT EXISTS idx_units_tags ON public.units USING GIN(tags);