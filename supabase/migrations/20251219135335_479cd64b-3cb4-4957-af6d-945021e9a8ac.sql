-- Create table for custom pipeline stages
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  is_won_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Brokers can view their own stages" 
ON public.pipeline_stages 
FOR SELECT 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own stages" 
ON public.pipeline_stages 
FOR INSERT 
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own stages" 
ON public.pipeline_stages 
FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own stages" 
ON public.pipeline_stages 
FOR DELETE 
USING (auth.uid() = broker_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add stage_id column to deals table (nullable to maintain backwards compatibility)
ALTER TABLE public.deals ADD COLUMN custom_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;