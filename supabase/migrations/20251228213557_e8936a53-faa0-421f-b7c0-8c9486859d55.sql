-- Add glow intensity preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN glow_intensity integer DEFAULT 50 CHECK (glow_intensity >= 0 AND glow_intensity <= 100);