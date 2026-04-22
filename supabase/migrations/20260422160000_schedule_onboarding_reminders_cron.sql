-- Migration: Daily cron firing the onboarding-reminders edge function.
-- Enables pg_cron + pg_net (no-op if already installed). Idempotent.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any prior version of this job so re-running is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'onboarding-reminders-daily') THEN
    PERFORM cron.unschedule('onboarding-reminders-daily');
  END IF;
END $$;

-- Daily at 08:00 UTC ≈ 09:00 BST / 09:00 GMT — close enough for the v1 spec.
-- Edge function has verify_jwt = false, so no Authorization header is required.
SELECT cron.schedule(
  'onboarding-reminders-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := 'https://uckvtkxicdbdavbwhqky.supabase.co/functions/v1/onboarding-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
