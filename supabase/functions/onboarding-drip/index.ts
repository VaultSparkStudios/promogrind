import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hasAffirmativeMarketingConsent } from "../_shared/marketing-consent.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type ServiceClient = ReturnType<typeof createClient<any, "public", any>>;

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
    subject: "Welcome to PromoGrind — model your first offer",
    headline: "Start with the Bonus Bet Converter",
    body: "Start with an offer you already qualify for. The Bonus Bet Converter compares both settlement paths and shows a modeled return before you place anything. Actual results still depend on eligibility, prices, limits, voids, and execution.",
    cta: "Open Bonus Bet Converter →",
    ctaUrl: "https://promogrind.bet/bonus-bet",
  },
  {
    day: 2,
    subject: "Your P/L Ledger is waiting — track every dollar",
    headline: "Log your first promo results",
    body: "The P/L Ledger tracks every conversion with cloud sync across devices. Log your bonus bet result and you'll have running totals, CLV tracking, and a tax export ready automatically.",
    cta: "Open P/L Ledger →",
    ctaUrl: "https://promogrind.bet/ledger",
  },
  {
    day: 3,
    subject: "Use the promo calendar to compare recurring offers",
    headline: "Beyond signup bonuses — verify recurring promos",
    body: "Recurring offers vary by account, state, date, limits, and operator terms. The Promo Calendar organizes observed offers with complexity and freshness cues so you can verify current terms and model each decision.",
    cta: "Open Promo Calendar →",
    ctaUrl: "https://promogrind.bet/promo-calendar",
  },
  {
    day: 4,
    subject: "Arbitrage explained — model both settlement paths",
    headline: "The Arb Calculator checks price discrepancies",
    body: "Arbitrage math can show a positive modeled return across listed outcomes when all quoted prices remain available. Execution timing, limits, void rules, grading differences, and stake acceptance can change the realized result; verify both legs before committing.",
    cta: "Open Arb Calculator →",
    ctaUrl: "https://promogrind.bet/arb-2way",
  },
  {
    day: 5,
    subject: "The Live Scanner finds arbs in real time — try it free",
    headline: "Start your 7-day VaultSparked trial",
    body: "The Live Arb and +EV Scanner monitors supported books and flags price relationships for review. A flag is not a promised outcome: confirm availability, limits, market identity, and current prices before acting. The seven-day trial requires no credit card.",
    cta: "Start Free Trial →",
    ctaUrl: "https://promogrind.bet/upgrade",
  },
  {
    day: 6,
    subject: "Kelly Criterion: bet the right size every time",
    headline: "Stop flat-betting. Use Kelly sizing.",
    body: "The Kelly Criterion tells you exactly what fraction of your bankroll to risk based on your edge and the odds. Our Kelly calculator also has a fractional slider (quarter-Kelly, half-Kelly) so you can dial in your risk tolerance.",
    cta: "Open Kelly Calculator →",
    ctaUrl: "https://promogrind.bet/kelly",
  },
  {
    day: 7,
    subject: "Seven days in — review your evidence",
    headline: "Your PromoGrind review loop",
    body: "Open your P/L Ledger and compare modeled returns with realized outcomes, including skipped offers and execution friction. Use that evidence—not a population earnings claim—to decide which promo types and books deserve more attention.",
    cta: "View Refer & Earn →",
    ctaUrl: "https://promogrind.bet/refer-earn",
  },
  {
    day: 10,
    subject: "The promo stack: model interactions before combining offers",
    headline: "Check a multi-promo plan as one exposure",
    body: "Combining promotions can create coupled terms, stake, timing, and account exposure. The Promo Stacking Calculator models the combined expected value and assumptions so you can compare the plan with simpler alternatives before acting.",
    cta: "Open Promo Stacking Calculator →",
    ctaUrl: "https://promogrind.bet/promo-stacking",
  },
  {
    day: 14,
    subject: "Two weeks in — reconcile modeled and realized outcomes",
    headline: "Your 14-day PromoGrind check-in",
    body: "Review your P/L Ledger for missing settlements, unexpected drift, and reasoned skips. The Sportsbooks tab can show eligible books and modeled offer value, but availability and suitability depend on your jurisdiction, bankroll, terms, and execution constraints.",
    cta: "Check your Sportsbooks →",
    ctaUrl: "https://promogrind.bet/sportsbooks",
  },
];

