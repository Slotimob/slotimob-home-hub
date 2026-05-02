
-- 1. Function: can a user edit another member's permissions?
CREATE OR REPLACE FUNCTION public.can_user_edit_member_permissions(
  p_editor UUID,
  p_target UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_row organization_members;
  v_editor_row organization_members;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Cannot edit self
  IF p_editor = p_target THEN RETURN false; END IF;

  -- Super admin can edit anyone
  SELECT is_super_admin INTO v_is_super_admin
    FROM profiles WHERE id = p_editor;
  IF v_is_super_admin IS TRUE THEN RETURN true; END IF;

  -- Get target membership
  SELECT * INTO v_target_row FROM organization_members
    WHERE user_id = p_target AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Owner of workspace can edit any member
  IF p_editor = v_target_row.organization_owner_id THEN RETURN true; END IF;

  -- Check if editor is a member of the same workspace
  SELECT * INTO v_editor_row FROM organization_members
    WHERE user_id = p_editor
      AND organization_owner_id = v_target_row.organization_owner_id
      AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Delegate cannot edit the workspace owner (target is not a member row for the owner typically, but safety check)
  IF v_target_row.user_id = v_target_row.organization_owner_id THEN RETURN false; END IF;

  -- Delegate cannot edit other delegates
  IF (v_target_row.permissions->'manage_team_permissions'->>'edit')::boolean IS TRUE THEN
    RETURN false;
  END IF;

  -- Editor must have manage_team_permissions.edit
  IF (v_editor_row.permissions->'manage_team_permissions'->>'edit')::boolean IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 2. Function: validate permissions payload (anti-privilege-escalation)
CREATE OR REPLACE FUNCTION public.validate_permissions_payload(
  p_editor UUID,
  p_target UUID,
  p_old jsonb,
  p_new jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_editor_perms jsonb;
  v_is_super_admin BOOLEAN;
  v_target_owner UUID;
  v_module TEXT;
  v_action TEXT;
  v_old_val BOOLEAN;
  v_new_val BOOLEAN;
BEGIN
  SELECT is_super_admin INTO v_is_super_admin
    FROM profiles WHERE id = p_editor;
  IF v_is_super_admin IS TRUE THEN RETURN true; END IF;

  SELECT organization_owner_id INTO v_target_owner
    FROM organization_members WHERE user_id = p_target AND is_active = true LIMIT 1;
  IF p_editor = v_target_owner THEN RETURN true; END IF;

  -- Delegate: cross-check diff with own permissions
  SELECT permissions INTO v_editor_perms FROM organization_members
    WHERE user_id = p_editor AND is_active = true LIMIT 1;
  IF v_editor_perms IS NULL THEN RETURN false; END IF;

  -- Delegate cannot touch manage_team_permissions
  IF (p_old->'manage_team_permissions') IS DISTINCT FROM
     (p_new->'manage_team_permissions') THEN
    RETURN false;
  END IF;

  -- For each changed action in each module, editor must have it
  FOR v_module IN SELECT jsonb_object_keys(p_new) LOOP
    FOR v_action IN VALUES ('view'),('create'),('edit'),('delete') LOOP
      v_old_val := COALESCE((p_old->v_module->>v_action)::boolean, false);
      v_new_val := COALESCE((p_new->v_module->>v_action)::boolean, false);
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        IF COALESCE((v_editor_perms->v_module->>v_action)::boolean, false) IS DISTINCT FROM true THEN
          RETURN false;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN true;
END;
$$;

-- 3. Trigger: enforce permissions payload on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_permissions_payload()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    IF NOT public.validate_permissions_payload(
      auth.uid(), NEW.user_id, OLD.permissions, NEW.permissions
    ) THEN
      RAISE EXCEPTION 'Sem autorização para conceder uma ou mais permissões alteradas'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_permissions_payload ON public.organization_members;
CREATE TRIGGER trg_enforce_permissions_payload
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_permissions_payload();

-- 4. Trigger: audit log for permissions changes
CREATE OR REPLACE FUNCTION public.log_member_permissions_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    INSERT INTO public.audit_logs (
      broker_id, actor_user_id, action, table_name, record_id,
      old_data, new_data, metadata
    ) VALUES (
      NEW.organization_owner_id, auth.uid(), 'member_permissions_changed',
      'organization_members', NEW.id,
      jsonb_build_object('permissions', OLD.permissions),
      jsonb_build_object('permissions', NEW.permissions),
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'organization_owner_id', NEW.organization_owner_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_member_permissions_change ON public.organization_members;
CREATE TRIGGER trg_log_member_permissions_change
  AFTER UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.log_member_permissions_change();

-- 5. Replace the FOR ALL policy with separate INSERT/DELETE (owner only) and UPDATE (authorized editors)
DROP POLICY IF EXISTS "Owner can manage members" ON public.organization_members;

CREATE POLICY "Owner inserts members"
  ON public.organization_members FOR INSERT
  WITH CHECK (auth.uid() = organization_owner_id);

CREATE POLICY "Owner deletes members"
  ON public.organization_members FOR DELETE
  USING (auth.uid() = organization_owner_id);

CREATE POLICY "Authorized editors update members"
  ON public.organization_members FOR UPDATE
  USING (
    auth.uid() = organization_owner_id
    OR public.can_user_edit_member_permissions(auth.uid(), user_id)
  )
  WITH CHECK (
    auth.uid() = organization_owner_id
    OR public.can_user_edit_member_permissions(auth.uid(), user_id)
  );
