
-- 1) Add is_super_admin to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Equipe SLOTIMOB. Acesso a painéis administrativos internos.';

-- 2) Create data_export_requests table
CREATE TABLE public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_owner_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'backup','migration','account_closure','legal_audit','lgpd_portability','other'
  )),
  request_note TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','in_preparation','ready','delivered','rejected','cancelled'
  )),
  admin_note TEXT,
  internal_note TEXT,
  delivery_file_path TEXT,
  delivery_file_size BIGINT,
  handled_by UUID REFERENCES auth.users(id),
  delivered_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_by TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  download_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_export_requests_status_expected
  ON public.data_export_requests(status, expected_by);

CREATE INDEX idx_export_requests_owner
  ON public.data_export_requests(organization_owner_id, requested_at DESC);

CREATE UNIQUE INDEX uq_export_requests_active_per_owner
  ON public.data_export_requests(organization_owner_id)
  WHERE status IN ('requested','in_preparation','ready');

-- 3) RLS
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own requests"
  ON public.data_export_requests FOR SELECT
  USING (auth.uid() = requested_by OR auth.uid() = organization_owner_id);

CREATE POLICY "Owner creates own requests"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND auth.uid() = organization_owner_id
  );

CREATE POLICY "Owner cancels own pending requests"
  ON public.data_export_requests FOR UPDATE
  USING (auth.uid() = organization_owner_id AND status = 'requested')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Super admin manages all"
  ON public.data_export_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 4) Private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-deliveries', 'client-deliveries', false, 5368709120)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service writes deliveries"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'client-deliveries');

-- 5) Download registration function
CREATE OR REPLACE FUNCTION public.register_export_download(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r data_export_requests;
BEGIN
  SELECT * INTO r FROM data_export_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF r.organization_owner_id <> auth.uid() AND
     NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  THEN RETURN false; END IF;
  IF r.status <> 'delivered' OR r.expires_at < now() THEN RETURN false; END IF;
  UPDATE data_export_requests
    SET last_downloaded_at = now(), download_count = download_count + 1
    WHERE id = p_request_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_export_download(UUID) TO authenticated;

-- 6) Audit trigger
CREATE OR REPLACE FUNCTION public.log_data_export_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'data_export_requested';
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, new_data, metadata)
    VALUES (NEW.organization_owner_id, auth.uid(), v_action, 'data_export_requests', NEW.id,
      jsonb_build_object('reason', NEW.reason, 'status', NEW.status),
      jsonb_build_object('request_id', NEW.id, 'reason', NEW.reason, 'organization_owner_id', NEW.organization_owner_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE NEW.status
      WHEN 'in_preparation' THEN 'data_export_in_preparation'
      WHEN 'delivered' THEN 'data_export_delivered'
      WHEN 'rejected' THEN 'data_export_rejected'
      WHEN 'cancelled' THEN 'data_export_cancelled'
      ELSE 'data_export_status_change'
    END;
    INSERT INTO public.audit_logs (broker_id, actor_user_id, action, table_name, record_id, old_data, new_data, metadata)
    VALUES (NEW.organization_owner_id, auth.uid(), v_action, 'data_export_requests', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      jsonb_build_object('request_id', NEW.id, 'reason', NEW.reason, 'organization_owner_id', NEW.organization_owner_id));
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_data_export_audit
  AFTER INSERT OR UPDATE ON public.data_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_data_export_change();
