-- Add gallery_images column to units table for storing multiple photos
ALTER TABLE public.units 
ADD COLUMN gallery_images text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.units.gallery_images IS 'Array of URLs for unit gallery images';