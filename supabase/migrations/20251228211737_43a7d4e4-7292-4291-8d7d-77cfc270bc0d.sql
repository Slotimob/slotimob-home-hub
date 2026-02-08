-- Add notification preferences columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_sound_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_vibration_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_subscription jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.notification_sound_enabled IS 'Whether notification sounds are enabled';
COMMENT ON COLUMN public.profiles.notification_vibration_enabled IS 'Whether notification vibration is enabled';
COMMENT ON COLUMN public.profiles.push_subscription IS 'Web Push subscription data';