-- Step A: Add new columns
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS external_provider TEXT;

-- Step B: Make file_path nullable
ALTER TABLE public.documents ALTER COLUMN file_path DROP NOT NULL;

-- Step C: Source consistency check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_source_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_source_check
      CHECK (
        (source_type = 'upload' AND file_path IS NOT NULL AND external_url IS NULL)
        OR
        (source_type = 'external_link' AND external_url IS NOT NULL AND file_path IS NULL)
      );
  END IF;
END $$;

-- Step D: URL scheme check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_external_url_scheme'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_external_url_scheme
      CHECK (external_url IS NULL OR external_url ~* '^https?://');
  END IF;
END $$;