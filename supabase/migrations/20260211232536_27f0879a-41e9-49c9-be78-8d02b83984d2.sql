
-- Create organization_invitations table for token-based team invites
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  organization_owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL DEFAULT 'Agente',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own invitations
CREATE POLICY "Owners can view their invitations"
  ON public.organization_invitations FOR SELECT
  USING (auth.uid() = organization_owner_id);

CREATE POLICY "Owners can create invitations"
  ON public.organization_invitations FOR INSERT
  WITH CHECK (auth.uid() = organization_owner_id);

CREATE POLICY "Owners can delete invitations"
  ON public.organization_invitations FOR DELETE
  USING (auth.uid() = organization_owner_id);

-- Allow the edge function (service role) and anon to read by token for signup flow
CREATE POLICY "Anyone can read invitation by token"
  ON public.organization_invitations FOR SELECT
  USING (true);

-- Allow update (mark as used) - service role will handle this via edge function
CREATE POLICY "Anyone can update invitation by token"
  ON public.organization_invitations FOR UPDATE
  USING (true);

-- Index for fast token lookup
CREATE INDEX idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON public.organization_invitations(email);
