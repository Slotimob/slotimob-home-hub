
-- ================================================================
-- STEP 1: Generic enriched audit function
-- ================================================================
CREATE OR REPLACE FUNCTION public.log_audit_with_asset_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_unit_id     uuid;
  v_deal_id     uuid;
  v_lead_id     uuid;
  v_record      jsonb;
BEGIN
  v_record := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  v_property_id := NULLIF(v_record->>'property_id','')::uuid;
  v_unit_id     := NULLIF(v_record->>'unit_id','')::uuid;
  v_deal_id     := NULLIF(v_record->>'deal_id','')::uuid;
  v_lead_id     := NULLIF(v_record->>'lead_id','')::uuid;

  IF v_deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id),
           COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id
      FROM public.deals d
     WHERE d.id = v_deal_id;
  END IF;

  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id
      FROM public.units u WHERE u.id = v_unit_id;
  END IF;

  IF v_property_id IS NULL AND v_unit_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (
    broker_id, action, table_name, record_id, old_data, new_data, metadata
  ) VALUES (
    COALESCE(auth.uid(),
             NULLIF(v_record->>'broker_id','')::uuid),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id',     v_unit_id,
      'deal_id',     v_deal_id,
      'lead_id',     v_lead_id
    ))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ================================================================
-- STEP 2: Generic triggers on new tables
-- ================================================================
DROP TRIGGER IF EXISTS audit_proposals ON public.proposals;
CREATE TRIGGER audit_proposals
  AFTER INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

DROP TRIGGER IF EXISTS audit_financial_transactions ON public.financial_transactions;
CREATE TRIGGER audit_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

DROP TRIGGER IF EXISTS audit_deal_activities ON public.deal_activities;
CREATE TRIGGER audit_deal_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_activities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

DROP TRIGGER IF EXISTS audit_schedule_activities ON public.schedule_activities;
CREATE TRIGGER audit_schedule_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.schedule_activities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

-- Note: leases already has log_lease_audit trigger. We add a NEW trigger
-- name so both coexist (the existing one + this enriched one).
-- Actually the existing log_lease_audit already writes to audit_logs with metadata.
-- We should NOT double-write for leases generic. Skip generic for leases.
-- The milestone triggers below will handle lease-specific events.

-- ================================================================
-- STEP 3: Milestone triggers
-- ================================================================

-- 3.1 proposal_sent
CREATE OR REPLACE FUNCTION public.log_proposal_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_unit_id     uuid;
BEGIN
  v_property_id := NEW.property_id;
  v_unit_id     := NEW.unit_id;

  IF NEW.deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id),
           COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id
      FROM public.deals d WHERE d.id = NEW.deal_id;
  END IF;

  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = v_unit_id;
  END IF;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'proposal_sent',
    'proposals',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'status', NEW.status),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', v_unit_id,
      'lead_name', NEW.lead_name
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_sent ON public.proposals;
CREATE TRIGGER trg_proposal_sent
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'sent')
  EXECUTE FUNCTION public.log_proposal_sent();

-- 3.2 lease_signed
CREATE OR REPLACE FUNCTION public.log_lease_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
BEGIN
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'lease_signed',
    'leases',
    NEW.id,
    jsonb_build_object('status', NEW.status, 'rent_amount', NEW.rent_amount),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', NEW.unit_id,
      'tenant_contact_id', NEW.tenant_contact_id,
      'start_date', NEW.start_date
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lease_signed ON public.leases;
CREATE TRIGGER trg_lease_signed
  AFTER INSERT OR UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lease_signed();
-- The function itself checks the condition:

-- Actually let's use a simpler approach with WHEN clause for UPDATE,
-- but for INSERT we need to check inside the function.
-- Let's replace with the function checking internally.

CREATE OR REPLACE FUNCTION public.log_lease_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_should_log boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    v_should_log := true;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN
    v_should_log := true;
  END IF;

  IF NOT v_should_log THEN
    RETURN NEW;
  END IF;

  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'lease_signed',
    'leases',
    NEW.id,
    jsonb_build_object('status', NEW.status, 'rent_amount', NEW.rent_amount),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', NEW.unit_id,
      'tenant_contact_id', NEW.tenant_contact_id,
      'start_date', NEW.start_date
    ))
  );
  RETURN NEW;
END;
$$;

-- 3.3 lease_rent_adjusted
CREATE OR REPLACE FUNCTION public.log_lease_rent_adjusted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_pct numeric;
BEGIN
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;

  v_pct := CASE WHEN OLD.rent_amount IS NOT NULL AND OLD.rent_amount > 0
    THEN ROUND(((NEW.rent_amount - OLD.rent_amount) / OLD.rent_amount) * 100, 2)
    ELSE NULL END;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'lease_rent_adjusted',
    'leases',
    NEW.id,
    jsonb_build_object('rent_amount', OLD.rent_amount),
    jsonb_build_object('rent_amount', NEW.rent_amount),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', NEW.unit_id,
      'old_amount', OLD.rent_amount,
      'new_amount', NEW.rent_amount,
      'adjustment_pct', v_pct
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lease_rent_adjusted ON public.leases;
CREATE TRIGGER trg_lease_rent_adjusted
  AFTER UPDATE ON public.leases
  FOR EACH ROW
  WHEN (OLD.rent_amount IS DISTINCT FROM NEW.rent_amount)
  EXECUTE FUNCTION public.log_lease_rent_adjusted();

-- 3.4 visit_completed
CREATE OR REPLACE FUNCTION public.log_visit_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
BEGIN
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'visit_completed',
    'visits',
    NEW.id,
    jsonb_build_object('status', NEW.status, 'title', NEW.title),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', NEW.unit_id,
      'lead_id', NEW.lead_id,
      'scheduled_at', NEW.scheduled_date,
      'duration_minutes', NEW.duration_minutes
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_completed ON public.visits;
CREATE TRIGGER trg_visit_completed
  AFTER UPDATE ON public.visits
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION public.log_visit_completed();

-- 3.5 billing_issued
CREATE OR REPLACE FUNCTION public.log_billing_issued()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_unit_id     uuid;
BEGIN
  v_property_id := NEW.property_id;
  v_unit_id     := NEW.unit_id;

  IF NEW.deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id),
           COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id
      FROM public.deals d WHERE d.id = NEW.deal_id;
  END IF;

  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = v_unit_id;
  END IF;

  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.broker_id),
    'billing_issued',
    'financial_transactions',
    NEW.id,
    jsonb_build_object('amount', NEW.amount, 'description', NEW.description, 'due_date', NEW.due_date),
    jsonb_strip_nulls(jsonb_build_object(
      'property_id', v_property_id,
      'unit_id', v_unit_id,
      'deal_id', NEW.deal_id,
      'amount', NEW.amount,
      'due_date', NEW.due_date,
      'description', NEW.description
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_issued ON public.financial_transactions;
CREATE TRIGGER trg_billing_issued
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW
  WHEN (NEW.type = 'income' AND NEW.status IN ('pending','paid'))
  EXECUTE FUNCTION public.log_billing_issued();
