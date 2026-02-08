-- Add commission_rate column to properties table
ALTER TABLE public.properties
ADD COLUMN commission_rate numeric DEFAULT 5.0;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.commission_rate IS 'Commission rate percentage for this property (e.g., 5.0 = 5%)';