
-- Create system_settings table for dynamic configuration
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text,
  description text,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read marketing settings (needed for TrackingProvider)
CREATE POLICY "Public can read marketing settings"
ON public.system_settings
FOR SELECT
USING (category = 'marketing');

-- Super admins can read all settings
CREATE POLICY "Super admins can read all settings"
ON public.system_settings
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Super admins can insert settings
CREATE POLICY "Super admins can insert settings"
ON public.system_settings
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update settings
CREATE POLICY "Super admins can update settings"
ON public.system_settings
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Super admins can delete settings
CREATE POLICY "Super admins can delete settings"
ON public.system_settings
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Seed initial marketing keys
INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('gtm_id', '', 'Google Tag Manager ID', 'marketing'),
  ('pixel_id', '', 'Facebook Pixel ID', 'marketing'),
  ('ga_id', '', 'Google Analytics ID', 'marketing');
