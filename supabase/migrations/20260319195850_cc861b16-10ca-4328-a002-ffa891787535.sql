-- Add tags column to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create quick_messages table
CREATE TABLE IF NOT EXISTS public.quick_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  broker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;

-- RLS for quick_messages: workspace-aware
CREATE POLICY "quick_messages_select" ON public.quick_messages
  FOR SELECT TO authenticated
  USING (
    broker_id = ANY (public.get_workspace_user_ids(auth.uid()))
  );

CREATE POLICY "quick_messages_insert" ON public.quick_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_as_broker(auth.uid(), broker_id)
  );

CREATE POLICY "quick_messages_update" ON public.quick_messages
  FOR UPDATE TO authenticated
  USING (
    public.can_write_as_broker(auth.uid(), broker_id)
  );

CREATE POLICY "quick_messages_delete" ON public.quick_messages
  FOR DELETE TO authenticated
  USING (
    public.can_write_as_broker(auth.uid(), broker_id)
  );