DO $$
BEGIN
  UPDATE whatsapp_conversations SET status = 'pending' WHERE status IS NULL OR status NOT IN ('pending', 'active', 'closed', 'waiting');
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_conversations_status_check'
  ) THEN
    ALTER TABLE whatsapp_conversations
      ADD CONSTRAINT whatsapp_conversations_status_check
      CHECK (status IN ('pending', 'active', 'closed', 'waiting'));
  END IF;
  
  ALTER TABLE whatsapp_conversations ALTER COLUMN status SET DEFAULT 'pending';
END $$;