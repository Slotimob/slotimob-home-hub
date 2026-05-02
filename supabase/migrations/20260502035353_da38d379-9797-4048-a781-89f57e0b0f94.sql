
-- A) Acquisition columns on properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_costs NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acquisition_notes TEXT;

COMMENT ON COLUMN public.properties.acquisition_value IS 'Valor pago na aquisição (preço de compra)';
COMMENT ON COLUMN public.properties.acquisition_costs IS 'Custos da aquisição: ITBI, cartório, escritura, etc.';

-- Acquisition columns on units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS acquisition_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_costs NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acquisition_notes TEXT;

COMMENT ON COLUMN public.units.acquisition_value IS 'Valor pago na aquisição (preço de compra)';
COMMENT ON COLUMN public.units.acquisition_costs IS 'Custos da aquisição: ITBI, cartório, escritura, etc.';

-- B) Asset improvements table
CREATE TABLE IF NOT EXISTS public.asset_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('property','unit')),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  improvement_type TEXT NOT NULL CHECK (improvement_type IN (
    'reforma_geral','ampliacao','reforma_cozinha','reforma_banheiro',
    'pintura','piso','eletrica','hidraulica','telhado','fachada',
    'mobilia','equipamento','outro'
  )),
  description TEXT NOT NULL,
  cost NUMERIC(14,2) NOT NULL CHECK (cost >= 0),
  completed_at DATE NOT NULL,
  invoice_doc_path TEXT,
  affects_market_value BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (asset_type = 'property' AND property_id IS NOT NULL AND unit_id IS NULL)
    OR
    (asset_type = 'unit' AND unit_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_improvements_property
  ON public.asset_improvements(property_id, completed_at DESC)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_improvements_unit
  ON public.asset_improvements(unit_id, completed_at DESC)
  WHERE unit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_improvements_broker
  ON public.asset_improvements(broker_id, completed_at DESC);

ALTER TABLE public.asset_improvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own improvements" ON public.asset_improvements
  FOR SELECT USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner creates improvements" ON public.asset_improvements
  FOR INSERT WITH CHECK (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner updates improvements" ON public.asset_improvements
  FOR UPDATE USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner deletes improvements" ON public.asset_improvements
  FOR DELETE USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));

-- C) Market value history table
CREATE TABLE IF NOT EXISTS public.market_value_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('property','unit')),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  value NUMERIC(14,2) NOT NULL CHECK (value >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual_edit' CHECK (source IN (
    'manual_edit','manual_appraisal','third_party_appraisal','market_data_import'
  )),
  appraiser_name TEXT,
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (asset_type = 'property' AND property_id IS NOT NULL AND unit_id IS NULL)
    OR
    (asset_type = 'unit' AND unit_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_market_history_property
  ON public.market_value_history(property_id, effective_date DESC)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_market_history_unit
  ON public.market_value_history(unit_id, effective_date DESC)
  WHERE unit_id IS NOT NULL;

ALTER TABLE public.market_value_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner sees own market history" ON public.market_value_history
  FOR SELECT USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner creates market history" ON public.market_value_history
  FOR INSERT WITH CHECK (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner updates market history" ON public.market_value_history
  FOR UPDATE USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));
CREATE POLICY "Owner deletes market history" ON public.market_value_history
  FOR DELETE USING (broker_id = auth.uid() OR broker_id = public.get_effective_broker_id(auth.uid()));

-- D) Auto-log trigger for market_value changes
CREATE OR REPLACE FUNCTION public.log_market_value_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.market_value IS DISTINCT FROM OLD.market_value
     AND NEW.market_value IS NOT NULL THEN
    INSERT INTO public.market_value_history (
      broker_id, asset_type, property_id, unit_id, value,
      effective_date, source, recorded_by
    )
    VALUES (
      NEW.broker_id,
      TG_ARGV[0],
      CASE WHEN TG_ARGV[0]='property' THEN NEW.id ELSE NULL END,
      CASE WHEN TG_ARGV[0]='unit'     THEN NEW.id ELSE NULL END,
      NEW.market_value,
      CURRENT_DATE,
      'manual_edit',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_market_value_property ON public.properties;
CREATE TRIGGER trg_log_market_value_property
  AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_market_value_change('property');

DROP TRIGGER IF EXISTS trg_log_market_value_unit ON public.units;
CREATE TRIGGER trg_log_market_value_unit
  AFTER UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.log_market_value_change('unit');

-- Backfill existing market values
INSERT INTO public.market_value_history (
  broker_id, asset_type, property_id, value, effective_date, source, recorded_at
)
SELECT broker_id, 'property', id, market_value, COALESCE(updated_at::date, CURRENT_DATE),
       'manual_edit', updated_at
  FROM public.properties
 WHERE market_value IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.market_value_history h WHERE h.property_id = properties.id);

INSERT INTO public.market_value_history (
  broker_id, asset_type, unit_id, value, effective_date, source, recorded_at
)
SELECT broker_id, 'unit', id, market_value, COALESCE(updated_at::date, CURRENT_DATE),
       'manual_edit', updated_at
  FROM public.units
 WHERE market_value IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.market_value_history h WHERE h.unit_id = units.id);

-- E) Audit triggers
DROP TRIGGER IF EXISTS audit_asset_improvements ON public.asset_improvements;
CREATE TRIGGER audit_asset_improvements
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_improvements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

DROP TRIGGER IF EXISTS audit_market_value_history ON public.market_value_history;
CREATE TRIGGER audit_market_value_history
  AFTER INSERT ON public.market_value_history
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_with_asset_context();

-- Updated_at trigger for improvements
DROP TRIGGER IF EXISTS update_asset_improvements_updated_at ON public.asset_improvements;
CREATE TRIGGER update_asset_improvements_updated_at
  BEFORE UPDATE ON public.asset_improvements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
