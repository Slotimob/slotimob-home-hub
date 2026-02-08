-- Create storage bucket for unit media
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-media', 'unit-media', true);

-- Allow authenticated users to upload files to their own broker folder
CREATE POLICY "Brokers can upload unit media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'unit-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own unit media
CREATE POLICY "Brokers can view their unit media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'unit-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own unit media
CREATE POLICY "Brokers can delete their unit media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'unit-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view unit media (for sharing links)
CREATE POLICY "Public can view unit media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'unit-media');