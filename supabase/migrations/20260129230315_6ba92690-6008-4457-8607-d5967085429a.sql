-- Make property_id nullable for standalone units
ALTER TABLE public.units ALTER COLUMN property_id DROP NOT NULL;

-- Drop and recreate the foreign key to allow NULL values properly
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_property_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;