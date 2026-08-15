UPDATE public.leases
SET status = 'active',
    contract_status = 'active',
    updated_at = now()
WHERE status = 'pending'
  AND tenant_contact_id IS NOT NULL
  AND rent_amount > 0
  AND start_date IS NOT NULL
  AND COALESCE(contract_status, '') NOT IN ('terminated', 'expired');