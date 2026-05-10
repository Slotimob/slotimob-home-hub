-- Create private bucket for sensitive property documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Brokers upload own property documents" ON storage.objects;
DROP POLICY IF EXISTS "Brokers read own org property documents" ON storage.objects;
DROP POLICY IF EXISTS "Brokers update own property documents" ON storage.objects;
DROP POLICY IF EXISTS "Brokers delete own property documents" ON storage.objects;

-- INSERT: only the owner broker
CREATE POLICY "Brokers upload own property documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: owner + workspace members
CREATE POLICY "Brokers read own org property documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1]::uuid = ANY(public.get_workspace_user_ids(auth.uid()))
    )
  );

-- UPDATE: only owner
CREATE POLICY "Brokers update own property documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: only owner
CREATE POLICY "Brokers delete own property documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reinforce property-media policies (keep public SELECT, restrict writes)
DROP POLICY IF EXISTS "Brokers can upload property media" ON storage.objects;
CREATE POLICY "Brokers can upload property media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Brokers can update property media" ON storage.objects;
CREATE POLICY "Brokers can update property media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Brokers can delete property media" ON storage.objects;
CREATE POLICY "Brokers can delete property media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );