alter table public.leases
  add column if not exists is_indefinite_term boolean not null default false,
  add column if not exists adjustment_periodicity_months integer not null default 12,
  add column if not exists fire_insurance jsonb,
  add column if not exists iptu_charge jsonb;

comment on column public.leases.is_indefinite_term is 'Contrato por prazo indeterminado — quando true, end_date deve ser null';
comment on column public.leases.adjustment_periodicity_months is 'Periodicidade do reajuste do aluguel, em meses (padrão 12)';
comment on column public.leases.fire_insurance is '{ enabled, total_amount, installments, installment_amount, first_due_date, charge_to }';
comment on column public.leases.iptu_charge is '{ enabled, annual_amount, installments, installment_amount, first_due_date, charge_to, source }';

update public.leases set end_date = null where is_indefinite_term = true and end_date is not null;

alter table public.leases
  drop constraint if exists leases_indefinite_term_no_end_date;

alter table public.leases
  add constraint leases_indefinite_term_no_end_date
  check (not is_indefinite_term or end_date is null);