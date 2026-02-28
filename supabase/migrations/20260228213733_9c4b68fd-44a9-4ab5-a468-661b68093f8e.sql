
-- Table to log all transactional email sends for Super Admin auditing
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'welcome', 'lead_assigned', 'password_reset', 'document', etc.
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resend_id TEXT, -- ID returned by Resend API
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Org owners can see their own notifications
CREATE POLICY "Users can view their own email notifications"
ON public.email_notifications FOR SELECT
USING (auth.uid() = broker_id);

-- Service role / edge functions insert via service role key
CREATE POLICY "Service role can insert email notifications"
ON public.email_notifications FOR INSERT
WITH CHECK (true);

-- Super admins can view all notifications
CREATE POLICY "Super admins can view all email notifications"
ON public.email_notifications FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Index for common queries
CREATE INDEX idx_email_notifications_broker ON public.email_notifications(broker_id);
CREATE INDEX idx_email_notifications_type ON public.email_notifications(email_type);
CREATE INDEX idx_email_notifications_created ON public.email_notifications(created_at DESC);

-- Auto-update timestamp
CREATE TRIGGER update_email_notifications_updated_at
BEFORE UPDATE ON public.email_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
