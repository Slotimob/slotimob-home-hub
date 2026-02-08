-- Expand properties table with complete project technical sheet

-- Project Information
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS builder_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS construction_stage TEXT; -- 'lancamento', 'em_obras', 'pronto'
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_land_area NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS number_of_towers INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_units_count INTEGER;

-- Amenities checklist (stored as array of strings)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

-- Differentials (text fields for detailed descriptions)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_features TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sustainability_features TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS technology_features TEXT;

-- Gallery images (stored as array of URLs for common area photos)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';

-- Add index for amenities search
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON public.properties USING GIN(amenities);

-- Add index for construction stage filtering
CREATE INDEX IF NOT EXISTS idx_properties_construction_stage ON public.properties(construction_stage);

-- Comment the new columns for documentation
COMMENT ON COLUMN public.properties.builder_name IS 'Nome da construtora responsável pelo empreendimento';
COMMENT ON COLUMN public.properties.construction_stage IS 'Estágio da obra: lancamento, em_obras, pronto';
COMMENT ON COLUMN public.properties.delivery_date IS 'Data prevista de entrega';
COMMENT ON COLUMN public.properties.total_land_area IS 'Área total do terreno em m²';
COMMENT ON COLUMN public.properties.number_of_towers IS 'Número de torres do empreendimento';
COMMENT ON COLUMN public.properties.total_units_count IS 'Total de unidades do empreendimento';
COMMENT ON COLUMN public.properties.amenities IS 'Lista de amenidades/infraestrutura: piscina_adulto, piscina_infantil, academia, coworking, salao_festas, espaco_gourmet, pet_place, brinquedoteca, quadra, rooftop, portaria_24h, etc';
COMMENT ON COLUMN public.properties.security_features IS 'Descrição dos diferenciais de segurança';
COMMENT ON COLUMN public.properties.sustainability_features IS 'Descrição dos diferenciais de sustentabilidade';
COMMENT ON COLUMN public.properties.technology_features IS 'Descrição dos diferenciais tecnológicos';
COMMENT ON COLUMN public.properties.gallery_images IS 'URLs das fotos das áreas comuns e perspectivas';