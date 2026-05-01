SELECT cron.schedule(
  'audit-logs-daily-retention',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/audit-logs-retention',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbG1tcnFkaXljbWRoaHNseGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzM2NTEsImV4cCI6MjA4NjA0OTY1MX0.JguIpjztfrbKMiHQq66ltc2ZviexKR3lUTJ3LUbmpsA"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);