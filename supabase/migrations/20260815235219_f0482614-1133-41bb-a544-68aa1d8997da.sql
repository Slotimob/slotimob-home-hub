alter table public.property_activities
  add column if not exists assigned_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists activity_group_id uuid,
  add column if not exists financial_transaction_id uuid references public.financial_transactions(id) on delete set null,
  add column if not exists estimated_cost numeric(12,2);

alter table public.documents
  add column if not exists activity_id uuid references public.property_activities(id) on delete set null;

create index if not exists idx_property_activities_group on public.property_activities(activity_group_id) where activity_group_id is not null;
create index if not exists idx_documents_activity on public.documents(activity_id) where activity_id is not null;