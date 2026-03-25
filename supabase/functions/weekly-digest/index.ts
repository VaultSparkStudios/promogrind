import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  // Verify this is a cron invocation or an admin request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY) && !req.headers.get('x-cron-key')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get all newsletter subscribers
  const { data: users } = await supabase.auth.admin.listUsers();
  const subscribers = (users?.users ?? []).filter(u => u.user_metadata?.newsletter === true);

  if (!subscribers.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send via Resend
  const results = await Promise.allSettled(
    subscribers.map(user =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PromoGrind <tips@vaultsparkstudios.com>',
          to: user.email,
          subject: 'PromoGrind: Best promo opportunities this week',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:12px;">
              <h1 style="color:#4ade80;font-size:24px;margin-bottom:8px;">Weekly Promo Tips</h1>
              <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">Your PromoGrind weekly digest</p>

              <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:16px;">
                <h2 style="color:#fbbf24;font-size:16px;margin-bottom:8px;">This Week's Best Plays</h2>
                <p style="color:#94a3b8;font-size:13px;line-height:1.7;">
                  Check your sportsbook apps each morning for profit boosts. DraftKings, FanDuel, and Caesars
                  offer 2–5 boosts daily. Use the Profit Boost Converter at PromoGrind to lock in guaranteed profit.
                </p>
              </div>

              <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:24px;">
                <h2 style="color:#60a5fa;font-size:16px;margin-bottom:8px;">Reminder: Log your wins</h2>
                <p style="color:#94a3b8;font-size:13px;line-height:1.7;">
                  Keep your P/L Ledger updated — all gambling winnings are taxable.
                  Export your ledger at tax time for easy reporting.
                </p>
              </div>

              <a href="https://vaultsparkstudios.com/promogrind/"
                 style="display:inline-block;background:#4ade80;color:#0a0e17;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
                Open PromoGrind →
              </a>

              <p style="color:#334155;font-size:11px;margin-top:24px;">
                You're receiving this because you subscribed to weekly tips in PromoGrind.
                To unsubscribe, open PromoGrind → scroll to the email capture banner → it will show an unsubscribe option.
              </p>
            </div>
          `,
        }),
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return new Response(JSON.stringify({ sent, failed, total: subscribers.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
