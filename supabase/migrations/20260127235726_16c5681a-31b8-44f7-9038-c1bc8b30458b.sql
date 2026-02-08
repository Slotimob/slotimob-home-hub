-- Add obligations_config column to units table for tracking recurring obligations
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS obligations_config JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.units.obligations_config IS 'Configuration for tracking recurring obligations. Structure: { "iptu": { "active": true, "due_day": 10, "responsible": "owner" }, "condominium": { "active": true, "due_day": 15, "responsible": "tenant" }, "rent": { "active": true, "due_day": 5, "responsible": "tenant" }, "energy": { "active": false }, "water": { "active": false }, "gas": { "active": false } }';

-- Create an index for better query performance on JSONB
CREATE INDEX IF NOT EXISTS idx_units_obligations_config ON public.units USING GIN (obligations_config);