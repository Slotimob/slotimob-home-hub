-- 1) Add audit columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS trial_extension_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_modified_by_admin uuid REFERENCES auth.users(id);

-- 2) Create admin_manage_trial RPC (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_manage_trial(
  p_target_user_id uuid,
  p_new_trial_end timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: only super_admin can manage trials';
  END IF;

  UPDATE subscriptions
  SET 
    trial_ends_at = p_new_trial_end,
    trial_extension_count = trial_extension_count + 1,
    last_modified_by_admin = auth.uid(),
    updated_at = now()
  WHERE user_id = p_target_user_id;

  INSERT INTO admin_actions_logs (admin_user_id, target_user_id, action, reason, details)
  VALUES (
    auth.uid(),
    p_target_user_id,
    'manage_trial',
    'Trial period modified by super_admin',
    jsonb_build_object('new_trial_end', p_new_trial_end)
  );
END;
$$;