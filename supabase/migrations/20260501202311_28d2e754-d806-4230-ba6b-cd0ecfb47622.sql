
-- ============================================================
-- Tabela approval_thresholds
-- ============================================================
CREATE TABLE public.approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  threshold INT NOT NULL CHECK (threshold > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  approval_validity_hours INT NOT NULL DEFAULT 24 CHECK (approval_validity_hours BETWEEN 1 AND 168),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_owner_id, action_type)
);

ALTER TABLE public.approval_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages thresholds"
  ON public.approval_thresholds FOR ALL
  USING (auth.uid() = organization_owner_id)
  WITH CHECK (auth.uid() = organization_owner_id);

CREATE POLICY "Members read thresholds"
  ON public.approval_thresholds FOR SELECT
  USING (
    organization_owner_id IN (
      SELECT om.organization_owner_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

CREATE TRIGGER update_approval_thresholds_updated_at
  BEFORE UPDATE ON public.approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Tabela approval_requests
-- ============================================================
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  item_count INT NOT NULL CHECK (item_count > 0),
  target_table TEXT,
  target_ids UUID[] DEFAULT '{}',
  parameters JSONB DEFAULT '{}'::jsonb,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','consumed')),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_requests_owner_status
  ON public.approval_requests(organization_owner_id, status, created_at DESC);
CREATE INDEX idx_approval_requests_requester
  ON public.approval_requests(requested_by, status);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester sees own requests"
  ON public.approval_requests FOR SELECT
  USING (auth.uid() = requested_by);

CREATE POLICY "Owner sees workspace requests"
  ON public.approval_requests FOR SELECT
  USING (auth.uid() = organization_owner_id);

CREATE POLICY "Requester creates request"
  ON public.approval_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Owner decides request"
  ON public.approval_requests FOR UPDATE
  USING (auth.uid() = organization_owner_id)
  WITH CHECK (auth.uid() = organization_owner_id);

-- ============================================================
-- Função consume_approval (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_approval(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r approval_requests;
  v_validity_hours int;
BEGIN
  SELECT * INTO r FROM approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF r.requested_by <> auth.uid() THEN RETURN false; END IF;
  IF r.status <> 'approved' THEN RETURN false; END IF;

  SELECT approval_validity_hours INTO v_validity_hours
  FROM approval_thresholds
  WHERE organization_owner_id = r.organization_owner_id
    AND action_type = r.action_type
  LIMIT 1;

  v_validity_hours := COALESCE(v_validity_hours, 24);

  IF r.decided_at + make_interval(hours := v_validity_hours) < now() THEN
    UPDATE approval_requests SET status = 'expired' WHERE id = p_request_id;
    RETURN false;
  END IF;

  UPDATE approval_requests
    SET status = 'consumed', consumed_at = now()
    WHERE id = p_request_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_approval(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_approval(UUID) TO authenticated;

-- ============================================================
-- Seed: popular thresholds para owners existentes que têm membros
-- ============================================================
DO $$
DECLARE
  v_owner_id uuid;
  v_defaults text[][] := ARRAY[
    ARRAY['bulk_delete','5'],
    ARRAY['bulk_update','10'],
    ARRAY['bulk_import','100'],
    ARRAY['bulk_export','50'],
    ARRAY['bulk_message_send','10'],
    ARRAY['bulk_billing_create','10'],
    ARRAY['bulk_status_change','20'],
    ARRAY['bulk_assignment_transfer','10'],
    ARRAY['bulk_document_delete','5'],
    ARRAY['bulk_lease_termination','3']
  ];
  i int;
BEGIN
  FOR v_owner_id IN
    SELECT DISTINCT organization_owner_id FROM public.organization_members WHERE is_active = true
  LOOP
    FOR i IN 1..array_length(v_defaults, 1) LOOP
      INSERT INTO public.approval_thresholds (organization_owner_id, action_type, threshold)
      VALUES (v_owner_id, v_defaults[i][1], v_defaults[i][2]::int)
      ON CONFLICT (organization_owner_id, action_type) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================
-- Trigger: auto-seed thresholds when first member is added
-- ============================================================
CREATE OR REPLACE FUNCTION public.seed_approval_thresholds_for_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_defaults text[][] := ARRAY[
    ARRAY['bulk_delete','5'],
    ARRAY['bulk_update','10'],
    ARRAY['bulk_import','100'],
    ARRAY['bulk_export','50'],
    ARRAY['bulk_message_send','10'],
    ARRAY['bulk_billing_create','10'],
    ARRAY['bulk_status_change','20'],
    ARRAY['bulk_assignment_transfer','10'],
    ARRAY['bulk_document_delete','5'],
    ARRAY['bulk_lease_termination','3']
  ];
  i int;
BEGIN
  IF NEW.is_active = true THEN
    FOR i IN 1..array_length(v_defaults, 1) LOOP
      INSERT INTO public.approval_thresholds (organization_owner_id, action_type, threshold)
      VALUES (NEW.organization_owner_id, v_defaults[i][1], v_defaults[i][2]::int)
      ON CONFLICT (organization_owner_id, action_type) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_approval_thresholds
  AFTER INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_approval_thresholds_for_owner();
