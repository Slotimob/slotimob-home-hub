-- Create table to track bank statement imports
CREATE TABLE public.bank_statement_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  bank_account_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  entries_count INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.bank_statement_imports
  ADD CONSTRAINT bank_statement_imports_broker_id_fkey
  FOREIGN KEY (broker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bank_statement_imports
  ADD CONSTRAINT bank_statement_imports_bank_account_id_fkey
  FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE;

-- Add import_id column to bank_statement_entries
ALTER TABLE public.bank_statement_entries
  ADD COLUMN import_id UUID REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_bank_statement_imports_broker ON public.bank_statement_imports(broker_id);
CREATE INDEX idx_bank_statement_imports_account ON public.bank_statement_imports(bank_account_id);
CREATE INDEX idx_bank_statement_entries_import ON public.bank_statement_entries(import_id);

-- Enable RLS
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_statement_imports
CREATE POLICY "Brokers can view their own imports"
  ON public.bank_statement_imports FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own imports"
  ON public.bank_statement_imports FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own imports"
  ON public.bank_statement_imports FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own imports"
  ON public.bank_statement_imports FOR DELETE
  USING (auth.uid() = broker_id);