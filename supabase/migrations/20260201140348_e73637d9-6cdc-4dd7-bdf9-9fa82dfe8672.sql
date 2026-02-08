-- Step 1: Add legacy tracking columns to contacts for data migration
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS legacy_owner_id uuid;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS legacy_lead_id uuid;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS legacy_company_id uuid;

-- Step 2: Migrate owners to contacts
INSERT INTO public.contacts (
  broker_id, name, email, phone, document_type, document_number,
  address, city, state, notes, categories, metadata, legacy_owner_id
)
SELECT 
  broker_id, name, email, phone, 
  CASE WHEN cpf_cnpj IS NOT NULL AND length(replace(cpf_cnpj, '.', '')) > 11 THEN 'CNPJ' ELSE 'CPF' END,
  cpf_cnpj,
  address, city, state, notes,
  ARRAY['Proprietário']::text[],
  '{}'::jsonb,
  id
FROM public.owners o
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts c WHERE c.legacy_owner_id = o.id
);

-- Step 3: Migrate leads to contacts
INSERT INTO public.contacts (
  broker_id, name, email, phone, document_type, document_number,
  address, city, state, notes, categories, metadata, legacy_lead_id
)
SELECT 
  broker_id, name, email, phone,
  CASE WHEN cpf_cnpj IS NOT NULL AND length(replace(cpf_cnpj, '.', '')) > 11 THEN 'CNPJ' ELSE 'CPF' END,
  cpf_cnpj,
  address, city, state, notes,
  ARRAY['Lead']::text[],
  jsonb_build_object(
    'budget_min', budget_min,
    'budget_max', budget_max,
    'interest_type', interest_type,
    'preferred_regions', preferred_regions,
    'origin', origin,
    'lead_type', lead_type,
    'utm_source', utm_source,
    'utm_medium', utm_medium,
    'utm_campaign', utm_campaign,
    'utm_term', utm_term,
    'utm_content', utm_content,
    'landing_page', landing_page,
    'referrer_url', referrer_url,
    'campaign_name', campaign_name
  ),
  id
FROM public.leads l
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts c WHERE c.legacy_lead_id = l.id
);

-- Step 4: Migrate companies to contacts
INSERT INTO public.contacts (
  broker_id, name, email, phone, document_type, document_number,
  address, city, state, notes, categories, metadata, legacy_company_id
)
SELECT 
  broker_id, name, email, phone,
  'CNPJ',
  cnpj,
  address, city, state, notes,
  ARRAY['Empresa']::text[],
  jsonb_build_object(
    'website', website,
    'contact_person', contact_person
  ),
  id
FROM public.companies co
WHERE NOT EXISTS (
  SELECT 1 FROM public.contacts c WHERE c.legacy_company_id = co.id
);

-- Step 5: Add new contact reference columns to units (keeping old ones for compatibility)
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS owner_contact_id uuid REFERENCES public.contacts(id);
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS tenant_contact_id uuid REFERENCES public.contacts(id);

-- Step 6: Update units with mapped contact IDs for owners
UPDATE public.units u
SET owner_contact_id = c.id
FROM public.contacts c
WHERE c.legacy_owner_id = u.owner_id AND u.owner_contact_id IS NULL;

-- Step 7: Update units with mapped contact IDs for tenants (from leads)
UPDATE public.units u
SET tenant_contact_id = c.id
FROM public.contacts c
WHERE c.legacy_lead_id = u.tenant_id AND u.tenant_contact_id IS NULL;

-- Step 8: Add contact_id to deals table for unified reference
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id);

-- Step 9: Update deals with mapped contact IDs
UPDATE public.deals d
SET contact_id = c.id
FROM public.contacts c
WHERE c.legacy_lead_id = d.lead_id AND d.contact_id IS NULL;

-- Step 10: Update financial_transactions with mapped contact IDs from leads
UPDATE public.financial_transactions ft
SET contact_id = c.id
FROM public.contacts c
WHERE c.legacy_lead_id = ft.lead_id AND ft.contact_id IS NULL;

-- Step 11: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_owner ON public.contacts(legacy_owner_id) WHERE legacy_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_lead ON public.contacts(legacy_lead_id) WHERE legacy_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_legacy_company ON public.contacts(legacy_company_id) WHERE legacy_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_categories ON public.contacts USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_units_owner_contact ON public.units(owner_contact_id) WHERE owner_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_tenant_contact ON public.units(tenant_contact_id) WHERE tenant_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id) WHERE contact_id IS NOT NULL;