
CREATE TABLE public.whatsapp_terms_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

ALTER TABLE public.whatsapp_terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own acceptances"
  ON public.whatsapp_terms_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Users can view their own acceptances"
  ON public.whatsapp_terms_acceptances
  FOR SELECT
  USING (auth.uid() = broker_id);
