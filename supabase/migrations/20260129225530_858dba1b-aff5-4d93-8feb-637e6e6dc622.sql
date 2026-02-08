-- Add is_managed boolean column to units table for asset management filtering
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS is_managed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.units.is_managed IS 'When true, this unit appears in the Asset Health management dashboard';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_units_is_managed ON public.units (is_managed) WHERE is_managed = true;