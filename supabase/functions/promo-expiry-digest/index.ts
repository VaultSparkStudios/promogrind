import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Promos that have fixed expiry dates or time-sensitive windows
// In production this would be dynamic; for now we surface the daily/weekly ones
const URGENT_PROMOS = [
  { book: "DraftKings", promo: "Stepped Up Parlay", day: "Tuesday", value: "$10-25" },
  { book: "FanDuel", promo: "SGP Insurance", day: "Weekend", value: "$10-25" },
  { book: "Caesars", promo: "Bonus Bet Wednesday", day: "Wednesday", value: "$10-25" },
];

serve(async (req) => {
  // Verify this is a scheduled invocation (cron or internal)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.includes("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDay = dayNames[today.getDay()];
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  // Find promos relevant today
  const todayPromos = URGENT_PROMOS.filter(p =>
    p.day === todayDay || (p.day === "Weekend" && isWeekend)
  );

  if (todayPromos.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no promos today" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch newsletter subscribers
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const subscribers = (users?.users ?? []).filter(
    u => u.user_metadata?.newsletter === true
  );

  let sent = 0;
  for (const user of subscribers) {
    if (!user.email) continue;
    const freq = user.user_metadata?.newsletter_freq ?? "weekly";
    if (freq !== "daily" && freq !== "3x") continue; // only daily/3x get expiry digests

    const promoList = todayPromos
      .map(p => `<li><strong>${p.book}</strong> — ${p.promo} (Est. ${p.value})</li>`)
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:8px;">
        <h1 style="color:#4ade80;font-size:24px;margin-bottom:8px;">PromoGrind — Today's Promos</h1>
        <p style="color:#94a3b8;margin-bottom:24px;">Here are the time-sensitive promos available today, ${todayDay}.</p>
        <ul style="padding-left:20px;margin-bottom:24px;">${promoList}</ul>
        <a href="https://promogrind.bet/#/promo-calendar"
           style="display:inline-block;padding:12px 24px;background:#4ade80;color:#0a0e17;font-weight:700;border-radius:6px;text-decoration:none;">
          Open PromoGrind →
        </a>
        <p style="color:#475569;font-size:12px;margin-top:32px;">
          You're receiving this because you subscribed to PromoGrind promo alerts.<br/>
          Must be 21+. Gamble responsibly. 1-800-GAMBLER
        </p>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PromoGrind <promos@vaultsparkstudios.com>",
        to: [user.email],
        subject: `${todayPromos.length} promo${todayPromos.length > 1 ? "s" : ""} available today — PromoGrind`,
        html,
      }),
    }).catch(() => {});
    sent++;
  }

  return new Response(JSON.stringify({ sent, promos: todayPromos.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
