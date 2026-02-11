
-- Table: organization_members
-- Stores team members with granular JSONB permissions per module
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL DEFAULT 'Agente',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_owner_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Only the organization owner can manage members
CREATE POLICY "Owner can manage members"
  ON public.organization_members FOR ALL
  USING (auth.uid() = organization_owner_id)
  WITH CHECK (auth.uid() = organization_owner_id);

-- Members can read their own membership
CREATE POLICY "Members can read own membership"
  ON public.organization_members FOR SELECT
  USING (auth.uid() = user_id);

-- Table: role_templates
-- Predefined permission templates (Corretor, Supervisor Financeiro, etc.)
CREATE TABLE public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read system templates; owners can read their own
CREATE POLICY "Read templates"
  ON public.role_templates FOR SELECT
  USING (is_system = true OR auth.uid() = broker_id);

CREATE POLICY "Owner manages custom templates"
  ON public.role_templates FOR ALL
  USING (auth.uid() = broker_id AND is_system = false)
  WITH CHECK (auth.uid() = broker_id AND is_system = false);

-- Trigger for updated_at
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_templates_updated_at
  BEFORE UPDATE ON public.role_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert system templates
INSERT INTO public.role_templates (name, description, permissions, is_system) VALUES
(
  'Corretor',
  'Acesso básico a CRM e visualização de ativos',
  '{"assets":{"read":true,"create":false,"edit":false,"delete":false,"manage":false},"crm":{"read":true,"read_all":false,"move_pipeline":true,"delete":false},"financial":{"read":false,"create":false,"dre":false,"reconciliation":false},"documents":{"generate":false,"read":false,"delete":false}}'::jsonb,
  true
),
(
  'Supervisor Financeiro',
  'Acesso completo ao módulo financeiro e visualização geral',
  '{"assets":{"read":true,"create":false,"edit":false,"delete":false,"manage":false},"crm":{"read":true,"read_all":true,"move_pipeline":false,"delete":false},"financial":{"read":true,"create":true,"dre":true,"reconciliation":true},"documents":{"generate":true,"read":true,"delete":false}}'::jsonb,
  true
),
(
  'Gerente',
  'Acesso amplo a todos os módulos sem exclusão',
  '{"assets":{"read":true,"create":true,"edit":true,"delete":false,"manage":true},"crm":{"read":true,"read_all":true,"move_pipeline":true,"delete":false},"financial":{"read":true,"create":true,"dre":true,"reconciliation":true},"documents":{"generate":true,"read":true,"delete":false}}'::jsonb,
  true
),
(
  'Administrador',
  'Acesso total a todos os módulos',
  '{"assets":{"read":true,"create":true,"edit":true,"delete":true,"manage":true},"crm":{"read":true,"read_all":true,"move_pipeline":true,"delete":true},"financial":{"read":true,"create":true,"dre":true,"reconciliation":true},"documents":{"generate":true,"read":true,"delete":true}}'::jsonb,
  true
);

-- Security definer function for permission checks in RLS/edge functions
CREATE OR REPLACE FUNCTION public.check_member_permission(
  _user_id UUID,
  _module TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND is_active = true
      AND (permissions -> _module ->> _action)::boolean = true
  )
$$;
