-- Adicionar campos de inteligência de ativos na tabela units
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS intent_type text DEFAULT 'sale' CHECK (intent_type IN ('sale', 'rental', 'both')),
ADD COLUMN IF NOT EXISTS market_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_occupied boolean DEFAULT false;

-- Adicionar campos de inteligência de ativos na tabela properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS intent_type text DEFAULT 'sale' CHECK (intent_type IN ('sale', 'rental', 'both')),
ADD COLUMN IF NOT EXISTS is_under_management boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS market_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rental_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_occupied boolean DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN public.units.intent_type IS 'Objetivo do imóvel: sale (venda), rental (locação), both (ambos)';
COMMENT ON COLUMN public.units.market_value IS 'Valor estimado de mercado/patrimônio para cálculo de Yield';
COMMENT ON COLUMN public.units.is_occupied IS 'Status de ocupação do imóvel para cálculo de vacância';

COMMENT ON COLUMN public.properties.intent_type IS 'Objetivo do empreendimento: sale (venda), rental (locação), both (ambos)';
COMMENT ON COLUMN public.properties.is_under_management IS 'Indica se o empreendimento está sob gestão de ativos';
COMMENT ON COLUMN public.properties.market_value IS 'Valor estimado de mercado/patrimônio';
COMMENT ON COLUMN public.properties.rental_value IS 'Valor de locação mensal';
COMMENT ON COLUMN public.properties.is_occupied IS 'Status de ocupação';