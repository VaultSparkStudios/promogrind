import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Resend: batch to avoid rate limits (100/day free, 1000/day pro)
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY) && !req.headers.get('x-cron-key')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // freq param lets cron callers specify which cadence to send today
  // e.g. POST body { "freq": "weekly" } or { "freq": "daily" }
  let targetFreq = 'weekly';
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.freq) targetFreq = body.freq;
  } catch { /* no body */ }

  const isFirstWeekOfMonth = new Date().getDate() <= 7;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: users } = await supabase.auth.admin.listUsers();
  const subscribers = (users?.users ?? []).filter(u => {
    const meta = u.user_metadata ?? {};
    if (!meta.newsletter) return false;
    const freq = meta.newsletter_freq ?? 'weekly';
    if (targetFreq === 'daily') return freq === 'daily';
    if (targetFreq === 'weekly') return freq === 'weekly' || freq === 'daily'; // daily gets weekly too
    if (targetFreq === 'monthly') return isFirstWeekOfMonth; // monthly = first weekly of month
    return freq === targetFreq;
  });

  if (!subscribers.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No matching subscribers' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send in batches
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(user => sendEmail(user.email ?? '', user.user_metadata ?? {}, supabase, user.id))
    );
    sent += results.filter(r => r.status === 'fulfilled').length;
    failed += results.filter(r => r.status === 'rejected').length;
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: subscribers.length, freq: targetFreq }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

interface WeekStats {
  weeklyPnl: number | null;
  topBook: string | null;
  entryCount: number;
  loginCount: number;
}

