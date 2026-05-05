
-- ============================================================
-- Privatize proposals bucket + cleanup old public policies
-- Idempotent migration
-- ============================================================

-- A) Make proposals bucket private (whatsapp-media already private)
UPDATE storage.buckets SET public = false WHERE id = 'proposals';

-- B) Drop old insecure policies
DROP POLICY IF EXISTS "Public read access for proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update proposals" ON storage.objects;

-- Also drop leftover public-read policy on whatsapp-media (bucket is already private but policy remains)
DROP POLICY IF EXISTS "Public read whatsapp media" ON storage.objects;

-- C) Create new policies for proposals bucket

-- INSERT: broker can only upload to their own folder
CREATE POLICY "Brokers upload own proposals"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: broker can read own workspace proposals
CREATE POLICY "Brokers read own org proposals"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] IN (
        SELECT unnest(public.get_workspace_user_ids(auth.uid()))::text
      )
    )
  );

-- UPDATE: only the broker owner
CREATE POLICY "Brokers update own proposals"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: only the broker owner
CREATE POLICY "Brokers delete own proposals"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- E) Validation
DO $$
DECLARE
  v_proposals_public BOOLEAN;
  v_whatsapp_public BOOLEAN;
BEGIN
  SELECT public INTO v_proposals_public FROM storage.buckets WHERE id = 'proposals';
  SELECT public INTO v_whatsapp_public FROM storage.buckets WHERE id = 'whatsapp-media';
  
  IF v_proposals_public IS TRUE THEN
    RAISE EXCEPTION 'proposals bucket ainda está público';
  END IF;
  IF v_whatsapp_public IS TRUE THEN
    RAISE EXCEPTION 'whatsapp-media bucket ainda está público';
  END IF;
  RAISE NOTICE 'Buckets proposals e whatsapp-media agora são privados';
END $$;
