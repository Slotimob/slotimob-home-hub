ALTER TABLE public.proposals ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
CREATE INDEX idx_proposals_contact_id ON public.proposals(contact_id);