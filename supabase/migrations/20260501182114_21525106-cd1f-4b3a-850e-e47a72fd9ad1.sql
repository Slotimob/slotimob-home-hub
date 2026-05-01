
-- A) Functional indexes for metadata property_id and unit_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_property
  ON public.audit_logs ((metadata->>'property_id'))
  WHERE metadata ? 'property_id';

CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_unit
  ON public.audit_logs ((metadata->>'unit_id'))
  WHERE metadata ? 'unit_id';

-- B) Enrichment trigger for leases
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leases') THEN
    -- Create the function
    CREATE OR REPLACE FUNCTION public.log_lease_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
    AS $fn$
    BEGIN
      INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, new_data, metadata)
      VALUES (
        COALESCE(auth.uid(), COALESCE(NEW.broker_id, OLD.broker_id)),
        TG_OP,
        'leases',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        jsonb_build_object(
          'property_id', COALESCE(NEW.property_id, OLD.property_id),
          'unit_id', COALESCE(NEW.unit_id, OLD.unit_id)
        )
      );
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;

    -- Drop if exists to be idempotent, then create
    DROP TRIGGER IF EXISTS audit_lease_enriched ON public.leases;
    CREATE TRIGGER audit_lease_enriched
      AFTER INSERT OR UPDATE OR DELETE ON public.leases
      FOR EACH ROW EXECUTE FUNCTION public.log_lease_audit();
  END IF;
END $$;

-- C) Enrichment trigger for visits (adds property_id/unit_id to metadata)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') THEN
    CREATE OR REPLACE FUNCTION public.log_visit_audit_enriched()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
    AS $fn$
    DECLARE
      v_meta jsonb;
    BEGIN
      v_meta := '{}'::jsonb;
      -- Check if property_id column exists
      IF TG_OP != 'DELETE' AND NEW IS NOT NULL THEN
        BEGIN
          v_meta := v_meta || jsonb_build_object('property_id', NEW.property_id);
        EXCEPTION WHEN undefined_column THEN NULL;
        END;
        BEGIN
          v_meta := v_meta || jsonb_build_object('unit_id', NEW.unit_id);
        EXCEPTION WHEN undefined_column THEN NULL;
        END;
      ELSIF OLD IS NOT NULL THEN
        BEGIN
          v_meta := v_meta || jsonb_build_object('property_id', OLD.property_id);
        EXCEPTION WHEN undefined_column THEN NULL;
        END;
        BEGIN
          v_meta := v_meta || jsonb_build_object('unit_id', OLD.unit_id);
        EXCEPTION WHEN undefined_column THEN NULL;
        END;
      END IF;

      INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, new_data, metadata)
      VALUES (
        COALESCE(auth.uid(), COALESCE(NEW.broker_id, OLD.broker_id)),
        TG_OP,
        'visits',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        v_meta
      );
      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;

    DROP TRIGGER IF EXISTS audit_visit_enriched ON public.visits;
    CREATE TRIGGER audit_visit_enriched
      AFTER INSERT OR UPDATE OR DELETE ON public.visits
      FOR EACH ROW EXECUTE FUNCTION public.log_visit_audit_enriched();
  END IF;
END $$;
