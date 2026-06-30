CREATE OR REPLACE FUNCTION public.regenerate_feed_token(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_token UUID;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  new_token := gen_random_uuid();
  UPDATE profiles SET feed_token = new_token, updated_at = now() WHERE id = p_user_id;
  RETURN new_token;
END;
$function$;