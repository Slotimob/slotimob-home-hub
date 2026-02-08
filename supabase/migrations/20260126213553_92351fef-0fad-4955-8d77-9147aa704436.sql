-- Fix property-media storage bucket policies to restrict access to user-owned files only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload property media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update property media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property media" ON storage.objects;

-- Create restricted policies that check folder ownership
CREATE POLICY "Brokers can upload their own property media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Brokers can update their own property media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Brokers can delete their own property media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);