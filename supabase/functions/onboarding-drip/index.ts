import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface DripEmail {
  day: number;
  subject: string;
  headline: string;
  body: string;
  cta: string;
  ctaUrl: string;
}

const DRIP_SEQUENCE: DripEmail[] = [
  {
    day: 1,
    subject: "Welcome to PromoGrind — here's your first win",
    headline: "Start with the Bonus Bet Converter",
    body: "The fastest way to your first guaranteed profit: open a DraftKings or FanDuel account, get their signup bonus bet ($200+), and use the Bonus Bet Converter to lock in ~$130–150 in cash. Takes about 20 minutes.",
    cta: "Open Bonus Bet Converter →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/bonus-bet",
  },
  {
    day: 2,
    subject: "Your P/L Ledger is waiting — track every dollar",
    headline: "Log your first promo results",
    body: "The P/L Ledger tracks every conversion with cloud sync across devices. Log your bonus bet result and you'll have running totals, CLV tracking, and a tax export ready automatically.",
    cta: "Open P/L Ledger →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/ledger",
  },
  {
    day: 3,
    subject: "The promo calendar: $150–450/mo in recurring profit",
    headline: "Beyond signup bonuses — recurring promos",
    body: "After you complete the welcome bonuses, DraftKings, FanDuel, Caesars, and BetMGM all offer recurring weekly promos worth $150–450/month when stacked properly. The Promo Calendar shows them all with complexity ratings.",
    cta: "Open Promo Calendar →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/promo-calendar",
  },
  {
    day: 4,
    subject: "Arbitrage explained — guaranteed profit with no bonus needed",
    headline: "The Arb Calculator finds free money",
    body: "Arbitrage betting uses odds discrepancies between books to guarantee profit regardless of outcome. Our 2-Way and 3-Way Arb calculators tell you the exact stakes for each side. Margins of 1–3% are common.",
    cta: "Open Arb Calculator →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/arb-2way",
  },
  {
    day: 5,
    subject: "The Live Scanner finds arbs in real time — try it free",
    headline: "Start your 7-day VaultSparked trial",
    body: "The Live Arb and +EV Scanner monitors 40+ books in real time and alerts you when a profitable opportunity appears. VaultSparked Pro is $24.99/mo vs $99–199/mo at OddsJam and ProfitDuel. Try it free for 7 days — no credit card.",
    cta: "Start Free Trial →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/upgrade",
  },
  {
    day: 6,
    subject: "Kelly Criterion: bet the right size every time",
    headline: "Stop flat-betting. Use Kelly sizing.",
    body: "The Kelly Criterion tells you exactly what fraction of your bankroll to risk based on your edge and the odds. Our Kelly calculator also has a fractional slider (quarter-Kelly, half-Kelly) so you can dial in your risk tolerance.",
    cta: "Open Kelly Calculator →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/kelly",
  },
  {
    day: 7,
    subject: "7 days in — here's what's possible",
    headline: "Your PromoGrind roadmap",
    body: "Most grinders complete 3–4 sportsbook signups in their first week ($400–800 in guaranteed profit). With recurring promos and a live scanner, $500–1,500/month is achievable. Refer a friend through the Refer & Earn page to unlock bonus content.",
    cta: "View Refer & Earn →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/refer-earn",
  },
  {
    day: 10,
    subject: "The promo stack: how to earn $400 in a single weekend",
    headline: "Stack 3 promos at once — here's how",
    body: "Advanced grinders don't work promos one at a time. They stack: a profit boost on top of a reload bonus, used on a game where they also have an arb opportunity. The Promo Stacking Calculator shows you the combined EV of running multiple promotions simultaneously on the same event.",
    cta: "Open Promo Stacking Calculator →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/promo-stacking",
  },
  {
    day: 14,
    subject: "Two weeks in — are you leaving money on the table?",
    headline: "Your 14-day PromoGrind check-in",
    body: "After two weeks, most grinders have completed 2–3 sportsbook signups ($300–600 in profit) and are starting recurring promos. Check your P/L Ledger — if your total is below $200, you have promos still unclaimed. The Sportsbooks tab shows every book you haven't signed up for yet, with estimated value.",
    cta: "Check your Sportsbooks →",
    ctaUrl: "https://vaultsparkstudios.com/promogrind/#/sportsbooks",
  },
];

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  let sent = 0;

  const { data: users } = await supabase.auth.admin.listUsers();
  for (const user of users?.users ?? []) {
    if (!user.email || !user.created_at) continue;

    const daysSinceSignup = Math.floor(
      (now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const drip = DRIP_SEQUENCE.find(d => d.day === daysSinceSignup + 1);
    if (!drip) continue;

    // Check if this drip was already sent (stored in user metadata)
    const sentDrips: number[] = user.user_metadata?.drip_sent ?? [];
    if (sentDrips.includes(drip.day)) continue;

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:8px;">
        <div style="color:#64748b;font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Day ${drip.day} — PromoGrind</div>
        <h1 style="color:#4ade80;font-size:22px;margin-bottom:16px;">${drip.headline}</h1>
        <p style="color:#cbd5e1;line-height:1.8;margin-bottom:24px;">${drip.body}</p>
        <a href="${drip.ctaUrl}"
           style="display:inline-block;padding:12px 24px;background:#4ade80;color:#0a0e17;font-weight:700;border-radius:6px;text-decoration:none;">
          ${drip.cta}
        </a>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          PromoGrind · Free sportsbook promo conversion tools<br/>
          Must be 21+. Gamble responsibly. 1-800-GAMBLER
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PromoGrind <hello@vaultsparkstudios.com>",
        to: [user.email],
        subject: drip.subject,
        html,
      }),
    }).catch(() => null);

    if (res?.ok) {
      // Mark drip as sent in user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { drip_sent: [...sentDrips, drip.day] },
      }).catch(() => {});
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
