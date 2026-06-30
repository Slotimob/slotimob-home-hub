CREATE OR REPLACE FUNCTION public.admin_change_role(p_target_user_id uuid, p_role text, p_action text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super_admin can manage roles';
  END IF;

  IF p_action = 'grant' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (p_target_user_id, p_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF p_action = 'revoke' THEN
    IF p_role = 'super_admin' THEN
      IF (SELECT count(DISTINCT user_id) FROM user_roles WHERE role = 'super_admin'::app_role) <= 1 THEN
        RAISE EXCEPTION 'Não é possível remover o último super_admin do sistema';
      END IF;
    END IF;
    DELETE FROM user_roles WHERE user_id = p_target_user_id AND role = p_role::app_role;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (auth.uid(), p_target_user_id, 'change_role', p_reason,
    jsonb_build_object('role', p_role, 'action', p_action));
END;
$function$;