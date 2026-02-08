-- =============================================
-- FASE 1: Criar tabelas de Proprietários e Empresas
-- =============================================

-- Tabela de proprietários
CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  website TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FASE 2: Adicionar novos campos na tabela units
-- =============================================

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS is_financeable BOOLEAN DEFAULT true;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS has_no_registration BOOLEAN DEFAULT false;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS iptu_number TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS parking_spots INTEGER DEFAULT 0;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS furnished TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS solar_orientation TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.owners(id) ON DELETE SET NULL;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN DEFAULT false;

-- =============================================
-- FASE 3: Adicionar novos campos na tabela leads
-- =============================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'lead';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interest_type TEXT[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state TEXT;

-- =============================================
-- FASE 4: Tabela de atividades da agenda
-- =============================================

CREATE TABLE public.schedule_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FASE 5: Tabelas de Portais
-- =============================================

CREATE TABLE public.portal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portal_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  api_key TEXT,
  api_url TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  credentials JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.portal_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_connection_id UUID NOT NULL REFERENCES public.portal_connections(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  external_id TEXT,
  listing_url TEXT,
  status TEXT DEFAULT 'ativo',
  views_count INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FASE 6: Tabela de Integrações
-- =============================================

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB,
  webhook_url TEXT,
  api_key TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FASE 7: Tabelas de Treinamentos
-- =============================================

CREATE TABLE public.training_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.training_content(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- =============================================
-- FASE 8: Habilitar RLS em todas as novas tabelas
-- =============================================

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FASE 9: Criar políticas RLS
-- =============================================

-- Owners policies
CREATE POLICY "Brokers can view their own owners" ON public.owners FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can insert their own owners" ON public.owners FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers can update their own owners" ON public.owners FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can delete their own owners" ON public.owners FOR DELETE USING (auth.uid() = broker_id);

-- Companies policies
CREATE POLICY "Brokers can view their own companies" ON public.companies FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can insert their own companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers can update their own companies" ON public.companies FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can delete their own companies" ON public.companies FOR DELETE USING (auth.uid() = broker_id);

-- Schedule activities policies
CREATE POLICY "Brokers can view their own schedule activities" ON public.schedule_activities FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can insert their own schedule activities" ON public.schedule_activities FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers can update their own schedule activities" ON public.schedule_activities FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can delete their own schedule activities" ON public.schedule_activities FOR DELETE USING (auth.uid() = broker_id);

-- Portal connections policies
CREATE POLICY "Brokers can view their own portal connections" ON public.portal_connections FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can insert their own portal connections" ON public.portal_connections FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers can update their own portal connections" ON public.portal_connections FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can delete their own portal connections" ON public.portal_connections FOR DELETE USING (auth.uid() = broker_id);

-- Portal listings policies (através da conexão)
CREATE POLICY "Brokers can view their portal listings" ON public.portal_listings FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.portal_connections pc WHERE pc.id = portal_listings.portal_connection_id AND pc.broker_id = auth.uid()));
CREATE POLICY "Brokers can insert their portal listings" ON public.portal_listings FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.portal_connections pc WHERE pc.id = portal_listings.portal_connection_id AND pc.broker_id = auth.uid()));
CREATE POLICY "Brokers can update their portal listings" ON public.portal_listings FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.portal_connections pc WHERE pc.id = portal_listings.portal_connection_id AND pc.broker_id = auth.uid()));
CREATE POLICY "Brokers can delete their portal listings" ON public.portal_listings FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.portal_connections pc WHERE pc.id = portal_listings.portal_connection_id AND pc.broker_id = auth.uid()));

-- Integrations policies
CREATE POLICY "Brokers can view their own integrations" ON public.integrations FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can insert their own integrations" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers can update their own integrations" ON public.integrations FOR UPDATE USING (auth.uid() = broker_id);
CREATE POLICY "Brokers can delete their own integrations" ON public.integrations FOR DELETE USING (auth.uid() = broker_id);

-- Training content policies (public read for all authenticated users)
CREATE POLICY "Authenticated users can view published training content" ON public.training_content FOR SELECT USING (is_published = true);

-- Training progress policies
CREATE POLICY "Users can view their own training progress" ON public.training_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own training progress" ON public.training_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own training progress" ON public.training_progress FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FASE 10: Triggers para updated_at
-- =============================================

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_activities_updated_at BEFORE UPDATE ON public.schedule_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portal_connections_updated_at BEFORE UPDATE ON public.portal_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();