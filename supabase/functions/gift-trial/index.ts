import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, json } from "../_shared/http.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const GIFT_TERMS = Object.freeze({ recipientDays: 14, senderBonusDays: 7, limitCount: 5, limitWindowDays: 30, claimWindowDays: 30 });

function generateToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(req, { error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const recipientEmail: string = (body.recipientEmail ?? "").trim();
    if (!recipientEmail.includes("@")) {
      return json(req, { error: "Invalid email" }, 400);
    }

    // Rate limit: max 5 gifts per sender per 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("gift_tokens")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", thirtyDaysAgo);
    if ((count ?? 0) >= GIFT_TERMS.limitCount) {
      return json(req, { error: `Gift limit reached — max ${GIFT_TERMS.limitCount} gifts per ${GIFT_TERMS.limitWindowDays} days` }, 429);
    }

    const giftToken = generateToken();
    const expiresAt = new Date(Date.now() + GIFT_TERMS.claimWindowDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("gift_tokens").insert({
      token: giftToken,
      sender_id: user.id,
      sender_email: user.email,
      recipient_email: recipientEmail,
      days: GIFT_TERMS.recipientDays,
      expires_at: expiresAt,
      redeemed: false,
    });
    if (insertErr) throw new Error(insertErr.message);

    const giftUrl = `https://promogrind.bet/?gift=${giftToken}`;

    let delivery: { status: "not-configured" | "accepted" | "rejected"; provider: "resend" | null; httpStatus?: number } = {
      status: "not-configured",
      provider: null,
    };
    // Provider acceptance is recorded separately from token issuance. It is not inbox-delivery proof.
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0e17;color:#e2e8f0;padding:32px;border-radius:8px;">
          <h1 style="color:#4ade80;font-size:22px;margin-bottom:8px;">You've been gifted ${GIFT_TERMS.recipientDays} days of PromoGrind workspace access</h1>
          <p style="color:#94a3b8;margin-bottom:20px;">A PromoGrind user created a workspace gift link for you.</p>
          <ul style="color:#94a3b8;padding-left:20px;margin-bottom:24px;line-height:2;">
            <li>Calculator and tracking workspace access</li>
            <li>Provider-backed tools remain subject to their live capability status</li>
            <li>No payment method is attached by this gift link</li>
          </ul>
          <a href="${giftUrl}" style="display:inline-block;padding:14px 28px;background:#4ade80;color:#0a0e17;font-weight:700;border-radius:6px;text-decoration:none;font-size:15px;">
            Claim Your ${GIFT_TERMS.recipientDays} Days Free →
          </a>
          <p style="color:#334155;font-size:11px;margin-top:24px;">Link expires in ${GIFT_TERMS.claimWindowDays} days. Must be 21+. Gamble responsibly. 1-800-GAMBLER</p>
        </div>
      `;
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PromoGrind <promos@vaultsparkstudios.com>",
          to: [recipientEmail],
          subject: `A PromoGrind user gifted you ${GIFT_TERMS.recipientDays} workspace days`,
          html,
        }),
      });
      delivery = { status: emailResponse.ok ? "accepted" : "rejected", provider: "resend", httpStatus: emailResponse.status };
    }

    // Attempt the canonical sender bonus at token issuance, independent of email acceptance.
    const currentBonus = (user.user_metadata?.gift_bonus_days ?? 0) as number;
    const { error: senderBonusError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, gift_bonus_days: currentBonus + GIFT_TERMS.senderBonusDays },
    });
    const reward = {
      ...GIFT_TERMS,
      senderBonus: {
        status: senderBonusError ? "failed" : "recorded",
        days: GIFT_TERMS.senderBonusDays,
      },
    };

    return json(req, { ok: true, giftUrl, expiresAt, reward, delivery });
  } catch (e) {
    return json(req, { error: (e as Error).message }, 500);
  }
});
