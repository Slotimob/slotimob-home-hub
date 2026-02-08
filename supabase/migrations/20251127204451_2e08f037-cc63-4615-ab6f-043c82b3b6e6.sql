-- Add theme preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN theme_preference TEXT DEFAULT 'light-purple' CHECK (theme_preference IN ('light-green', 'light-blue', 'light-purple', 'dark-green', 'dark-purple'));