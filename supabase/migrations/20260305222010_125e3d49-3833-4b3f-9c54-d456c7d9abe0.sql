
CREATE TABLE public.account_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  plan_id text,
  deletion_reason text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - only edge function with service role writes to this table
ALTER TABLE public.account_deletion_logs ENABLE ROW LEVEL SECURITY;
