import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const body = await req.json();
    const recipientEmail: string = (body.recipientEmail ?? "").trim();
    if (!recipientEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: CORS });
    }

    // Rate limit: max 5 gifts per sender per 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("gift_tokens")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", thirtyDaysAgo);
    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Gift limit reached — max 5 gifts per 30 days" }),
        { status: 429, headers: CORS }
      );
    }

    const giftToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("gift_tokens").insert({
      token: giftToken,
      sender_id: user.id,
      sender_email: user.email,
      recipient_email: recipientEmail,
      days: 14,
      expires_at: expiresAt,
      redeemed: false,
    });
    if (insertErr) throw new Error(insertErr.message);

    const giftUrl = `https://vaultsparkstudios.com/promogrind/?gift=${giftToken}`;

    // Send email if Resend is configured
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:8px;">
          <h1 style="color:#4ade80;font-size:22px;margin-bottom:8px;">🎁 You've been gifted 14 days of VaultSparked Pro</h1>
          <p style="color:#94a3b8;margin-bottom:20px;">Your friend <strong style="color:#e2e8f0">${user.email}</strong> gifted you 14 days of full Pro access to PromoGrind.</p>
          <ul style="color:#94a3b8;padding-left:20px;margin-bottom:24px;line-height:2;">
            <li>Live Arb Scanner — real-time arbitrage across 40+ books</li>
            <li>+EV Scanner — positive expected value picks with Kelly sizing</li>
            <li>All 50+ PromoGrind tools — free forever even after trial</li>
          </ul>
          <a href="${giftUrl}" style="display:inline-block;padding:14px 28px;background:#4ade80;color:#0a0e17;font-weight:700;border-radius:6px;text-decoration:none;font-size:15px;">
            Claim Your 14 Days Free →
          </a>
          <p style="color:#334155;font-size:11px;margin-top:24px;">Link expires in 30 days. Must be 21+. Gamble responsibly. 1-800-GAMBLER</p>
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
          to: [recipientEmail],
          subject: `${user.email} gifted you 14 days of PromoGrind Pro 🎁`,
          html,
        }),
      }).catch(() => {});
    }

    // Award 7 bonus days to sender in user_metadata
    const currentBonus = (user.user_metadata?.gift_bonus_days ?? 0) as number;
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, gift_bonus_days: currentBonus + 7 },
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, giftUrl, expiresAt }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
