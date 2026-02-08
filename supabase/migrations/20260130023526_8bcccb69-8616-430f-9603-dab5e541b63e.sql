-- Add dashboard_settings column to profiles table for cloud sync
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dashboard_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.dashboard_settings IS 'Stores user dashboard customization: visible_widgets, selected_pipeline_stages, shortcuts, date_filter';