-- Create table for storing balance audit records
CREATE TABLE public.balance_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL,
  bank_balance NUMERIC NOT NULL,
  system_balance NUMERIC NOT NULL,
  difference NUMERIC NOT NULL DEFAULT 0,
  is_matched BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, audit_date)
);

-- Enable RLS
ALTER TABLE public.balance_audits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Brokers can view their own audits" 
ON public.balance_audits 
FOR SELECT 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can create their own audits" 
ON public.balance_audits 
FOR INSERT 
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own audits" 
ON public.balance_audits 
FOR UPDATE 
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own audits" 
ON public.balance_audits 
FOR DELETE 
USING (auth.uid() = broker_id);

-- Add trigger for updated_at
CREATE TRIGGER update_balance_audits_updated_at
BEFORE UPDATE ON public.balance_audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();