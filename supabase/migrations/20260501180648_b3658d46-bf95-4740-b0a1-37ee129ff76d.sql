-- Add new columns for external link support
ALTER TABLE public.property_documents
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS external_provider TEXT;

-- Make file_path nullable for external links
ALTER TABLE public.property_documents
  ALTER COLUMN file_path DROP NOT NULL;

-- Ensure data consistency between upload and external_link types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_documents_source_check'
  ) THEN
    ALTER TABLE public.property_documents
      ADD CONSTRAINT property_documents_source_check
      CHECK (
        (source_type = 'upload' AND file_path IS NOT NULL AND external_url IS NULL)
        OR
        (source_type = 'external_link' AND external_url IS NOT NULL AND file_path IS NULL)
      );
  END IF;
END $$;

-- Prevent XSS via javascript: or data: URLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_documents_external_url_scheme'
  ) THEN
    ALTER TABLE public.property_documents
      ADD CONSTRAINT property_documents_external_url_scheme
      CHECK (external_url IS NULL OR external_url ~* '^https?://');
  END IF;
END $$;