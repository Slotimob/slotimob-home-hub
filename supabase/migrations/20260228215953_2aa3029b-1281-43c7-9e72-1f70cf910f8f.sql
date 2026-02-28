
-- Add accepted_terms boolean to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT false;

-- Create consent_logs table
CREATE TABLE public.consent_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  consent_type text NOT NULL DEFAULT 'terms_and_privacy',
  terms_version text,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own consent logs"
  ON public.consent_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all (for auditing)
CREATE POLICY "Super admins can view all consent logs"
  ON public.consent_logs FOR SELECT
  USING (is_super_admin(auth.uid()));

-- No update or delete allowed (immutable audit trail)

-- Index for user lookups
CREATE INDEX idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX idx_consent_logs_accepted_at ON public.consent_logs(accepted_at);
