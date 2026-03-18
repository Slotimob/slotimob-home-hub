
-- 1. Add assigned_user_id to schedule_activities
ALTER TABLE public.schedule_activities 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id);

-- 2. Add assigned_user_id to visits
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.profiles(id);

-- 3. Create helper function to check CRM admin permission (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_crm_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND is_active = true
      AND (permissions -> 'crm_admin' ->> 'view')::boolean = true
  )
$$;

-- 4. Create helper function for assignment-based visibility
-- Returns true if: user is owner, is CRM admin, is assigned, or record is unassigned
CREATE OR REPLACE FUNCTION public.can_view_assigned_record(_user_id uuid, _broker_id uuid, _assigned_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    _broker_id = _user_id  -- Owner sees all
    OR _assigned_user_id = _user_id  -- Assigned to me
    OR _assigned_user_id IS NULL  -- Unassigned (legacy)
    OR public.is_crm_admin(_user_id)  -- CRM admin sees all
  )
$$;

-- 5. Drop old SELECT policy for deals and create new one
DROP POLICY IF EXISTS "Workspace can view deals" ON public.deals;
CREATE POLICY "Workspace can view deals" ON public.deals
FOR SELECT TO authenticated
USING (
  broker_id = ANY (get_workspace_user_ids(auth.uid()))
  AND public.can_view_assigned_record(auth.uid(), broker_id, assigned_user_id)
);

-- 6. Drop old SELECT policies for schedule_activities and create new one
DROP POLICY IF EXISTS "Brokers can view their own schedule activities" ON public.schedule_activities;
DROP POLICY IF EXISTS "Members can view schedule activities" ON public.schedule_activities;
CREATE POLICY "Workspace can view schedule activities" ON public.schedule_activities
FOR SELECT TO authenticated
USING (
  broker_id = ANY (get_workspace_user_ids(auth.uid()))
  AND public.can_view_assigned_record(auth.uid(), broker_id, assigned_user_id)
);

-- 7. Update INSERT policies to use workspace pattern for schedule_activities
DROP POLICY IF EXISTS "Brokers can insert their own schedule activities" ON public.schedule_activities;
-- Keep the Members insert policy as it already uses can_write_as_broker

-- 8. Update DELETE policy for schedule_activities
DROP POLICY IF EXISTS "Brokers can delete their own schedule activities" ON public.schedule_activities;
-- Members delete policy already uses get_workspace_user_ids

-- 9. Update UPDATE policy for schedule_activities  
DROP POLICY IF EXISTS "Brokers can update their own schedule activities" ON public.schedule_activities;
-- Members update policy already uses get_workspace_user_ids

-- 10. Add workspace-aware policies for visits
DROP POLICY IF EXISTS "Brokers can view their own visits" ON public.visits;
CREATE POLICY "Workspace can view visits" ON public.visits
FOR SELECT TO authenticated
USING (
  broker_id = ANY (get_workspace_user_ids(auth.uid()))
  AND public.can_view_assigned_record(auth.uid(), broker_id, assigned_user_id)
);

DROP POLICY IF EXISTS "Brokers can insert their own visits" ON public.visits;
CREATE POLICY "Workspace can insert visits" ON public.visits
FOR INSERT TO authenticated
WITH CHECK (can_write_as_broker(auth.uid(), broker_id));

DROP POLICY IF EXISTS "Brokers can delete their own visits" ON public.visits;
CREATE POLICY "Workspace can delete visits" ON public.visits
FOR DELETE TO authenticated
USING (broker_id = ANY (get_workspace_user_ids(auth.uid())));

DROP POLICY IF EXISTS "Brokers can update their own visits" ON public.visits;
CREATE POLICY "Workspace can update visits" ON public.visits
FOR UPDATE TO authenticated
USING (broker_id = ANY (get_workspace_user_ids(auth.uid())));
