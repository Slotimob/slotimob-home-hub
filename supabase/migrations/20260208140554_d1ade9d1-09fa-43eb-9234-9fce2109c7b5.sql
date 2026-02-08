-- Remove FK constraint para permitir atualização
ALTER TABLE bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_assigned_user_id_fkey;

-- Atualiza os IDs
UPDATE bank_accounts 
SET assigned_user_id = 'b52081c9-b184-4125-bd09-69f90b2b94a3' 
WHERE assigned_user_id = '9d79871f-fab9-4017-8d69-c7d6c4a6f672';

-- Recria FK apontando para profiles (que não tem restrição de auth.users)
ALTER TABLE bank_accounts 
ADD CONSTRAINT bank_accounts_assigned_user_id_fkey 
FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;