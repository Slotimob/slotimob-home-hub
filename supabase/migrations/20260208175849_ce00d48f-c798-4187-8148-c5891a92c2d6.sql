-- Add ical_token column for calendar sync
ALTER TABLE public.profiles 
ADD COLUMN ical_token UUID DEFAULT gen_random_uuid();

-- Create index for faster lookups
CREATE INDEX idx_profiles_ical_token ON public.profiles(ical_token);

-- Add a function to regenerate ical token
CREATE OR REPLACE FUNCTION public.regenerate_ical_token(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token UUID;
BEGIN
  new_token := gen_random_uuid();
  
  UPDATE profiles 
  SET ical_token = new_token, updated_at = now()
  WHERE id = user_id;
  
  RETURN new_token;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.regenerate_ical_token(UUID) TO authenticated;