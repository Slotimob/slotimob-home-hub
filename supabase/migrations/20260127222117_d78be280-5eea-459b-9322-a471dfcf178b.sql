-- =============================================
-- FINANCIAL CONTROL SYSTEM TABLES
-- =============================================

-- 1. Financial Categories Table
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'circle',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Bank Accounts Table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  agency TEXT,
  balance NUMERIC DEFAULT 0,
  color TEXT DEFAULT '#10b981',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Financial Transactions Table
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  reference TEXT,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  notes TEXT,
  receipt_path TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Bank Statement Entries Table
CREATE TABLE public.bank_statement_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  entry_date DATE NOT NULL,
  is_credit BOOLEAN NOT NULL,
  transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  is_reconciled BOOLEAN DEFAULT false,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_entries ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR financial_categories
-- =============================================

CREATE POLICY "Brokers can view their own categories"
  ON public.financial_categories FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own categories"
  ON public.financial_categories FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own categories"
  ON public.financial_categories FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own categories"
  ON public.financial_categories FOR DELETE
  USING (auth.uid() = broker_id);

-- =============================================
-- RLS POLICIES FOR bank_accounts
-- =============================================

CREATE POLICY "Brokers can view their own bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own bank accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own bank accounts"
  ON public.bank_accounts FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own bank accounts"
  ON public.bank_accounts FOR DELETE
  USING (auth.uid() = broker_id);

-- =============================================
-- RLS POLICIES FOR financial_transactions
-- =============================================

CREATE POLICY "Brokers can view their own transactions"
  ON public.financial_transactions FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own transactions"
  ON public.financial_transactions FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own transactions"
  ON public.financial_transactions FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own transactions"
  ON public.financial_transactions FOR DELETE
  USING (auth.uid() = broker_id);

-- =============================================
-- RLS POLICIES FOR bank_statement_entries
-- =============================================

CREATE POLICY "Brokers can view their own statement entries"
  ON public.bank_statement_entries FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own statement entries"
  ON public.bank_statement_entries FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own statement entries"
  ON public.bank_statement_entries FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own statement entries"
  ON public.bank_statement_entries FOR DELETE
  USING (auth.uid() = broker_id);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_financial_categories_updated_at
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR BETTER PERFORMANCE
-- =============================================

CREATE INDEX idx_financial_categories_broker ON public.financial_categories(broker_id);
CREATE INDEX idx_financial_categories_type ON public.financial_categories(type);

CREATE INDEX idx_bank_accounts_broker ON public.bank_accounts(broker_id);

CREATE INDEX idx_financial_transactions_broker ON public.financial_transactions(broker_id);
CREATE INDEX idx_financial_transactions_category ON public.financial_transactions(category_id);
CREATE INDEX idx_financial_transactions_bank_account ON public.financial_transactions(bank_account_id);
CREATE INDEX idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_due_date ON public.financial_transactions(due_date);

CREATE INDEX idx_bank_statement_entries_broker ON public.bank_statement_entries(broker_id);
CREATE INDEX idx_bank_statement_entries_bank_account ON public.bank_statement_entries(bank_account_id);
CREATE INDEX idx_bank_statement_entries_reconciled ON public.bank_statement_entries(is_reconciled);