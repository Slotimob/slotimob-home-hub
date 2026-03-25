
-- Add terms_signature column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_signature text;

-- Create RPC to accept latest terms with cryptographic signature
CREATE OR REPLACE FUNCTION public.accept_latest_terms(p_terms_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_now timestamptz;
  v_signature text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  
  v_now := now();
  
  -- Generate signature hash: SHA-256 of (user_id + email + version + timestamp)
  v_signature := encode(
    digest(
      v_user_id::text || COALESCE(v_email, '') || p_terms_version || v_now::text,
      'sha256'
    ),
    'hex'
  );

  -- Update profile
  UPDATE profiles
  SET 
    accepted_terms = true,
    terms_accepted_at = v_now,
    terms_version = p_terms_version,
    terms_signature = v_signature,
    updated_at = v_now
  WHERE id = v_user_id;

  -- Log consent for LGPD compliance
  INSERT INTO consent_logs (user_id, consent_type, terms_version, accepted_at)
  VALUES (v_user_id, 'terms_accept', p_terms_version, v_now);
END;
$$;
