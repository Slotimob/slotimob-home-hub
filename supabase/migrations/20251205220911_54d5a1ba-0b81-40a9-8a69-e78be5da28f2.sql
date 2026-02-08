-- Add image_url column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for property media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for property-media bucket
CREATE POLICY "Authenticated users can upload property media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their property media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their property media"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Property media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-media');

-- Create table for property documents (PDFs)
CREATE TABLE IF NOT EXISTS public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on property_documents
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_documents
CREATE POLICY "Brokers can view their own property documents"
ON public.property_documents FOR SELECT
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own property documents"
ON public.property_documents FOR INSERT
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own property documents"
ON public.property_documents FOR UPDATE
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own property documents"
ON public.property_documents FOR DELETE
USING (auth.uid() = broker_id);

-- Add trigger for updated_at
CREATE TRIGGER update_property_documents_updated_at
BEFORE UPDATE ON public.property_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();