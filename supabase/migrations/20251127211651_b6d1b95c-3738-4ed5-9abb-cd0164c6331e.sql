-- Create import_history table
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  units_imported INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Brokers can view their own import history"
  ON public.import_history
  FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own import history"
  ON public.import_history
  FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

-- Create index for better performance
CREATE INDEX idx_import_history_broker_property ON public.import_history(broker_id, property_id);
CREATE INDEX idx_import_history_imported_at ON public.import_history(imported_at DESC);