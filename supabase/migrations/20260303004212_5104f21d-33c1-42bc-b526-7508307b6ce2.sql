
-- Create ai_credit_packs table
CREATE TABLE public.ai_credit_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  credits_amount integer NOT NULL,
  price numeric(10,2) NOT NULL,
  stripe_price_id text NOT NULL,
  stripe_product_id text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_credit_packs ENABLE ROW LEVEL SECURITY;

-- Public read access (these are product catalog items)
CREATE POLICY "Anyone can read active credit packs"
ON public.ai_credit_packs
FOR SELECT
USING (is_active = true);

-- Insert the 3 packs
INSERT INTO public.ai_credit_packs (name, credits_amount, price, stripe_price_id, sort_order) VALUES
  ('500 Tokens', 500, 19.90, 'price_1T6gbTAUMiQcSICyei8sQCXE', 1),
  ('1.000 Tokens', 1000, 39.00, 'price_1T6gbrAUMiQcSICylWWUd3H5', 2),
  ('2.500 Tokens', 2500, 79.90, 'price_1T6gcBAUMiQcSICyBGJwdX3B', 3);
