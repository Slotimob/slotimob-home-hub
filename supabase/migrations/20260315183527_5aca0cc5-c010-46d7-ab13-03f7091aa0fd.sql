
-- Fix INSERT policies for managerial_transactions to allow org members
DROP POLICY IF EXISTS "Users can create managerial transactions" ON managerial_transactions;
DROP POLICY IF EXISTS "Members can insert managerial transactions" ON managerial_transactions;
CREATE POLICY "Members can insert managerial transactions" ON managerial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    can_write_as_broker(auth.uid(), broker_id)
  );

-- Fix INSERT policies for schedule_activities to allow org members
DROP POLICY IF EXISTS "Users can create schedule activities" ON schedule_activities;
DROP POLICY IF EXISTS "Members can insert schedule activities" ON schedule_activities;
CREATE POLICY "Members can insert schedule activities" ON schedule_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    can_write_as_broker(auth.uid(), broker_id)
  );
