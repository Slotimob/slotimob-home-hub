-- Create audit_logs table for tracking sensitive operations
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_broker_id ON public.audit_logs(broker_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Brokers can view their own audit logs
CREATE POLICY "Brokers can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = broker_id);

-- Only allow inserts (no updates or deletes - audit logs are immutable)
CREATE POLICY "Brokers can insert their own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = broker_id);

-- Create function to log deal stage changes
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage OR OLD.custom_stage_id IS DISTINCT FROM NEW.custom_stage_id THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, new_data, metadata)
    VALUES (
      NEW.broker_id,
      'deal_stage_change',
      'deals',
      NEW.id,
      jsonb_build_object('stage', OLD.stage, 'custom_stage_id', OLD.custom_stage_id),
      jsonb_build_object('stage', NEW.stage, 'custom_stage_id', NEW.custom_stage_id),
      jsonb_build_object('lead_id', NEW.lead_id, 'property_id', NEW.property_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for deal stage changes
CREATE TRIGGER audit_deal_stage_change
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_stage_change();

-- Create function to log document access/changes
CREATE OR REPLACE FUNCTION public.log_document_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
    VALUES (
      NEW.broker_id,
      'document_created',
      'documents',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'document_type', NEW.document_type, 'file_path', NEW.file_path),
      jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id, 'unit_id', NEW.unit_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, new_data, metadata)
    VALUES (
      NEW.broker_id,
      'document_updated',
      'documents',
      NEW.id,
      jsonb_build_object('title', OLD.title, 'version', OLD.version),
      jsonb_build_object('title', NEW.title, 'version', NEW.version),
      jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, metadata)
    VALUES (
      OLD.broker_id,
      'document_deleted',
      'documents',
      OLD.id,
      jsonb_build_object('title', OLD.title, 'document_type', OLD.document_type),
      jsonb_build_object('deal_id', OLD.deal_id, 'lead_id', OLD.lead_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for document changes
CREATE TRIGGER audit_document_changes
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.log_document_change();

-- Create function to log property document changes
CREATE OR REPLACE FUNCTION public.log_property_document_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
    VALUES (
      NEW.broker_id,
      'property_document_created',
      'property_documents',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'file_path', NEW.file_path),
      jsonb_build_object('property_id', NEW.property_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, old_data, metadata)
    VALUES (
      OLD.broker_id,
      'property_document_deleted',
      'property_documents',
      OLD.id,
      jsonb_build_object('title', OLD.title),
      jsonb_build_object('property_id', OLD.property_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for property document changes
CREATE TRIGGER audit_property_document_changes
AFTER INSERT OR DELETE ON public.property_documents
FOR EACH ROW
EXECUTE FUNCTION public.log_property_document_change();

-- Create function to log sales (won deals)
CREATE OR REPLACE FUNCTION public.log_sale_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (broker_id, action, table_name, record_id, new_data, metadata)
  VALUES (
    NEW.broker_id,
    'sale_recorded',
    'sales',
    NEW.id,
    jsonb_build_object('sale_value', NEW.sale_value, 'commission_value', NEW.commission_value),
    jsonb_build_object('deal_id', NEW.deal_id, 'lead_id', NEW.lead_id, 'property_id', NEW.property_id, 'unit_id', NEW.unit_id)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for sales
CREATE TRIGGER audit_sale_created
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.log_sale_created();