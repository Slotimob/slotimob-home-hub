-- Add is_published_portal to units (controls XML feed inclusion)
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS is_published_portal boolean NOT NULL DEFAULT false;

-- Add dedicated feed_token to profiles (separate from ical_token)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feed_token uuid DEFAULT gen_random_uuid();

-- Backfill existing profiles with a token
UPDATE public.profiles SET feed_token = gen_random_uuid() WHERE feed_token IS NULL;

-- Create function to regenerate feed token
CREATE OR REPLACE FUNCTION public.regenerate_feed_token(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token UUID;
BEGIN
  new_token := gen_random_uuid();
  UPDATE profiles SET feed_token = new_token, updated_at = now() WHERE id = p_user_id;
  RETURN new_token;
END;
$$;

-- Index for fast feed lookups by token
CREATE INDEX IF NOT EXISTS idx_profiles_feed_token ON public.profiles(feed_token);

-- Index for fast portal published units query
CREATE INDEX IF NOT EXISTS idx_units_published_portal ON public.units(broker_id) WHERE is_published_portal = true;