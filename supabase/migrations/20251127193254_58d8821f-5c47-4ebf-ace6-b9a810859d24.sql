-- Add foreign key constraints to visits table
ALTER TABLE public.visits
  ADD CONSTRAINT visits_broker_id_fkey 
  FOREIGN KEY (broker_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES public.leads(id) 
  ON DELETE CASCADE;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_property_id_fkey 
  FOREIGN KEY (property_id) 
  REFERENCES public.properties(id) 
  ON DELETE SET NULL;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_unit_id_fkey 
  FOREIGN KEY (unit_id) 
  REFERENCES public.units(id) 
  ON DELETE SET NULL;