-- Add temperature field to deals for lead classification (hot, warm, cold)
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'warm' 
CHECK (temperature IN ('hot', 'warm', 'cold'));

-- Add initial_task field to store the first action/task when creating a deal
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS initial_task text;

-- Add business_type field to classify sale or rental
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'sale' 
CHECK (business_type IN ('sale', 'rental'));

-- Comment on columns for documentation
COMMENT ON COLUMN public.deals.temperature IS 'Lead temperature classification: hot (quente), warm (morno), cold (frio)';
COMMENT ON COLUMN public.deals.initial_task IS 'First task/action to take with this deal';
COMMENT ON COLUMN public.deals.business_type IS 'Type of business: sale (venda) or rental (locação)';