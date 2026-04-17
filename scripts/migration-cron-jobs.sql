-- Cron job schedules for PromoGrind edge functions
-- Requires: pg_cron and pg_net extensions enabled in Supabase
--
-- To enable: Dashboard → Database → Extensions → enable pg_cron and pg_net
-- Apply via: Dashboard → SQL Editor → paste and run
--
-- Verify after applying:
--   SELECT jobname, schedule, command FROM cron.job;

-- Remove any existing jobs with these names before re-applying
SELECT cron.unschedule('promogrind-onboarding-drip-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'promogrind-onboarding-drip-daily');

SELECT cron.unschedule('promogrind-weekly-digest-sunday')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'promogrind-weekly-digest-sunday');

-- Daily onboarding drip — fires at 09:00 UTC every day
-- Calls the deployed `onboarding-drip` edge function
SELECT cron.schedule(
  'promogrind-onboarding-drip-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/onboarding-drip',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Weekly digest — fires at 08:00 UTC every Sunday
-- Calls the deployed `weekly-digest` edge function
SELECT cron.schedule(
  'promogrind-weekly-digest-sunday',
  '0 8 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Set the required app settings (run once per database, or add to your Supabase project's
-- pg config via Dashboard → Settings → Database → Additional config):
--
--   ALTER DATABASE postgres SET app.supabase_url = 'https://<project>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
--
-- These settings are required for the HTTP calls above. The service_role_key is
-- available in Dashboard → Settings → API → service_role (secret).
-- Never expose this key in client-side code.
