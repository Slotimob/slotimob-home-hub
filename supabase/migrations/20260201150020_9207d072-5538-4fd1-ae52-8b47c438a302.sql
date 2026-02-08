-- =====================================================
-- MIGRAÇÃO: Consolidação de Contatos + Segurança SaaS
-- =====================================================

-- 1. MIGRAÇÃO DE DADOS: owners → contacts
INSERT INTO public.contacts (
  broker_id,
  name,
  email,
  phone,
  document_type,
  document_number,
  address,
  city,
  state,
  notes,
  categories,
  metadata,
  legacy_owner_id,
  assigned_user_id,
  created_at,
  updated_at
)
SELECT 
  o.broker_id,
  o.name,
  o.email,
  o.phone,
  CASE WHEN LENGTH(COALESCE(o.cpf_cnpj, '')) > 11 THEN 'CNPJ' ELSE 'CPF' END,
  o.cpf_cnpj,
  o.address,
  o.city,
  o.state,
  o.notes,
  ARRAY['Proprietário']::text[],
  '{}'::jsonb,
  o.id,
  o.broker_id,
  o.created_at,
  o.updated_at
FROM public.owners o
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts c WHERE c.legacy_owner_id = o.id
);

-- 2. MIGRAÇÃO DE DADOS: leads → contacts
INSERT INTO public.contacts (
  broker_id,
  name,
  email,
  phone,
  document_type,
  document_number,
  address,
  city,
  state,
  notes,
  categories,
  metadata,
  legacy_lead_id,
  assigned_user_id,
  created_at,
  updated_at
)
SELECT 
  l.broker_id,
  l.name,
  l.email,
  l.phone,
  CASE WHEN LENGTH(COALESCE(l.cpf_cnpj, '')) > 11 THEN 'CNPJ' ELSE 'CPF' END,
  l.cpf_cnpj,
  l.address,
  l.city,
  l.state,
  l.notes,
  ARRAY['Lead']::text[],
  jsonb_build_object(
    'budget_min', l.budget_min,
    'budget_max', l.budget_max,
    'origin', l.origin,
    'interest_type', l.interest_type,
    'preferred_regions', l.preferred_regions,
    'lead_type', l.lead_type,
    'campaign_name', l.campaign_name,
    'utm_source', l.utm_source,
    'utm_medium', l.utm_medium,
    'utm_campaign', l.utm_campaign
  ),
  l.id,
  l.broker_id,
  l.created_at,
  l.updated_at
FROM public.leads l
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts c WHERE c.legacy_lead_id = l.id
);

-- 3. MIGRAÇÃO DE DADOS: companies → contacts
INSERT INTO public.contacts (
  broker_id,
  name,
  email,
  phone,
  document_type,
  document_number,
  address,
  city,
  state,
  notes,
  categories,
  metadata,
  legacy_company_id,
  assigned_user_id,
  created_at,
  updated_at
)
SELECT 
  c.broker_id,
  c.name,
  c.email,
  c.phone,
  'CNPJ',
  c.cnpj,
  c.address,
  c.city,
  c.state,
  c.notes,
  ARRAY['Empresa']::text[],
  jsonb_build_object(
    'website', c.website,
    'contact_person', c.contact_person
  ),
  c.id,
  c.broker_id,
  c.created_at,
  c.updated_at
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts ct WHERE ct.legacy_company_id = c.id
);

-- 4. ATUALIZAR REFERÊNCIAS: units.owner_id → units.owner_contact_id
UPDATE public.units u
SET owner_contact_id = (
  SELECT c.id FROM public.contacts c WHERE c.legacy_owner_id = u.owner_id
)
WHERE u.owner_id IS NOT NULL AND u.owner_contact_id IS NULL;

-- 5. ATUALIZAR REFERÊNCIAS: units.tenant_id → units.tenant_contact_id
UPDATE public.units u
SET tenant_contact_id = (
  SELECT c.id FROM public.contacts c WHERE c.legacy_lead_id = u.tenant_id
)
WHERE u.tenant_id IS NOT NULL AND u.tenant_contact_id IS NULL;

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_contacts_broker_id ON public.contacts(broker_id);
CREATE INDEX IF NOT EXISTS idx_contacts_categories ON public.contacts USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_owner ON public.contacts(legacy_owner_id) WHERE legacy_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_lead ON public.contacts(legacy_lead_id) WHERE legacy_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_company ON public.contacts(legacy_company_id) WHERE legacy_company_id IS NOT NULL;

-- 7. RLS: Garantir que contacts tem políticas corretas (drop + recreate para consistência)
DROP POLICY IF EXISTS "Brokers can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Brokers can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Brokers can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Brokers can delete their own contacts" ON public.contacts;

CREATE POLICY "Brokers can view their own contacts" 
ON public.contacts FOR SELECT 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own contacts" 
ON public.contacts FOR INSERT 
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own contacts" 
ON public.contacts FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own contacts" 
ON public.contacts FOR DELETE 
USING (auth.uid() = broker_id);

-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN public.contacts.broker_id IS 'ID da Organização Master (multi-tenancy)';
COMMENT ON COLUMN public.contacts.assigned_user_id IS 'ID do Corretor/Usuário responsável pelo registro';
COMMENT ON COLUMN public.contacts.categories IS 'Papéis do contato: Proprietário, Lead, Inquilino, Empresa, Fornecedor, Fiador';
COMMENT ON COLUMN public.contacts.metadata IS 'Dados específicos por categoria (dados bancários, interesses, etc)';