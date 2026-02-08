-- Create enum for connection status
CREATE TYPE public.whatsapp_connection_status AS ENUM ('pending', 'connecting', 'connected', 'disconnected');

-- Create enum for message direction
CREATE TYPE public.whatsapp_message_direction AS ENUM ('incoming', 'outgoing');

-- Create enum for message type
CREATE TYPE public.whatsapp_message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact');

-- Create enum for message status
CREATE TYPE public.whatsapp_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- Table: whatsapp_connections - Stores broker's WhatsApp instances
CREATE TABLE public.whatsapp_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    evolution_api_url TEXT NOT NULL,
    evolution_api_key TEXT NOT NULL,
    phone_number TEXT,
    status whatsapp_connection_status NOT NULL DEFAULT 'pending',
    webhook_url TEXT,
    qr_code TEXT,
    connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(broker_id, instance_name)
);

-- Table: whatsapp_conversations - Conversations with contacts
CREATE TABLE public.whatsapp_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    remote_jid TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT NOT NULL,
    contact_profile_pic TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(connection_id, remote_jid)
);

-- Table: whatsapp_messages - Message history
CREATE TABLE public.whatsapp_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    direction whatsapp_message_direction NOT NULL,
    message_type whatsapp_message_type NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    media_filename TEXT,
    status whatsapp_message_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(conversation_id, message_id)
);

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_connections
CREATE POLICY "Brokers can view their own connections"
ON public.whatsapp_connections FOR SELECT
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own connections"
ON public.whatsapp_connections FOR INSERT
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own connections"
ON public.whatsapp_connections FOR UPDATE
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own connections"
ON public.whatsapp_connections FOR DELETE
USING (auth.uid() = broker_id);

-- RLS Policies for whatsapp_conversations (via connection)
CREATE POLICY "Brokers can view their conversations"
ON public.whatsapp_conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_connections wc
        WHERE wc.id = connection_id AND wc.broker_id = auth.uid()
    )
);

CREATE POLICY "Brokers can insert conversations"
ON public.whatsapp_conversations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.whatsapp_connections wc
        WHERE wc.id = connection_id AND wc.broker_id = auth.uid()
    )
);

CREATE POLICY "Brokers can update their conversations"
ON public.whatsapp_conversations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_connections wc
        WHERE wc.id = connection_id AND wc.broker_id = auth.uid()
    )
);

CREATE POLICY "Brokers can delete their conversations"
ON public.whatsapp_conversations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_connections wc
        WHERE wc.id = connection_id AND wc.broker_id = auth.uid()
    )
);

-- RLS Policies for whatsapp_messages (via conversation -> connection)
CREATE POLICY "Brokers can view their messages"
ON public.whatsapp_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_conversations wconv
        JOIN public.whatsapp_connections wc ON wc.id = wconv.connection_id
        WHERE wconv.id = conversation_id AND wc.broker_id = auth.uid()
    )
);

CREATE POLICY "Brokers can insert messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.whatsapp_conversations wconv
        JOIN public.whatsapp_connections wc ON wc.id = wconv.connection_id
        WHERE wconv.id = conversation_id AND wc.broker_id = auth.uid()
    )
);

CREATE POLICY "Brokers can update their messages"
ON public.whatsapp_messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_conversations wconv
        JOIN public.whatsapp_connections wc ON wc.id = wconv.connection_id
        WHERE wconv.id = conversation_id AND wc.broker_id = auth.uid()
    )
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_connections_broker ON public.whatsapp_connections(broker_id);
CREATE INDEX idx_whatsapp_conversations_connection ON public.whatsapp_conversations(connection_id);
CREATE INDEX idx_whatsapp_conversations_lead ON public.whatsapp_conversations(lead_id);
CREATE INDEX idx_whatsapp_conversations_last_message ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_sent_at ON public.whatsapp_messages(sent_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;