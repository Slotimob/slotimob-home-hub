
-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.audit_diff(old_row jsonb, new_row jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(new_row)
  WHERE key NOT IN ('updated_at', 'search_vector')
    AND (old_row->key IS DISTINCT FROM value);
$$;

CREATE OR REPLACE FUNCTION public.can_view_audit_log(p_viewer_id uuid, p_broker_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_viewer_id = p_broker_id
    OR EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_owner_id = p_viewer_id
        AND user_id = p_broker_id
        AND is_active = true
    );
$$;

-- 2. Create partitioned table
CREATE TABLE public.audit_logs_partitioned (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  broker_id uuid,
  actor_user_id uuid,
  action text,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE public.audit_logs_default PARTITION OF public.audit_logs_partitioned DEFAULT;
CREATE TABLE public.audit_logs_2026_05 PARTITION OF public.audit_logs_partitioned FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.audit_logs_2026_06 PARTITION OF public.audit_logs_partitioned FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.audit_logs_2026_07 PARTITION OF public.audit_logs_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- 3. Copy data
INSERT INTO public.audit_logs_partitioned (id, broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata, created_at)
SELECT id, broker_id, broker_id, action, table_name, record_id, old_data, new_data, metadata, created_at
FROM public.audit_logs;

-- 4. Rename old table and its indexes
ALTER TABLE public.audit_logs RENAME TO audit_logs_legacy;
ALTER INDEX audit_logs_pkey RENAME TO audit_logs_legacy_pkey;
ALTER INDEX idx_audit_logs_broker_id RENAME TO idx_legacy_al_broker_id;
ALTER INDEX idx_audit_logs_table_name RENAME TO idx_legacy_al_table_name;
ALTER INDEX idx_audit_logs_created_at RENAME TO idx_legacy_al_created_at;
ALTER INDEX idx_audit_logs_action RENAME TO idx_legacy_al_action;
ALTER INDEX idx_audit_logs_metadata_property RENAME TO idx_legacy_al_meta_property;
ALTER INDEX idx_audit_logs_metadata_unit RENAME TO idx_legacy_al_meta_unit;

-- Rename partitioned table
ALTER TABLE public.audit_logs_partitioned RENAME TO audit_logs;

-- 5. Indexes on new table
CREATE INDEX idx_audit_logs_broker_created ON public.audit_logs (broker_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_created ON public.audit_logs (table_name, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_property_id ON public.audit_logs ((metadata->>'property_id')) WHERE metadata ? 'property_id';
CREATE INDEX idx_audit_logs_unit_id ON public.audit_logs ((metadata->>'unit_id')) WHERE metadata ? 'unit_id';
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_user_id, created_at DESC);

-- 6. Grants
GRANT SELECT, INSERT ON public.audit_logs TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON public.audit_logs_default TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON public.audit_logs_2026_05 TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON public.audit_logs_2026_06 TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON public.audit_logs_2026_07 TO authenticated, anon, service_role;

-- 7. RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.can_view_audit_log(auth.uid(), broker_id));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 8. Updated trigger functions (diff + actor_user_id)
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb; v_new jsonb; v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF TG_OP = 'UPDATE' THEN
    v_old := public.audit_diff(to_jsonb(NEW), to_jsonb(OLD));
    v_new := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF v_new = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD);
  ELSE v_new := to_jsonb(NEW); END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data)
  VALUES (COALESCE(v_actor, CASE WHEN TG_OP='DELETE' THEN OLD.broker_id ELSE NEW.broker_id END),
    v_actor, TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_with_asset_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_property_id uuid; v_unit_id uuid; v_deal_id uuid; v_lead_id uuid;
  v_record jsonb; v_old jsonb; v_new jsonb; v_actor uuid;
BEGIN
  v_actor := auth.uid();
  v_record := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_property_id := NULLIF(v_record->>'property_id','')::uuid;
  v_unit_id := NULLIF(v_record->>'unit_id','')::uuid;
  v_deal_id := NULLIF(v_record->>'deal_id','')::uuid;
  v_lead_id := NULLIF(v_record->>'lead_id','')::uuid;
  IF v_deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id), COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id FROM public.deals d WHERE d.id = v_deal_id;
  END IF;
  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = v_unit_id;
  END IF;
  IF v_property_id IS NULL AND v_unit_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'UPDATE' THEN
    v_old := public.audit_diff(to_jsonb(NEW), to_jsonb(OLD));
    v_new := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF v_new = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD);
  ELSE v_new := to_jsonb(NEW); END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (COALESCE(v_actor, NULLIF(v_record->>'broker_id','')::uuid), v_actor,
    TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_old, v_new,
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', v_unit_id, 'deal_id', v_deal_id, 'lead_id', v_lead_id)));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage OR OLD.custom_stage_id IS DISTINCT FROM NEW.custom_stage_id THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
    VALUES (NEW.broker_id, auth.uid(), 'deal_stage_change', 'deals', NEW.id,
      jsonb_build_object('stage', OLD.stage, 'custom_stage_id', OLD.custom_stage_id),
      jsonb_build_object('stage', NEW.stage, 'custom_stage_id', NEW.custom_stage_id),
      jsonb_build_object('lead_id', NEW.lead_id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
    VALUES (NEW.broker_id, auth.uid(), 'document_created', 'documents', NEW.id,
      jsonb_build_object('title', NEW.title, 'document_type', NEW.document_type, 'file_path', NEW.file_path),
      jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id, 'unit_id', NEW.unit_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
    VALUES (NEW.broker_id, auth.uid(), 'document_updated', 'documents', NEW.id,
      jsonb_build_object('title', OLD.title, 'version', OLD.version),
      jsonb_build_object('title', NEW.title, 'version', NEW.version),
      jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, metadata)
    VALUES (OLD.broker_id, auth.uid(), 'document_deleted', 'documents', OLD.id,
      jsonb_build_object('title', OLD.title, 'document_type', OLD.document_type),
      jsonb_build_object('deal_id', OLD.deal_id, 'lead_id', OLD.lead_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_property_document_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
    VALUES (NEW.broker_id, auth.uid(), 'property_document_created', 'property_documents', NEW.id,
      jsonb_build_object('title', NEW.title, 'file_path', NEW.file_path),
      jsonb_build_object('property_id', NEW.property_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, metadata)
    VALUES (OLD.broker_id, auth.uid(), 'property_document_deleted', 'property_documents', OLD.id,
      jsonb_build_object('title', OLD.title), jsonb_build_object('property_id', OLD.property_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_sale_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
  VALUES (NEW.broker_id, auth.uid(), 'sale_recorded', 'sales', NEW.id,
    jsonb_build_object('sale_value', NEW.sale_value, 'commission_value', NEW.commission_value),
    jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id, 'property_id', NEW.property_id, 'unit_id', NEW.unit_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_proposal_sent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_property_id uuid; v_unit_id uuid;
BEGIN
  v_property_id := NEW.property_id; v_unit_id := NEW.unit_id;
  IF NEW.deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id), COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id FROM public.deals d WHERE d.id = NEW.deal_id;
  END IF;
  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = v_unit_id;
  END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
  VALUES (COALESCE(auth.uid(), NEW.broker_id), auth.uid(), 'proposal_sent', 'proposals', NEW.id,
    jsonb_build_object('title', NEW.title, 'status', NEW.status),
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', v_unit_id, 'lead_name', NEW.lead_name)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lease_signed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_property_id uuid; v_should_log boolean := false;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN v_should_log := true;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN v_should_log := true;
  END IF;
  IF NOT v_should_log THEN RETURN NEW; END IF;
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
  VALUES (COALESCE(auth.uid(), NEW.broker_id), auth.uid(), 'lease_signed', 'leases', NEW.id,
    jsonb_build_object('status', NEW.status, 'rent_amount', NEW.rent_amount),
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', NEW.unit_id, 'tenant_contact_id', NEW.tenant_contact_id, 'start_date', NEW.start_date)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lease_rent_adjusted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_property_id uuid; v_pct numeric;
BEGIN
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;
  v_pct := CASE WHEN OLD.rent_amount > 0
    THEN ROUND(((NEW.rent_amount - OLD.rent_amount) / OLD.rent_amount) * 100, 2) ELSE NULL END;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (COALESCE(auth.uid(), NEW.broker_id), auth.uid(), 'lease_rent_adjusted', 'leases', NEW.id,
    jsonb_build_object('rent_amount', OLD.rent_amount), jsonb_build_object('rent_amount', NEW.rent_amount),
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', NEW.unit_id, 'old_amount', OLD.rent_amount, 'new_amount', NEW.rent_amount, 'adjustment_pct', v_pct)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lease_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb; v_new jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := public.audit_diff(to_jsonb(NEW), to_jsonb(OLD));
    v_new := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF v_new = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD);
  ELSE v_new := to_jsonb(NEW); END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (COALESCE(auth.uid(), COALESCE(NEW.broker_id, OLD.broker_id)), auth.uid(),
    TG_OP, 'leases', COALESCE(NEW.id, OLD.id), v_old, v_new,
    jsonb_build_object('property_id', COALESCE(NEW.property_id, OLD.property_id), 'unit_id', COALESCE(NEW.unit_id, OLD.unit_id)));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_visit_audit_enriched()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_meta jsonb; v_old jsonb; v_new jsonb;
BEGIN
  v_meta := '{}'::jsonb;
  IF TG_OP != 'DELETE' AND NEW IS NOT NULL THEN
    BEGIN v_meta := v_meta || jsonb_build_object('property_id', NEW.property_id); EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN v_meta := v_meta || jsonb_build_object('unit_id', NEW.unit_id); EXCEPTION WHEN undefined_column THEN NULL; END;
  ELSIF OLD IS NOT NULL THEN
    BEGIN v_meta := v_meta || jsonb_build_object('property_id', OLD.property_id); EXCEPTION WHEN undefined_column THEN NULL; END;
    BEGIN v_meta := v_meta || jsonb_build_object('unit_id', OLD.unit_id); EXCEPTION WHEN undefined_column THEN NULL; END;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    v_old := public.audit_diff(to_jsonb(NEW), to_jsonb(OLD));
    v_new := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF v_new = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'DELETE' THEN v_old := to_jsonb(OLD);
  ELSE v_new := to_jsonb(NEW); END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
  VALUES (COALESCE(auth.uid(), COALESCE(NEW.broker_id, OLD.broker_id)), auth.uid(),
    TG_OP, 'visits', COALESCE(NEW.id, OLD.id), v_old, v_new, v_meta);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_visit_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_property_id uuid;
BEGIN
  v_property_id := NEW.property_id;
  IF NEW.unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = NEW.unit_id;
  END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
  VALUES (COALESCE(auth.uid(), NEW.broker_id), auth.uid(), 'visit_completed', 'visits', NEW.id,
    jsonb_build_object('status', NEW.status, 'title', NEW.title),
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', NEW.unit_id, 'lead_id', NEW.lead_id, 'scheduled_at', NEW.scheduled_date, 'duration_minutes', NEW.duration_minutes)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_billing_issued()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_property_id uuid; v_unit_id uuid;
BEGIN
  v_property_id := NEW.property_id; v_unit_id := NEW.unit_id;
  IF NEW.deal_id IS NOT NULL AND (v_property_id IS NULL OR v_unit_id IS NULL) THEN
    SELECT COALESCE(v_property_id, d.property_id), COALESCE(v_unit_id, d.unit_id)
      INTO v_property_id, v_unit_id FROM public.deals d WHERE d.id = NEW.deal_id;
  END IF;
  IF v_unit_id IS NOT NULL AND v_property_id IS NULL THEN
    SELECT u.property_id INTO v_property_id FROM public.units u WHERE u.id = v_unit_id;
  END IF;
  INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
  VALUES (COALESCE(auth.uid(), NEW.broker_id), auth.uid(), 'billing_issued', 'financial_transactions', NEW.id,
    jsonb_build_object('amount', NEW.amount, 'description', NEW.description, 'due_date', NEW.due_date),
    jsonb_strip_nulls(jsonb_build_object('property_id', v_property_id, 'unit_id', v_unit_id, 'deal_id', NEW.deal_id, 'amount', NEW.amount, 'due_date', NEW.due_date, 'description', NEW.description)));
  RETURN NEW;
END;
$$;

-- 9. Cockpit function with actor_user_id
CREATE OR REPLACE FUNCTION public.get_user_audit_logs(p_target_user_id uuid, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(logs)::jsonb), '[]'::jsonb)
    FROM (
      SELECT id, action, table_name, record_id, old_data, new_data, metadata, created_at, actor_user_id
      FROM audit_logs WHERE broker_id = p_target_user_id
      ORDER BY created_at DESC LIMIT p_limit
    ) logs
  );
END;
$$;

-- 10. Partition maintenance function
CREATE OR REPLACE FUNCTION public.maintain_audit_partitions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_month date; v_next date; v_name text;
BEGIN
  FOR i IN 0..2 LOOP
    v_month := date_trunc('month', current_date + (i || ' months')::interval)::date;
    v_next := (v_month + interval '1 month')::date;
    v_name := 'audit_logs_' || to_char(v_month, 'YYYY_MM');
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_name) THEN
      EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.audit_logs FOR VALUES FROM (%L) TO (%L)', v_name, v_month, v_next);
      EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated, anon, service_role', v_name);
    END IF;
  END LOOP;
  FOR v_name IN
    SELECT c.relname FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'audit_logs' AND c.relname ~ '^audit_logs_\d{4}_\d{2}$'
  LOOP
    v_month := to_date(substring(v_name from 'audit_logs_(\d{4}_\d{2})'), 'YYYY_MM');
    IF v_month + interval '1 month' < current_date - interval '90 days' THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I', v_name);
    END IF;
  END LOOP;
END;
$$;
