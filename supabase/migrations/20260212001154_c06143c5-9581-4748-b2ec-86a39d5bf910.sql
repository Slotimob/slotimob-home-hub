
-- Add author E-E-A-T fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS bio_mini text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS author_role text;

-- Add FAQ and alt_text fields to blog_posts
ALTER TABLE public.blog_posts 
  ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_image_alt text;
