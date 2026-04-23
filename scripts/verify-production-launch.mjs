import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  return Object.fromEntries(
    fs.readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );
}

function report(name, ok, detail, extra = {}) {
  return { name, ok, detail, ...extra };
}

async function checkTable(admin, table, select = "*") {
  const { data, error } = await admin.from(table).select(select).limit(1);
  if (error) return report(table, false, error.message, { code: error.code || null });
  return report(table, true, "reachable", { sampleCount: Array.isArray(data) ? data.length : 0 });
}

async function main() {
  const adminEnv = readEnvFile(".env.admin");
  const clientEnv = readEnvFile(".env");

  const admin = createClient(adminEnv.SUPABASE_URL, adminEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pub = createClient(clientEnv.VITE_SUPABASE_URL, clientEnv.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];

  for (const table of ["workflow_state", "workflow_history", "ledger_state", "tracker_state"]) {
    results.push(await checkTable(admin, table));
  }

  results.push(await checkTable(admin, "feature_flags"));
  results.push(await checkTable(admin, "push_subscriptions"));

  results.push(report(
    "vapid_public_env",
    Boolean(clientEnv.VITE_VAPID_PUBLIC_KEY),
    clientEnv.VITE_VAPID_PUBLIC_KEY ? "present" : "missing from .env / build env",
  ));

  const email = `codex-launch-${Date.now()}@example.com`;
  const password = "PromoGrind!23456";

  const signUp = await pub.auth.signUp({ email, password });
  results.push(report(
    "public_signup",
    !signUp.error,
    signUp.error ? signUp.error.message : "sign-up request accepted",
  ));

  if (!signUp.error) {
    const signIn = await pub.auth.signInWithPassword({ email, password });
    const signInExpected = !signIn.error || /email not confirmed/i.test(signIn.error?.message || "");
    results.push(report(
      "public_signin",
      signInExpected,
      signIn.error ? signIn.error.message : "sign-in succeeded",
    ));
  }

  const billingEmail = `codex-billing-${Date.now()}@example.com`;
  const created = await admin.auth.admin.createUser({ email: billingEmail, password, email_confirm: true });
  results.push(report(
    "confirmed_test_user",
    !created.error,
    created.error ? created.error.message : "confirmed billing-smoke user created",
  ));

  if (!created.error) {
    const billingSignIn = await pub.auth.signInWithPassword({ email: billingEmail, password });
    results.push(report(
      "confirmed_signin",
      !billingSignIn.error,
      billingSignIn.error ? billingSignIn.error.message : "confirmed user sign-in succeeded",
    ));

    const accessToken = billingSignIn.data?.session?.access_token;
    if (accessToken) {
      const invoke = async (name, body = {}) => {
        const res = await fetch(`${adminEnv.SUPABASE_URL}/functions/v1/${name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });
        return report(
          name,
          res.ok || (name === "customer-portal" && res.status === 404),
          await res.text(),
          { status: res.status },
        );
      };

      results.push(await invoke("create-checkout", { plan: "scout_monthly", attribution: { referral_source: "launch-check" } }));
      results.push(await invoke("customer-portal", {}));
    }
  }

  const configuredAffiliateBooks = (await import("../src/books.js"))
    .BOOKS
    .filter((book) => typeof book.affiliateLink === "string" && book.affiliateLink.trim())
    .map((book) => book.name);

  const configuredReferralBooks = (await import("../src/books.js"))
    .BOOKS
    .filter((book) => typeof book.referralLink === "string" && book.referralLink.trim())
    .map((book) => book.name);

  results.push(report(
    "affiliate_coverage",
    configuredAffiliateBooks.length > 0,
    `affiliate links configured for ${configuredAffiliateBooks.length} books`,
    { books: configuredAffiliateBooks },
  ));
  results.push(report(
    "monetization_coverage",
    configuredReferralBooks.length > 0 || configuredAffiliateBooks.length > 0,
    `monetization links configured for ${new Set([...configuredAffiliateBooks, ...configuredReferralBooks]).size} books`,
    { referralBooks: configuredReferralBooks },
  ));

  const failed = results.filter((item) => !item.ok);
  console.log(JSON.stringify({
    ok: failed.length === 0,
    failedCount: failed.length,
    results,
  }, null, 2));

  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, fatal: error.message }, null, 2));
  process.exit(1);
});
