
-- =============================================
-- MULTI-TENANT WORKSPACE: get_workspace_user_ids()
-- Returns array of all user IDs in the workspace:
-- If user is an owner: returns [owner_id, ...active_member_ids]
-- If user is a member: returns [owner_id, ...all_active_member_ids_in_same_org]
-- If user is standalone: returns [user_id]
-- =============================================

CREATE OR REPLACE FUNCTION public.get_workspace_user_ids(p_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_result uuid[];
BEGIN
  -- Check if user is a member of an organization
  SELECT organization_owner_id INTO v_owner_id
  FROM organization_members
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    -- User is a member: get all workspace users (owner + all active members)
    SELECT ARRAY[v_owner_id] || COALESCE(array_agg(om.user_id), ARRAY[]::uuid[])
    INTO v_result
    FROM organization_members om
    WHERE om.organization_owner_id = v_owner_id AND om.is_active = true;
    RETURN v_result;
  END IF;

  -- Check if user is an owner (has members)
  SELECT ARRAY[p_user_id] || COALESCE(array_agg(om.user_id), ARRAY[]::uuid[])
  INTO v_result
  FROM organization_members om
  WHERE om.organization_owner_id = p_user_id AND om.is_active = true;

  -- If no members found, just return the user themselves
  IF v_result IS NULL THEN
    RETURN ARRAY[p_user_id];
  END IF;

  RETURN v_result;
END;
$$;

-- Helper: get the effective broker_id (owner) for a user
CREATE OR REPLACE FUNCTION public.get_effective_broker_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT organization_owner_id FROM organization_members 
     WHERE user_id = p_user_id AND is_active = true LIMIT 1),
    p_user_id
  );
$$;

-- =============================================
-- UPDATE RLS POLICIES: properties
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own properties" ON properties;
DROP POLICY IF EXISTS "Brokers can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Brokers can update their own properties" ON properties;
DROP POLICY IF EXISTS "Brokers can delete their own properties" ON properties;

CREATE POLICY "Workspace can view properties" ON properties FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update properties" ON properties FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete properties" ON properties FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: units
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own units" ON units;
DROP POLICY IF EXISTS "Brokers can insert their own units" ON units;
DROP POLICY IF EXISTS "Brokers can update their own units" ON units;
DROP POLICY IF EXISTS "Brokers can delete their own units" ON units;

CREATE POLICY "Workspace can view units" ON units FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert units" ON units FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update units" ON units FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete units" ON units FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: contacts
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Brokers can create their own contacts" ON contacts;
DROP POLICY IF EXISTS "Brokers can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Brokers can delete their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;

CREATE POLICY "Workspace can view contacts" ON contacts FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update contacts" ON contacts FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete contacts" ON contacts FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: deals
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own deals" ON deals;
DROP POLICY IF EXISTS "Brokers can insert their own deals" ON deals;
DROP POLICY IF EXISTS "Brokers can update their own deals" ON deals;
DROP POLICY IF EXISTS "Brokers can delete their own deals" ON deals;

CREATE POLICY "Workspace can view deals" ON deals FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert deals" ON deals FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update deals" ON deals FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete deals" ON deals FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: leads
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can create their own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can insert their own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can update their own leads" ON leads;
DROP POLICY IF EXISTS "Brokers can delete their own leads" ON leads;

CREATE POLICY "Workspace can view leads" ON leads FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert leads" ON leads FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update leads" ON leads FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete leads" ON leads FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: financial_transactions
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Brokers can insert their own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Brokers can update their own transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Brokers can delete their own transactions" ON financial_transactions;

CREATE POLICY "Workspace can view transactions" ON financial_transactions FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert transactions" ON financial_transactions FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update transactions" ON financial_transactions FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete transactions" ON financial_transactions FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: leases
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own leases" ON leases;
DROP POLICY IF EXISTS "Brokers can create their own leases" ON leases;
DROP POLICY IF EXISTS "Brokers can update their own leases" ON leases;
DROP POLICY IF EXISTS "Brokers can delete their own leases" ON leases;

CREATE POLICY "Workspace can view leases" ON leases FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert leases" ON leases FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update leases" ON leases FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete leases" ON leases FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: deal_activities
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own deal activities" ON deal_activities;
DROP POLICY IF EXISTS "Brokers can insert their own deal activities" ON deal_activities;
DROP POLICY IF EXISTS "Brokers can update their own deal activities" ON deal_activities;
DROP POLICY IF EXISTS "Brokers can delete their own deal activities" ON deal_activities;

