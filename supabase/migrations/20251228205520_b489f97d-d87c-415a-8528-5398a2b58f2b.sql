-- Create terms_versions table
CREATE TABLE public.terms_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  is_active BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - only authenticated users can view, but we'll add admin check in code
CREATE POLICY "Authenticated users can view terms versions"
ON public.terms_versions
FOR SELECT
TO authenticated
USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_terms_versions_updated_at
BEFORE UPDATE ON public.terms_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial version
INSERT INTO public.terms_versions (version, title, summary, is_active, published_at)
VALUES ('1.0', 'Termos de Uso e Política de Privacidade - Versão Inicial', 'Versão inicial dos termos de uso e política de privacidade do SLOTIMOB.', true, now());