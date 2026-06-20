
REVOKE SELECT (asaas_api_key, wallet_id) ON public.asaas_accounts FROM authenticated;
REVOKE SELECT (encrypted_api_key, encrypted_config) ON public.integrations FROM authenticated;
REVOKE SELECT (encrypted_credentials) ON public.portal_connections FROM authenticated;
REVOKE SELECT (webhook_secret) ON public.whatsapp_connections FROM authenticated;

REVOKE SELECT (asaas_api_key, wallet_id) ON public.asaas_accounts FROM anon;
REVOKE SELECT (encrypted_api_key, encrypted_config) ON public.integrations FROM anon;
REVOKE SELECT (encrypted_credentials) ON public.portal_connections FROM anon;
REVOKE SELECT (webhook_secret) ON public.whatsapp_connections FROM anon;

CREATE OR REPLACE FUNCTION public.can_user_edit_member_permissions(p_editor uuid, p_target uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target_row organization_members;
  v_editor_row organization_members;
BEGIN
  IF p_editor = p_target THEN RETURN false; END IF;

  IF public.is_super_admin(p_editor) THEN RETURN true; END IF;

  SELECT * INTO v_target_row FROM organization_members
    WHERE user_id = p_target AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  IF p_editor = v_target_row.organization_owner_id THEN RETURN true; END IF;

  SELECT * INTO v_editor_row FROM organization_members
    WHERE user_id = p_editor
      AND organization_owner_id = v_target_row.organization_owner_id
      AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  IF v_target_row.user_id = v_target_row.organization_owner_id THEN RETURN false; END IF;

  IF (v_target_row.permissions->'manage_team_permissions'->>'edit')::boolean IS TRUE THEN
    RETURN false;
  END IF;

  IF (v_editor_row.permissions->'manage_team_permissions'->>'edit')::boolean IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$function$;
