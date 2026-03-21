-- Make whatsapp-media bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'whatsapp-media';

-- RLS policies for whatsapp-media bucket
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own whatsapp media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read media from their own folder or from their workspace
CREATE POLICY "Users can read own or workspace whatsapp media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT unnest(public.get_workspace_user_ids(auth.uid()))::text
    )
  )
);

-- Allow users to delete their own media
CREATE POLICY "Users can delete own whatsapp media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);