const TRIAL_EXPIRY_EMAILS: Record<string, { subject: string; headline: string; body: string; cta: string; ctaUrl: string }> = {
  day4: {
    subject: "VaultSparked trial access changes in 3 days",
    headline: "Review your plan before trial access changes",
    body: "Your seven-day VaultSparked Pro trial ends in three days. Review which Live Arb Scanner, +EV Scanner, and AI Action Plan features you use, then compare the monthly and annual plans if continued access fits your workflow.",
    cta: "Review Plans →",
    ctaUrl: "https://promogrind.bet/upgrade",
  },
  day6: {
    subject: "VaultSparked trial access changes tomorrow",
    headline: "Choose the access level that fits your workflow",
    body: "Your VaultSparked Pro trial ends tomorrow. Live Arb Scanner, +EV Scanner, and AI Action Plan access will then follow your selected plan. Review the options without urgency pressure and choose only if the features are useful to you.",
    cta: "Review Plans →",
    ctaUrl: "https://promogrind.bet/upgrade",
  },
};

async function processTrialExpiryEmails(
  supabase: ServiceClient,
  from: string
): Promise<number> {
  let sent = 0;
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const now = new Date();

    for (const user of users?.users ?? []) {
      if (!user.email || !hasAffirmativeMarketingConsent(user.user_metadata)) continue;
      const trialStart = user.user_metadata?.trial_start;
      if (!trialStart) continue;

      const daysSinceTrial = Math.floor(
        (now.getTime() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24)
      );

      const trialEmailsSent: string[] = user.user_metadata?.trial_emails_sent ?? [];
      let emailKey: string | null = null;
      if (daysSinceTrial === 4) emailKey = "day4";
      else if (daysSinceTrial === 6) emailKey = "day6";

      if (!emailKey || trialEmailsSent.includes(emailKey)) continue;

      const tmpl = TRIAL_EXPIRY_EMAILS[emailKey];
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:8px;">
          <div style="color:#f59e0b;font-size:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">VaultSparked Trial — PromoGrind</div>
          <h1 style="color:#fbbf24;font-size:22px;margin-bottom:16px;">${tmpl.headline}</h1>
          <p style="color:#cbd5e1;line-height:1.8;margin-bottom:24px;">${tmpl.body}</p>
          <a href="${tmpl.ctaUrl}"
             style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;font-weight:700;border-radius:6px;text-decoration:none;">
            ${tmpl.cta}
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
        body: JSON.stringify({ from, to: [user.email], subject: tmpl.subject, html }),
      }).catch(() => null);

      if (res?.ok) {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { trial_emails_sent: [...trialEmailsSent, emailKey] },
        }).catch(() => {});
        sent++;
      }
    }
  } catch (e) {
    console.error("processTrialExpiryEmails error:", e);
  }
  return sent;
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const from = "PromoGrind <hello@vaultsparkstudios.com>";
  const now = new Date();
  let sent = 0;

  const { data: users } = await supabase.auth.admin.listUsers();
  for (const user of users?.users ?? []) {
    if (!user.email || !user.created_at || !hasAffirmativeMarketingConsent(user.user_metadata)) continue;

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
      body: JSON.stringify({ from, to: [user.email], subject: drip.subject, html }),
    }).catch(() => null);

    if (res?.ok) {
      // Mark drip as sent in user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { drip_sent: [...sentDrips, drip.day] },
      }).catch(() => {});
      sent++;
    }
  }

  // Process trial expiry warning emails (separate from drip sequence)
  const trialSent = await processTrialExpiryEmails(supabase, from);

  return new Response(JSON.stringify({ sent, trialSent }), {
    headers: { "Content-Type": "application/json" },
  });
});
