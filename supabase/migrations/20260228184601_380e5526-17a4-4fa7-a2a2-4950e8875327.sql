
-- Drop existing policies on whatsapp_conversations
DROP POLICY IF EXISTS "Brokers can view their conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Brokers can insert conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Brokers can update their conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Brokers can delete their conversations" ON public.whatsapp_conversations;

-- Drop existing policies on whatsapp_messages
DROP POLICY IF EXISTS "Brokers can view their messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Brokers can insert messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Brokers can update their messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Brokers can delete their messages" ON public.whatsapp_messages;

-- Helper function: check if user is owner of the connection's broker or an active org member
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM whatsapp_conversations wc
    JOIN whatsapp_connections conn ON conn.id = wc.connection_id
    WHERE wc.id = _conversation_id
      AND (
        -- Owner: full access
        conn.broker_id = _user_id
        -- Agent: only assigned conversations
        OR (
          wc.assigned_user_id = _user_id
          AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = _user_id
              AND om.organization_owner_id = conn.broker_id
              AND om.is_active = true
          )
        )
      )
  );
$$;

-- Helper: check if user can access conversations for a given connection (for SELECT)
CREATE OR REPLACE FUNCTION public.can_access_whatsapp_connection(_user_id uuid, _broker_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _user_id = _broker_id
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = _user_id
        AND om.organization_owner_id = _broker_id
        AND om.is_active = true
    )
  );
$$;

-- whatsapp_conversations: SELECT
-- Owner sees all, Agent sees only assigned
CREATE POLICY "Users can view accessible conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_connections conn
    WHERE conn.id = whatsapp_conversations.connection_id
      AND (
        conn.broker_id = auth.uid()
        OR (
          whatsapp_conversations.assigned_user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_owner_id = conn.broker_id
              AND om.is_active = true
          )
        )
      )
  )
);

-- whatsapp_conversations: INSERT (owner only)
CREATE POLICY "Owners can insert conversations"
ON public.whatsapp_conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM whatsapp_connections conn
    WHERE conn.id = whatsapp_conversations.connection_id
      AND conn.broker_id = auth.uid()
  )
);

-- whatsapp_conversations: UPDATE
CREATE POLICY "Users can update accessible conversations"
ON public.whatsapp_conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_connections conn
    WHERE conn.id = whatsapp_conversations.connection_id
      AND (
        conn.broker_id = auth.uid()
        OR (
          whatsapp_conversations.assigned_user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_owner_id = conn.broker_id
              AND om.is_active = true
          )
        )
      )
  )
);

-- whatsapp_conversations: DELETE (owner only)
CREATE POLICY "Owners can delete conversations"
ON public.whatsapp_conversations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_connections conn
    WHERE conn.id = whatsapp_conversations.connection_id
      AND conn.broker_id = auth.uid()
  )
);

-- whatsapp_messages: SELECT
CREATE POLICY "Users can view accessible messages"
ON public.whatsapp_messages
FOR SELECT
USING (
  public.can_access_whatsapp_conversation(auth.uid(), whatsapp_messages.conversation_id)
);

-- whatsapp_messages: INSERT
CREATE POLICY "Users can insert accessible messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  public.can_access_whatsapp_conversation(auth.uid(), whatsapp_messages.conversation_id)
);

-- whatsapp_messages: UPDATE
CREATE POLICY "Users can update accessible messages"
ON public.whatsapp_messages
FOR UPDATE
USING (
  public.can_access_whatsapp_conversation(auth.uid(), whatsapp_messages.conversation_id)
);

-- whatsapp_messages: DELETE (owner only via conversation access)
CREATE POLICY "Users can delete accessible messages"
ON public.whatsapp_messages
FOR DELETE
USING (
  public.can_access_whatsapp_conversation(auth.uid(), whatsapp_messages.conversation_id)
);
