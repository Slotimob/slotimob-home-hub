-- Create table for custom obligation types per user
CREATE TABLE public.custom_obligation_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Circle',
  default_due_day INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broker_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_obligation_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see and manage their own custom types
CREATE POLICY "Users can view their own custom obligation types"
  ON public.custom_obligation_types
  FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Users can create their own custom obligation types"
  ON public.custom_obligation_types
  FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Users can update their own custom obligation types"
  ON public.custom_obligation_types
  FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Users can delete their own custom obligation types"
  ON public.custom_obligation_types
  FOR DELETE
  USING (auth.uid() = broker_id);

-- Add trigger for updated_at
CREATE TRIGGER update_custom_obligation_types_updated_at
  BEFORE UPDATE ON public.custom_obligation_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();