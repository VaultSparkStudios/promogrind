/**
 * PromoGrind — Send Daily Brief Push Notifications
 *
 * Sends a 9am push notification to all VaultSparked subscribers who have
 * enabled the daily briefing feature (pg_daily_brief = true in their metadata).
 *
 * Deployment:
 *   supabase functions deploy send-daily-brief
 *
 * Scheduling (Supabase Cron — set in dashboard):
 *   Schedule: 0 14 * * *   (9am EST = 14:00 UTC)
 *   Function: send-daily-brief
 *
 * Required secrets:
 *   supabase secrets set VAPID_PUBLIC_KEY=...
 *   supabase secrets set VAPID_PRIVATE_KEY=...
 *   supabase secrets set VAPID_SUBJECT=mailto:hello@vaultsparkstudios.com
 *
 * NOTE: This function is a prepared skeleton — not yet deployed.
 * Current v9.0 uses in-browser Notification API (works while app is open).
 * Deploy this when upgrading to server-sent push (works even when app is closed).
 * Requires: migration-push-subscriptions.sql to be run first.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@vaultsparkstudios.com';

Deno.serve(async () => {
  try {
    // Get active VaultSparked subscribers with push subscriptions enabled
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key, user_id')
      .eq('active', true)
      .limit(500);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active subscriptions' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build notification payload
    const payload = JSON.stringify({
      title: 'PromoGrind Daily Briefing',
      body: "Good morning! Check today's promos and open bets.",
      icon: '/promogrind/favicon.svg',
      badge: '/promogrind/favicon.svg',
      url: '/promogrind/dashboard',
      tag: 'daily-brief',
      renotify: false,
    });

    let sent = 0;
    let failed = 0;

    // Send notifications in batches of 50
    for (let i = 0; i < subs.length; i += 50) {
      const batch = subs.slice(i, i + 50);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            // Use web-push compatible fetch with VAPID headers
            // In production, use the webpush npm package or equivalent Deno module
            const response = await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
                // VAPID authorization header would be built here
                // Authorization: `vapid t=<jwt>,k=<public_key>`
              },
              body: payload,
            });
            if (response.ok || response.status === 201) {
              sent++;
            } else if (response.status === 410) {
              // Subscription expired — mark inactive
              await supabase
                .from('push_subscriptions')
                .update({ active: false })
                .eq('endpoint', sub.endpoint);
              failed++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        })
      );
    }

    // Update last_sent_at for successful sends
    await supabase
      .from('push_subscriptions')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('active', true);

    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
