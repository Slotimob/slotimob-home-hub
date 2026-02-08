-- Create notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL,
  lead_email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('24h', '2h')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Brokers can view their own notification logs"
ON public.notification_logs
FOR SELECT
USING (auth.uid() = broker_id);

-- Add lead confirmation field to visits
ALTER TABLE public.visits
ADD COLUMN lead_confirmed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN lead_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_notification_logs_broker_id ON public.notification_logs(broker_id);
CREATE INDEX idx_notification_logs_visit_id ON public.notification_logs(visit_id);