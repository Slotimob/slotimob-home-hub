ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS additional_obligations jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.leases.additional_obligations IS
  'Array de encargos adicionais do contrato: [{type, enabled, amount, installments, installment_amount, first_due_date, charge_to, label}]';