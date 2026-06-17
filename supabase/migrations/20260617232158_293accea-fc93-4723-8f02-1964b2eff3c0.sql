-- Adicionar colunas Asaas na tabela subscriptions (mantendo Stripe para rollback)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_provider text DEFAULT 'stripe';

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_sub_id 
  ON public.subscriptions(asaas_subscription_id) 
  WHERE asaas_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_cust_id 
  ON public.subscriptions(asaas_customer_id) 
  WHERE asaas_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_provider 
  ON public.subscriptions(billing_provider);

-- Subcontas Asaas (corretores)
CREATE TABLE IF NOT EXISTS public.asaas_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  asaas_account_id text NOT NULL,
  asaas_api_key text NOT NULL,
  wallet_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_accounts TO authenticated;
GRANT ALL ON public.asaas_accounts TO service_role;

ALTER TABLE public.asaas_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own asaas account" ON public.asaas_accounts
  FOR SELECT USING (broker_id = auth.uid());

-- Customers Asaas (inquilinos)
CREATE TABLE IF NOT EXISTS public.asaas_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  asaas_customer_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(broker_id, contact_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_customers TO authenticated;
GRANT ALL ON public.asaas_customers TO service_role;

ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own asaas customers" ON public.asaas_customers
  FOR ALL USING (broker_id = auth.uid());

-- Cobranças Asaas
CREATE TABLE IF NOT EXISTS public.asaas_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lease_id uuid REFERENCES public.leases(id),
  financial_transaction_id uuid REFERENCES public.financial_transactions(id),
  asaas_payment_id text NOT NULL UNIQUE,
  asaas_subscription_id text,
  billing_type text NOT NULL,
  value numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'PENDING',
  bank_slip_url text,
  pix_qr_code text,
  pix_copy_paste text,
  invoice_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_payments TO authenticated;
GRANT ALL ON public.asaas_payments TO service_role;

ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own asaas payments" ON public.asaas_payments
  FOR ALL USING (broker_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_asaas_payments_broker ON public.asaas_payments(broker_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_lease ON public.asaas_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_asaas_payments_status ON public.asaas_payments(status);