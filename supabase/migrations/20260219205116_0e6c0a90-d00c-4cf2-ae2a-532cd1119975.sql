
-- Chat messages table for AI chat history
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast retrieval by broker
CREATE INDEX idx_chat_messages_broker_id ON public.chat_messages(broker_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = broker_id);
