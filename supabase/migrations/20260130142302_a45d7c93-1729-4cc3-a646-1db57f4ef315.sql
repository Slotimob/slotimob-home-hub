-- Add group_id column for recurring transactions
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS group_id uuid DEFAULT NULL;

-- Add index for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_financial_transactions_group_id 
ON public.financial_transactions(group_id) WHERE group_id IS NOT NULL;

-- Add recurrence_info column to store original recurrence settings
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS recurrence_info jsonb DEFAULT NULL;

COMMENT ON COLUMN public.financial_transactions.group_id IS 'UUID to group recurring transactions together for bulk operations';
COMMENT ON COLUMN public.financial_transactions.recurrence_info IS 'Original recurrence settings: frequency, total_count, current_index';