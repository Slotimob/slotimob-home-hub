-- Add missing fields for complete property data parity
-- Suites, description, and address fields for units

ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS suites integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS city text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS state text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS postal_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS neighborhood text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rent_price numeric DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.units.suites IS 'Number of suites (bedrooms with private bathroom)';
COMMENT ON COLUMN public.units.description IS 'Full property description for listings and PDFs';
COMMENT ON COLUMN public.units.address IS 'Complete street address';
COMMENT ON COLUMN public.units.city IS 'City name';
COMMENT ON COLUMN public.units.state IS 'State abbreviation (e.g., SP, RJ)';
COMMENT ON COLUMN public.units.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN public.units.neighborhood IS 'Neighborhood name';
COMMENT ON COLUMN public.units.rent_price IS 'Monthly rent price for rental properties';