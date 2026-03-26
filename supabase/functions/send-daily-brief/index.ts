/**
 * PromoGrind — Send Daily Brief Push Notifications
 *
 * Sends a 9am push notification to all VaultSparked subscribers who have
 * active push subscriptions in the push_subscriptions table.
 *
 * Deployment:
 *   supabase functions deploy send-daily-brief
 *
 * Scheduling (Supabase Cron — set in dashboard):
 *   Schedule: 0 14 * * *   (9am EST = 14:00 UTC)
 *   Function: send-daily-brief
 *
 * Required secrets:
 *   supabase secrets set VAPID_PUBLIC_KEY=...    (from: npx web-push generate-vapid-keys)
 *   supabase secrets set VAPID_PRIVATE_KEY=...
 *   supabase secrets set VAPID_SUBJECT=mailto:hello@vaultsparkstudios.com
 *
 * Prerequisites:
 *   Run scripts/migration-push-subscriptions.sql in Supabase SQL Editor first.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@vaultsparkstudios.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async () => {
  try {
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

    const payload = JSON.stringify({
      title: 'PromoGrind Daily Briefing',
      body: "Good morning! Check today's promos and open bets.",
      icon: '/promogrind/favicon.svg',
      badge: '/promogrind/favicon.svg',
      url: 'https://vaultsparkstudios.com/promogrind/',
      tag: 'daily-brief',
      renotify: false,
    });

    let sent = 0;
    let failed = 0;
    const expired: string[] = [];

    for (let i = 0; i < subs.length; i += 50) {
      const batch = subs.slice(i, i + 50);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth_key },
              },
              payload,
              { TTL: 86400 },
            );
            sent++;
          } catch (err: any) {
            // 410 Gone / 404 = subscription expired, remove it
            if (err.statusCode === 410 || err.statusCode === 404) {
              expired.push(sub.endpoint);
            }
            failed++;
          }
        })
      );
    }

    // Mark expired subscriptions inactive in bulk
    if (expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ active: false })
        .in('endpoint', expired);
    }

    // Stamp last_sent_at on all still-active subscriptions
    await supabase
      .from('push_subscriptions')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('active', true);

    return new Response(
      JSON.stringify({ sent, failed, expired: expired.length, total: subs.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
