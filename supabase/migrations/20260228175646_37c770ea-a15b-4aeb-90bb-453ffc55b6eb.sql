
-- Add deal_id to whatsapp_conversations for pipeline integration
ALTER TABLE public.whatsapp_conversations
ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

-- Make property_id nullable on deals so auto-created deals from WhatsApp work without a property
ALTER TABLE public.deals
ALTER COLUMN property_id DROP NOT NULL;

-- Create index for deal lookups on conversations
CREATE INDEX idx_whatsapp_conversations_deal_id ON public.whatsapp_conversations(deal_id);