CREATE POLICY "Workspace can view deal activities" ON deal_activities FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert deal activities" ON deal_activities FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update deal activities" ON deal_activities FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete deal activities" ON deal_activities FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: deal_tasks
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own deal tasks" ON deal_tasks;
DROP POLICY IF EXISTS "Brokers can insert their own deal tasks" ON deal_tasks;
DROP POLICY IF EXISTS "Brokers can update their own deal tasks" ON deal_tasks;
DROP POLICY IF EXISTS "Brokers can delete their own deal tasks" ON deal_tasks;

CREATE POLICY "Workspace can view deal tasks" ON deal_tasks FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert deal tasks" ON deal_tasks FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update deal tasks" ON deal_tasks FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete deal tasks" ON deal_tasks FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: deal_stage_history
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own deal stage history" ON deal_stage_history;
DROP POLICY IF EXISTS "Brokers can insert their own deal stage history" ON deal_stage_history;
DROP POLICY IF EXISTS "Brokers can update their own deal stage history" ON deal_stage_history;
DROP POLICY IF EXISTS "Brokers can delete their own deal stage history" ON deal_stage_history;

CREATE POLICY "Workspace can view deal stage history" ON deal_stage_history FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert deal stage history" ON deal_stage_history FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update deal stage history" ON deal_stage_history FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete deal stage history" ON deal_stage_history FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: bank_accounts
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Brokers can insert their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Brokers can update their own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Brokers can delete their own bank accounts" ON bank_accounts;

CREATE POLICY "Workspace can view bank accounts" ON bank_accounts FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert bank accounts" ON bank_accounts FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update bank accounts" ON bank_accounts FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete bank accounts" ON bank_accounts FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: financial_categories
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own categories" ON financial_categories;
DROP POLICY IF EXISTS "Brokers can insert their own categories" ON financial_categories;
DROP POLICY IF EXISTS "Brokers can update their own categories" ON financial_categories;
DROP POLICY IF EXISTS "Brokers can delete their own categories" ON financial_categories;

CREATE POLICY "Workspace can view categories" ON financial_categories FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert categories" ON financial_categories FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update categories" ON financial_categories FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete categories" ON financial_categories FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: documents
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own documents" ON documents;
DROP POLICY IF EXISTS "Brokers can insert their own documents" ON documents;
DROP POLICY IF EXISTS "Brokers can update their own documents" ON documents;
DROP POLICY IF EXISTS "Brokers can delete their own documents" ON documents;

CREATE POLICY "Workspace can view documents" ON documents FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update documents" ON documents FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete documents" ON documents FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: generated_documents
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own generated documents" ON generated_documents;
DROP POLICY IF EXISTS "Brokers can insert their own generated documents" ON generated_documents;
DROP POLICY IF EXISTS "Brokers can delete their own generated documents" ON generated_documents;

CREATE POLICY "Workspace can view generated documents" ON generated_documents FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert generated documents" ON generated_documents FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can delete generated documents" ON generated_documents FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: lease_adjustments
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own adjustments" ON lease_adjustments;
DROP POLICY IF EXISTS "Brokers can create their own adjustments" ON lease_adjustments;
DROP POLICY IF EXISTS "Brokers can update their own adjustments" ON lease_adjustments;
DROP POLICY IF EXISTS "Brokers can delete their own adjustments" ON lease_adjustments;

CREATE POLICY "Workspace can view adjustments" ON lease_adjustments FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert adjustments" ON lease_adjustments FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update adjustments" ON lease_adjustments FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete adjustments" ON lease_adjustments FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

-- =============================================
-- UPDATE RLS POLICIES: sales
-- =============================================
DROP POLICY IF EXISTS "Brokers can view their own sales" ON sales;
DROP POLICY IF EXISTS "Brokers can insert their own sales" ON sales;
DROP POLICY IF EXISTS "Brokers can update their own sales" ON sales;
DROP POLICY IF EXISTS "Brokers can delete their own sales" ON sales;

CREATE POLICY "Workspace can view sales" ON sales FOR SELECT
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can insert sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (broker_id = get_effective_broker_id(auth.uid()));

CREATE POLICY "Workspace can update sales" ON sales FOR UPDATE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));

CREATE POLICY "Workspace can delete sales" ON sales FOR DELETE
  TO authenticated USING (broker_id = ANY(get_workspace_user_ids(auth.uid())));
