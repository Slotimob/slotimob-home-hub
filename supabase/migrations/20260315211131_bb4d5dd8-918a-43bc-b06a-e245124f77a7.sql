-- Create whatsapp-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Authenticated users can upload
CREATE POLICY "Authenticated users can upload whatsapp media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- RLS: Public read
CREATE POLICY "Public read whatsapp media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'whatsapp-media');

-- RLS: Owner can delete
CREATE POLICY "Owner can delete whatsapp media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'whatsapp-media' AND (storage.foldername(name))[1] = auth.uid()::text);