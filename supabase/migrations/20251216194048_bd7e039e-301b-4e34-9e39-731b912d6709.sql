-- Add new fields to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS probability integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS expected_close_date date,
ADD COLUMN IF NOT EXISTS loss_reason text;

-- Create deal_activities table for activity history
CREATE TABLE public.deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL,
  activity_type text NOT NULL, -- 'call', 'email', 'whatsapp', 'meeting', 'visit', 'note'
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on deal_activities
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_activities
CREATE POLICY "Brokers can view their own deal activities"
ON public.deal_activities FOR SELECT
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own deal activities"
ON public.deal_activities FOR INSERT
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own deal activities"
ON public.deal_activities FOR UPDATE
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own deal activities"
ON public.deal_activities FOR DELETE
USING (auth.uid() = broker_id);

-- Create deal_tasks table for follow-ups and tasks
CREATE TABLE public.deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on deal_tasks
ALTER TABLE public.deal_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_tasks
CREATE POLICY "Brokers can view their own deal tasks"
ON public.deal_tasks FOR SELECT
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own deal tasks"
ON public.deal_tasks FOR INSERT
WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers can update their own deal tasks"
ON public.deal_tasks FOR UPDATE
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can delete their own deal tasks"
ON public.deal_tasks FOR DELETE
USING (auth.uid() = broker_id);

-- Create deal_stage_history table for tracking stage changes
CREATE TABLE public.deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- Enable RLS on deal_stage_history
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for deal_stage_history
CREATE POLICY "Brokers can view their own deal stage history"
ON public.deal_stage_history FOR SELECT
USING (auth.uid() = broker_id);

CREATE POLICY "Brokers can insert their own deal stage history"
ON public.deal_stage_history FOR INSERT
WITH CHECK (auth.uid() = broker_id);

-- Create trigger to update updated_at on deal_activities
CREATE TRIGGER update_deal_activities_updated_at
BEFORE UPDATE ON public.deal_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at on deal_tasks
CREATE TRIGGER update_deal_tasks_updated_at
BEFORE UPDATE ON public.deal_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();