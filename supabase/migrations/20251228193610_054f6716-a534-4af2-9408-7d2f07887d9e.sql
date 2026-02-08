-- Add missing RLS policies for notification_logs
CREATE POLICY "Brokers can insert their own notification logs" 
ON public.notification_logs FOR INSERT 
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own notification logs" 
ON public.notification_logs FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own notification logs" 
ON public.notification_logs FOR DELETE 
USING (auth.uid() = broker_id);

-- Add missing RLS policies for import_history
CREATE POLICY "Brokers can update their own import history" 
ON public.import_history FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own import history" 
ON public.import_history FOR DELETE 
USING (auth.uid() = broker_id);

-- Add missing RLS policies for deal_stage_history
CREATE POLICY "Brokers can update their own deal stage history" 
ON public.deal_stage_history FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own deal stage history" 
ON public.deal_stage_history FOR DELETE 
USING (auth.uid() = broker_id);

-- Add missing DELETE policy for whatsapp_messages
CREATE POLICY "Brokers can delete their messages" 
ON public.whatsapp_messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_conversations wconv
    JOIN whatsapp_connections wc ON wc.id = wconv.connection_id
    WHERE wconv.id = whatsapp_messages.conversation_id 
    AND wc.broker_id = auth.uid()
  )
);