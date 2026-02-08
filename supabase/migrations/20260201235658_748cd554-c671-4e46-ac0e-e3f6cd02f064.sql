-- Add new fields to leases table for adjustment management
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS adjustment_index text DEFAULT 'IGPM',
ADD COLUMN IF NOT EXISTS next_adjustment_date date,
ADD COLUMN IF NOT EXISTS contract_status text DEFAULT 'active';

-- Create lease adjustments history table
CREATE TABLE IF NOT EXISTS public.lease_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES public.profiles(id),
  lease_id uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  adjustment_date date NOT NULL,
  previous_value numeric NOT NULL,
  new_value numeric NOT NULL,
  index_used text NOT NULL,
  index_percentage numeric NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on lease_adjustments
ALTER TABLE public.lease_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease_adjustments
CREATE POLICY "Brokers can view their own adjustments" 
ON public.lease_adjustments 
FOR SELECT 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own adjustments" 
ON public.lease_adjustments 
FOR INSERT 
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own adjustments" 
ON public.lease_adjustments 
FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own adjustments" 
ON public.lease_adjustments 
FOR DELETE 
USING (auth.uid() = broker_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leases_next_adjustment_date ON public.leases(next_adjustment_date);
CREATE INDEX IF NOT EXISTS idx_lease_adjustments_lease_id ON public.lease_adjustments(lease_id);