-- Create whatsapp_tags table
CREATE TABLE public.whatsapp_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  broker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, broker_id)
);

-- Create junction table
CREATE TABLE public.whatsapp_conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.whatsapp_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

-- RLS for whatsapp_tags
ALTER TABLE public.whatsapp_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace tags"
  ON public.whatsapp_tags FOR SELECT TO authenticated
  USING (broker_id = ANY(public.get_workspace_user_ids(auth.uid())));

CREATE POLICY "Users can insert tags for workspace"
  ON public.whatsapp_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_write_as_broker(auth.uid(), broker_id));

CREATE POLICY "Users can delete workspace tags"
  ON public.whatsapp_tags FOR DELETE TO authenticated
  USING (broker_id = ANY(public.get_workspace_user_ids(auth.uid())));

-- RLS for whatsapp_conversation_tags
ALTER TABLE public.whatsapp_conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation tags"
  ON public.whatsapp_conversation_tags FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_connections conn ON conn.id = wc.connection_id
    WHERE wc.id = conversation_id
    AND conn.broker_id = ANY(public.get_workspace_user_ids(auth.uid()))
  ));

CREATE POLICY "Users can manage conversation tags"
  ON public.whatsapp_conversation_tags FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_connections conn ON conn.id = wc.connection_id
    WHERE wc.id = conversation_id
    AND conn.broker_id = ANY(public.get_workspace_user_ids(auth.uid()))
  ));

CREATE POLICY "Users can remove conversation tags"
  ON public.whatsapp_conversation_tags FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_connections conn ON conn.id = wc.connection_id
    WHERE wc.id = conversation_id
    AND conn.broker_id = ANY(public.get_workspace_user_ids(auth.uid()))
  ));

-- Indexes
CREATE INDEX idx_whatsapp_tags_broker ON public.whatsapp_tags(broker_id);
CREATE INDEX idx_whatsapp_conversation_tags_conv ON public.whatsapp_conversation_tags(conversation_id);
CREATE INDEX idx_whatsapp_conversation_tags_tag ON public.whatsapp_conversation_tags(tag_id);