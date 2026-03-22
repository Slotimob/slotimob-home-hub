
-- Add deal_id column to proposals table for CRM integration
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_deal_id ON public.proposals(deal_id);

-- Create proposals storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to proposals bucket
CREATE POLICY "Authenticated users can upload proposals" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposals');

-- Allow public read access to proposals bucket
CREATE POLICY "Public read access for proposals" ON storage.objects
FOR SELECT USING (bucket_id = 'proposals');

-- Allow authenticated users to update their proposals
CREATE POLICY "Authenticated users can update proposals" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'proposals');
