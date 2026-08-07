#!/usr/bin/env node
/**
 * Target-bound production smoke for the server-owned free-tier AI quota.
 * Creates one confirmed disposable user, preloads its finite quota, proves the
 * deployed Edge function returns 429 before provider egress, then deletes it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getSecret, redact } from "./lib/secrets.mjs";
import { PROMOGRIND_PROJECT_REF, assertTargetAdminUrl } from "./lib/supabase-deploy-plan.mjs";

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/smoke-ai-quota.mjs --apply\nCreates and removes one confirmed disposable production user. No provider request is made.");
  process.exit(0);
}
if (!process.argv.includes("--apply")) {
  console.error("smoke-ai-quota: --apply is required for the disposable live-user transaction");
  process.exit(2);
}

const url = getSecret("SUPABASE_URL", "supabase.admin");
const serviceKey = getSecret("SUPABASE_SERVICE_ROLE_KEY", "supabase.admin");
const anonKey = getSecret("VITE_SUPABASE_ANON_KEY", "supabase.client") || getSecret("SUPABASE_ANON_KEY", "supabase.client");
assertTargetAdminUrl(url, PROMOGRIND_PROJECT_REF);
if (!serviceKey || !anonKey) throw new Error("Target admin and browser-safe client credentials are required through the secrets gateway");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const pub = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const nonce = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const email = `quota-smoke-${nonce}@example.com`;
const password = `Pg!${crypto.randomBytes(18).toString("base64url")}9z`;
const startedAt = new Date().toISOString();
let userId = null;
let responseReceipt = null;

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data?.user?.id) throw new Error(`disposable user creation failed: ${created.error?.message || "missing id"}`);
  userId = created.data.user.id;
  const signedIn = await pub.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data?.session?.access_token) throw new Error(`disposable sign-in failed: ${signedIn.error?.message || "missing access token"}`);

  const inserted = await admin.from("ai_usage_quotas").upsert({
    user_id: userId,
    feature: "promo_advisor",
    quota_window: "lifetime",
    window_key: "lifetime",
    used: 3,
    quota_limit: 3,
  });
  if (inserted.error) throw new Error(`quota preload failed: ${inserted.error.message}`);

  const response = await fetch(`${url}/functions/v1/promo-advisor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signedIn.data.session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ promoText: "Disposable quota boundary smoke input." }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  if (response.status !== 429 || body?.remaining !== 0 || body?.quota_window !== "lifetime") {
    throw new Error(`expected lifetime quota 429, observed HTTP ${response.status}${body?.error ? ` (${body.error})` : ""}`);
  }
  responseReceipt = { status: response.status, remaining: body.remaining, quotaWindow: body.quota_window, providerEgressAvoided: true };
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) throw new Error(`disposable user cleanup failed: ${removed.error.message}`);
  }
}

const receipt = {
  schemaVersion: "1.0",
  target: PROMOGRIND_PROJECT_REF,
  startedAt,
  completedAt: new Date().toISOString(),
  disposableUserRemoved: true,
  ...responseReceipt,
};
const out = path.join("artifacts", "supabase-deploy", `${receipt.completedAt.replace(/[:.]/g, "-")}-quota-smoke.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(redact(JSON.stringify({ ok: true, receipt: out.replaceAll("\\", "/"), ...receipt }, null, 2)));
