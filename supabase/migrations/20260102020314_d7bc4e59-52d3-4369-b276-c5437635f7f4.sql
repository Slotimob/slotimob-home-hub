-- Create document_templates table for storing template definitions
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view active templates
CREATE POLICY "Authenticated users can view active templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create generated_documents table for storing user-generated documents
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL,
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  filled_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on generated_documents
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Brokers can view their own generated documents
CREATE POLICY "Brokers can view their own generated documents"
ON public.generated_documents
FOR SELECT
USING (auth.uid() = broker_id);

-- Policy: Brokers can insert their own generated documents
CREATE POLICY "Brokers can insert their own generated documents"
ON public.generated_documents
FOR INSERT
WITH CHECK (auth.uid() = broker_id);

-- Policy: Brokers can delete their own generated documents
CREATE POLICY "Brokers can delete their own generated documents"
ON public.generated_documents
FOR DELETE
USING (auth.uid() = broker_id);

-- Add updated_at trigger for document_templates
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();