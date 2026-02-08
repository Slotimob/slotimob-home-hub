-- Create enum for visit status
CREATE TYPE public.visit_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed');

-- Create visits table
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  unit_id UUID,
  property_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status visit_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Brokers can view their own visits"
  ON public.visits
  FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own visits"
  ON public.visits
  FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own visits"
  ON public.visits
  FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own visits"
  ON public.visits
  FOR DELETE
  USING (auth.uid() = broker_id);

-- Create trigger for updated_at
CREATE TRIGGER update_visits_updated_at
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();