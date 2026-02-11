
-- Step 1: Only add the enum value
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
