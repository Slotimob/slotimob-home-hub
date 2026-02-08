-- =====================================================
-- Tabela de Contratos de Locação (Leases)
-- =====================================================

CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  owner_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Dados financeiros
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  admin_fee_percentage NUMERIC DEFAULT 10,
  due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day >= 1 AND due_day <= 31),
  deposit_amount NUMERIC DEFAULT 0,
  
  -- Datas do contrato
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status do contrato
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'expired', 'pending')),
  
  -- Compliance DIMOB
  cib TEXT, -- Cadastro Imobiliário Brasileiro
  is_dimob_deductible BOOLEAN DEFAULT true,
  
  -- Automação de cobrança (config)
  billing_automation JSONB DEFAULT '{
    "reminder_5_days": true,
    "reminder_due_day": true,
    "reminder_3_days_late": true,
    "send_method": "whatsapp"
  }'::jsonb,
  
  -- Logs de envio de cobrança
  billing_logs JSONB DEFAULT '[]'::jsonb,
  
  -- Notas e metadados
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Brokers can view their own leases"
  ON public.leases FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own leases"
  ON public.leases FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own leases"
  ON public.leases FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own leases"
  ON public.leases FOR DELETE
  USING (auth.uid() = broker_id);

-- Trigger for updated_at
CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index para performance
CREATE INDEX idx_leases_broker_id ON public.leases(broker_id);
CREATE INDEX idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX idx_leases_tenant_contact_id ON public.leases(tenant_contact_id);
CREATE INDEX idx_leases_status ON public.leases(status);

-- Comentários
COMMENT ON TABLE public.leases IS 'Contratos de locação vinculando unidades a inquilinos';
COMMENT ON COLUMN public.leases.cib IS 'Cadastro Imobiliário Brasileiro para DIMOB';
COMMENT ON COLUMN public.leases.is_dimob_deductible IS 'Indica se valores são dedutíveis para declaração DIMOB';
COMMENT ON COLUMN public.leases.billing_automation IS 'Configuração da régua de cobrança automatizada';
COMMENT ON COLUMN public.leases.billing_logs IS 'Histórico de envios de cobrança (email/whatsapp)';