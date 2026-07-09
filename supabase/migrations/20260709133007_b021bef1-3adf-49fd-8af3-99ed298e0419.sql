-- Drop old policies
DROP POLICY IF EXISTS "Brokers can view public templates or their own" ON public.contract_templates;
DROP POLICY IF EXISTS "Brokers can insert their own templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Brokers can update their own templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Brokers can delete their own templates" ON public.contract_templates;

-- Recreate with workspace-aware helper
CREATE POLICY "Workspace can view templates"
  ON public.contract_templates
  FOR SELECT
  USING (
    is_public = true
    OR public.can_write_as_broker(auth.uid(), broker_id)
  );

CREATE POLICY "Workspace can insert templates"
  ON public.contract_templates
  FOR INSERT
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Workspace can update templates"
  ON public.contract_templates
  FOR UPDATE
  USING (public.can_write_as_broker(auth.uid(), broker_id))
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Workspace can delete templates"
  ON public.contract_templates
  FOR DELETE
  USING (public.can_write_as_broker(auth.uid(), broker_id));