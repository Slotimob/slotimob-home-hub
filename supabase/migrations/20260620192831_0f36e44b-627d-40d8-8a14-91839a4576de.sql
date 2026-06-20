
-- Fix search_path mutable on remaining 2 functions
ALTER FUNCTION public.audit_diff(jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.log_visit_completed() SET search_path = public;

-- Drop overly broad SELECT policies on storage.objects that allow listing of public buckets.
-- Direct file fetches over the public URL keep working (public buckets bypass RLS for object reads).
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Property media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view unit media" ON storage.objects;
