# Weekly Digest Edge Function

Sends a weekly promo tips email to all PromoGrind newsletter subscribers.

## Setup

1. Create a Resend account at resend.com
2. Verify your domain (vaultsparkstudios.com) in Resend
3. Set secrets:
   ```
   supabase secrets set RESEND_API_KEY=re_...
   ```
4. Deploy:
   ```
   supabase functions deploy weekly-digest
   ```
5. Schedule via Supabase cron (Dashboard → Database → Extensions → pg_cron):
   ```sql
   SELECT cron.schedule(
     'weekly-digest',
     '0 10 * * 1',  -- Every Monday at 10am UTC
     $$
     SELECT net.http_post(
       url := 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/weekly-digest',
       headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     );
     $$
   );
   ```

## Notes
- Only sends to users with `user_metadata.newsletter = true`
- Requires `SUPABASE_SERVICE_ROLE_KEY` to list users (set automatically in Edge Functions)
- The `RESEND_API_KEY` must be set manually
