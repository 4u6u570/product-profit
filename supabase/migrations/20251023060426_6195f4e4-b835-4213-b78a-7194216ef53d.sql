-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create activity_logs table to track simulated background activities
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  success BOOLEAN DEFAULT true
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read activity logs (public information)
CREATE POLICY "Activity logs are viewable by everyone"
ON public.activity_logs
FOR SELECT
USING (true);

-- Policy to allow the service role to insert activity logs
CREATE POLICY "Service role can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries on recent activities
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at 
ON public.activity_logs(created_at DESC);

-- Enable realtime for activity_logs table
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Schedule cron job to run every 4 hours
-- This will call the edge function that simulates background activity
SELECT cron.schedule(
  'simulate-background-activity',
  '0 */4 * * *', -- Every 4 hours at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://odnnrqjddkxbxstxyleu.supabase.co/functions/v1/simulate-activity',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbm5ycWpkZGt4YnhzdHh5bGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNzQ2NzEsImV4cCI6MjA2OTg1MDY3MX0.JJuHl-Ollbf-5DQdRg9HyL0aW3m7dlGRn87OErNaROs"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);