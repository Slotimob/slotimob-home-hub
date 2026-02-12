
-- Create blog-images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to blog images
CREATE POLICY "Blog images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Allow super admins to upload blog images
CREATE POLICY "Super admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' 
  AND auth.uid() IS NOT NULL
  AND public.is_super_admin(auth.uid())
);

-- Allow super admins to update blog images
CREATE POLICY "Super admins can update blog images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images'
  AND auth.uid() IS NOT NULL
  AND public.is_super_admin(auth.uid())
);

-- Allow super admins to delete blog images
CREATE POLICY "Super admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images'
  AND auth.uid() IS NOT NULL
  AND public.is_super_admin(auth.uid())
);
