CREATE INDEX IF NOT EXISTS idx_bse_broker_entry_date
  ON public.bank_statement_entries(broker_id, entry_date DESC);