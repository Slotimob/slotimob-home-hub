-- Contacts: Remove FK e atualiza
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_assigned_user_id_fkey;
UPDATE contacts SET assigned_user_id = 'b52081c9-b184-4125-bd09-69f90b2b94a3' WHERE assigned_user_id = '9d79871f-fab9-4017-8d69-c7d6c4a6f672';
ALTER TABLE contacts ADD CONSTRAINT contacts_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Deals: Remove FK e atualiza
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_assigned_user_id_fkey;
UPDATE deals SET assigned_user_id = 'b52081c9-b184-4125-bd09-69f90b2b94a3' WHERE assigned_user_id = '9d79871f-fab9-4017-8d69-c7d6c4a6f672';
ALTER TABLE deals ADD CONSTRAINT deals_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Units: Remove FK e atualiza
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_assigned_user_id_fkey;
UPDATE units SET assigned_user_id = 'b52081c9-b184-4125-bd09-69f90b2b94a3' WHERE assigned_user_id = '9d79871f-fab9-4017-8d69-c7d6c4a6f672';
ALTER TABLE units ADD CONSTRAINT units_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES profiles(id) ON DELETE SET NULL;