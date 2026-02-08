-- Add separate notification tracking for 24h and 2h reminders
ALTER TABLE public.visits 
  DROP COLUMN IF EXISTS notification_sent;

ALTER TABLE public.visits
  ADD COLUMN notification_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN notification_2h_sent boolean NOT NULL DEFAULT false;