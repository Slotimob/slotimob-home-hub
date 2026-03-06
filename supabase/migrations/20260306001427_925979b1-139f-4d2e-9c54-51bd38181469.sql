
CREATE TABLE public.managerial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  obligation_type TEXT,
  competency_period TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.managerial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view their own managerial transactions"
  ON public.managerial_transactions FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own managerial transactions"
  ON public.managerial_transactions FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own managerial transactions"
  ON public.managerial_transactions FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own managerial transactions"
  ON public.managerial_transactions FOR DELETE
  USING (auth.uid() = broker_id);
