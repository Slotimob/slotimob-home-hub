-- Add UTM and origin tracking fields to leads table

-- Standard UTM parameters
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS utm_content text;

-- Meta Ads specific fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_ad_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_adset_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_campaign_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_ad_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_adset_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS meta_placement text;

-- Google Ads specific fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gclid text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_keyword text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_matchtype text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_network text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_device text;

-- General origin tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS landing_page text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS referrer_url text;

-- Create indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON public.leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_leads_utm_medium ON public.leads(utm_medium);
CREATE INDEX IF NOT EXISTS idx_leads_origin ON public.leads(origin);