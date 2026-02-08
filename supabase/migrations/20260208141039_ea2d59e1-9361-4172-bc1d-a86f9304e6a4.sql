-- Remove FK constraint se existir
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_assigned_user_id_fkey;

-- Atualiza os IDs
UPDATE financial_transactions 
SET assigned_user_id = 'b52081c9-b184-4125-bd09-69f90b2b94a3' 
WHERE assigned_user_id = '9d79871f-fab9-4017-8d69-c7d6c4a6f672';

-- Recria FK apontando para profiles
ALTER TABLE financial_transactions 
ADD CONSTRAINT financial_transactions_assigned_user_id_fkey 
FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;