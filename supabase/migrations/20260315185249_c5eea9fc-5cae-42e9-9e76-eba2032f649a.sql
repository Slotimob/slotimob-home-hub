
-- Fix SELECT policies for managerial_transactions to allow org members
DROP POLICY IF EXISTS "Users can view own managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Users can view managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Members can view managerial transactions" ON managerial_transactions;
CREATE POLICY "Members can view managerial transactions" ON managerial_transactions
  FOR SELECT TO authenticated
  USING (
    broker_id = ANY(get_workspace_user_ids(auth.uid()))
  );

-- Fix UPDATE policy for managerial_transactions
DROP POLICY IF EXISTS "Users can update own managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Users can update managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Members can update managerial transactions" ON managerial_transactions;
CREATE POLICY "Members can update managerial transactions" ON managerial_transactions
  FOR UPDATE TO authenticated
  USING (broker_id = ANY(get_workspace_user_ids(auth.uid())))
  WITH CHECK (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- Fix DELETE policy for managerial_transactions
DROP POLICY IF EXISTS "Users can delete own managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Users can delete managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Members can delete managerial transactions" ON managerial_transactions;
CREATE POLICY "Members can delete managerial transactions" ON managerial_transactions
  FOR DELETE TO authenticated
  USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- Fix SELECT policies for schedule_activities to allow org members
DROP POLICY IF EXISTS "Users can view own schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Users can view schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Members can view schedule activities" ON schedule_activities;
CREATE POLICY "Members can view schedule activities" ON schedule_activities
  FOR SELECT TO authenticated
  USING (
    broker_id = ANY(get_workspace_user_ids(auth.uid()))
  );

-- Fix UPDATE policy for schedule_activities
DROP POLICY IF EXISTS "Users can update own schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Users can update schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Members can update schedule activities" ON schedule_activities;
CREATE POLICY "Members can update schedule activities" ON schedule_activities
  FOR UPDATE TO authenticated
  USING (broker_id = ANY(get_workspace_user_ids(auth.uid())))
  WITH CHECK (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- Fix DELETE policy for schedule_activities
DROP POLICY IF EXISTS "Users can delete own schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Users can delete schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Members can delete schedule activities" ON schedule_activities;
CREATE POLICY "Members can delete schedule activities" ON schedule_activities
  FOR DELETE TO authenticated
  USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));