async function getUserWeekStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<WeekStats> {
  const result: WeekStats = { weeklyPnl: null, topBook: null, entryCount: 0, loginCount: 0 };
  try {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(sevenDaysAgoMs).toISOString().slice(0, 10);

    // Fetch ledger and login count in parallel (independent queries)
    const [{ data: pgData }, { count }] = await Promise.all([
      supabase.from('promogrind_data').select('ledger').eq('user_id', userId).maybeSingle(),
      supabase.from('vault_events').select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('event_type', 'daily_login')
        .gte('created_at', new Date(sevenDaysAgoMs).toISOString()),
    ]);

    result.loginCount = count ?? 0;

    if (pgData?.ledger && Array.isArray(pgData.ledger)) {
      const recentEntries = pgData.ledger.filter((e: Record<string, unknown>) =>
        typeof e.date === 'string' && e.date >= sevenDaysAgo
      );
      result.entryCount = recentEntries.length;
      if (recentEntries.length > 0) {
        result.weeklyPnl = recentEntries.reduce(
          (s: number, e: Record<string, unknown>) => s + (parseFloat(String(e.profit ?? 0)) || 0), 0
        );
        // Top book by P/L
        const bookMap: Record<string, number> = {};
        for (const e of recentEntries) {
          const book = typeof e.book === 'string' ? e.book : 'Unknown';
          bookMap[book] = (bookMap[book] ?? 0) + (parseFloat(String(e.profit ?? 0)) || 0);
        }
        result.topBook = Object.entries(bookMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      }
    }
  } catch (e) {
    console.error(`[weekly-digest] getUserWeekStats failed for ${userId}:`, e);
  }
  return result;
}

function buildWeekStatsHtml(stats: WeekStats): string {
  let actionItem = 'Keep your streak going — check today\'s promo schedule →';
  if (stats.entryCount === 0) {
    actionItem = 'You haven\'t logged any bets this week. Check the Promo Calendar for today\'s offers →';
  } else if (stats.weeklyPnl !== null && stats.weeklyPnl > 100) {
    actionItem = 'Great week! Log your results in the Ledger to track your annual total →';
  }

  const pnlColor = stats.weeklyPnl !== null && stats.weeklyPnl >= 0 ? '#4ade80' : '#f87171';
  const pnlStr = stats.weeklyPnl !== null
    ? `${stats.weeklyPnl >= 0 ? '+' : ''}$${Math.abs(stats.weeklyPnl).toFixed(2)}`
    : null;

  return `
      <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:16px;">
        <h2 style="color:#a78bfa;font-size:15px;font-weight:700;margin-bottom:12px;">📊 Your Week</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${pnlStr ? `<tr><td style="color:#64748b;padding:4px 0;">P/L this week</td><td style="color:${pnlColor};font-weight:700;text-align:right;">${pnlStr}</td></tr>` : ''}
          ${stats.topBook ? `<tr><td style="color:#64748b;padding:4px 0;">Top book</td><td style="color:#e2e8f0;font-weight:600;text-align:right;">${stats.topBook}</td></tr>` : ''}
          <tr><td style="color:#64748b;padding:4px 0;">Days active</td><td style="color:#e2e8f0;text-align:right;">${stats.loginCount}/7</td></tr>
        </table>
        <p style="color:#64748b;font-size:12px;margin-top:12px;margin-bottom:0;line-height:1.6;">
          💡 ${actionItem}
        </p>
      </div>
  `;
}

async function sendEmail(to: string, meta: Record<string, unknown>, supabase: ReturnType<typeof createClient>, userId: string) {
  const firstName = typeof meta.full_name === 'string'
    ? meta.full_name.split(' ')[0]
    : null;
  const greeting = firstName ? `Hey ${firstName},` : 'Hey Grinder,';

  const stats = await getUserWeekStats(supabase, userId);
  const weekStatsHtml = buildWeekStatsHtml(stats);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:12px;">
      <div style="margin-bottom:24px;">
        <span style="display:inline-block;background:#4ade8015;border:1px solid #4ade8030;border-radius:50px;padding:4px 14px;font-size:11px;color:#4ade80;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">PromoGrind Weekly</span>
      </div>

      <h1 style="color:#e2e8f0;font-size:22px;font-weight:700;margin-bottom:4px;">Your weekly promo briefing</h1>
      <p style="color:#64748b;font-size:13px;margin-bottom:28px;">${greeting}</p>

      <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:16px;">
        <h2 style="color:#fbbf24;font-size:15px;font-weight:700;margin-bottom:10px;">🔥 This Week's Best Plays</h2>
        <ul style="color:#94a3b8;font-size:13px;line-height:1.9;margin:0;padding-left:18px;">
          <li><strong style="color:#e2e8f0;">Profit Boosts</strong> — Check DraftKings, FanDuel &amp; Caesars every morning. 2–5 boosts/day = $5–20 per conversion.</li>
          <li><strong style="color:#e2e8f0;">Stepped Up Parlays</strong> — DraftKings posts these Tuesdays. Use the Profit Boost Converter to lock in guaranteed profit.</li>
          <li><strong style="color:#e2e8f0;">FanDuel SGP Insurance</strong> — Weekends. $10–25 in bonus bets if your SGP loses. Convert at 70% with the Bonus Bet Converter.</li>
        </ul>
      </div>

      <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:16px;">
        <h2 style="color:#60a5fa;font-size:15px;font-weight:700;margin-bottom:10px;">💡 Tip of the Week</h2>
        <p style="color:#94a3b8;font-size:13px;line-height:1.7;">
          Use the <strong style="color:#e2e8f0;">Deposit Optimizer</strong> to figure out which books to fund first for maximum guaranteed EV.
          Enter your bankroll and state — it ranks every book by expected value so you never leave money on the table.
        </p>
      </div>

      <div style="background:#0f1520;border:1px solid #1e293b;border-radius:8px;padding:20px;margin-bottom:28px;">
        <h2 style="color:#4ade80;font-size:15px;font-weight:700;margin-bottom:10px;">📊 Keep Your Records Clean</h2>
        <p style="color:#94a3b8;font-size:13px;line-height:1.7;">
          All gambling winnings are taxable income. Use the <strong style="color:#e2e8f0;">P/L Ledger → Export Tax CSV</strong>
          feature to download a tax-ready file at any time. Your future self will thank you.
        </p>
      </div>

      ${weekStatsHtml}

      <a href="https://vaultsparkstudios.com/promogrind/"
         style="display:inline-block;background:#4ade80;color:#0a0e17;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:28px;">
        Open PromoGrind →
      </a>

      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0;" />

      <p style="color:#334155;font-size:11px;line-height:1.7;">
        You're receiving this because you subscribed to PromoGrind weekly tips.<br/>
        To unsubscribe or change frequency: open PromoGrind → scroll to the bottom → use the newsletter banner.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PromoGrind <tips@vaultsparkstudios.com>',
      to,
      subject: 'PromoGrind: This week\'s best promo plays 🎯',
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
