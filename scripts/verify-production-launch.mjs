import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  BOOKS,
  getConfiguredAffiliateCount,
  getConfiguredMonetizationCount,
  getRequiredLaunchMonetizationStatus,
  hasConfiguredAffiliateUrl,
  hasConfiguredMonetizationUrl,
} from "../src/books.js";

function readEnvFile(path) {
  return Object.fromEntries(
    fs.readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const [key, value = ""] = line.split(/=(.*)/s).slice(0, 2);
        return [key.trim(), value.trim()];
      }),
  );
}

function report(name, ok, detail, extra = {}) {
  return { name, ok, detail, ...extra };
}

function advisoryReport(name, ok, detail, extra = {}) {
  return report(name, ok, detail, { severity: "advisory", ...extra });
}

export function describeAuthError(error) {
  if (!error) return "unknown authentication error";

  const message = error.message;
  const nestedMessage = message && typeof message === "object"
    ? message.message || message.error || message.msg
    : null;
  const readableMessage = typeof message === "string" && message.trim()
    ? message.trim()
    : typeof nestedMessage === "string" && nestedMessage.trim()
      ? nestedMessage.trim()
      : null;
  const identity = [
    typeof error.name === "string" ? error.name : null,
    error.status ? `status ${error.status}` : null,
    typeof error.code === "string" ? `code ${error.code}` : null,
  ].filter(Boolean).join(", ");

  return [readableMessage, identity].filter(Boolean).join(" — ")
    || "authentication request failed without a readable provider message";
}

export function describeFunctionResponse(name, status, rawBody) {
  if (status >= 200 && status < 300) {
    return name === "create-checkout"
      ? "checkout session created"
      : name === "customer-portal"
        ? "customer portal session created"
        : "function request succeeded";
  }

  if (name === "customer-portal" && status === 404) {
    return "no billing record for disposable probe user (expected)";
  }

  try {
    const payload = JSON.parse(rawBody);
    const candidate = payload?.error?.message
      || payload?.error
      || payload?.message
      || payload?.code;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  } catch {
    // Provider bodies are intentionally not copied into public CI artifacts.
  }

  return `function request failed with HTTP ${status}`;
}

export function describeRequiredLaunchMonetization(status) {
  if (status.missingBooks.length > 0) {
    return `missing tracked monetization links for ${status.missingBooks.join(", ")}`;
  }
  if (status.requiredBooks.length === 0) {
    return "no books are currently designated as required launch monetization";
  }
  return `required launch monetization links configured for ${status.configuredBooks.join(", ")}`;
}

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function writePayload(outPath, payload) {
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  }
  console.log(JSON.stringify(payload, null, 2));
}

async function checkTable(admin, table, select = "*") {
  const { data, error } = await admin.from(table).select(select).limit(1);
  if (error) return report(table, false, error.message, { code: error.code || null });
  return report(table, true, "reachable", { sampleCount: Array.isArray(data) ? data.length : 0 });
}

async function main() {
  const outPath = readFlag("--out");
  const adminEnv = readEnvFile(".env.admin");
  const clientEnv = readEnvFile(".env");

  const missingEnv = [
    ["SUPABASE_URL", adminEnv.SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", adminEnv.SUPABASE_SERVICE_ROLE_KEY],
    ["VITE_SUPABASE_URL", clientEnv.VITE_SUPABASE_URL],
    ["VITE_SUPABASE_ANON_KEY", clientEnv.VITE_SUPABASE_ANON_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingEnv.length) {
    writePayload(outPath, {
      ok: false,
      failedCount: missingEnv.length,
      results: missingEnv.map((name) => report(
        `env:${name}`,
        false,
        "required launch verification environment variable is missing",
      )),
    });
    process.exit(1);
  }

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

  const password = "PromoGrind!23456";
  const billingEmail = `codex-billing-${Date.now()}@example.com`;
  const created = await admin.auth.admin.createUser({ email: billingEmail, password, email_confirm: true });
  results.push(report(
    "confirmed_test_user",
    !created.error,
    created.error ? describeAuthError(created.error) : "confirmed disposable probe user created",
  ));

  if (!created.error) {
    try {
      // Exercise the public signup endpoint with an already-confirmed disposable
      // identity. Supabase's enumeration protection accepts this without sending
      // confirmation mail, so the monitor cannot consume the shared email quota.
      const signUp = await pub.auth.signUp({ email: billingEmail, password });
      results.push(report(
        "public_signup",
        !signUp.error,
        signUp.error ? describeAuthError(signUp.error) : "public sign-up endpoint accepted the request without sending mail",
      ));

      const billingSignIn = await pub.auth.signInWithPassword({ email: billingEmail, password });
      results.push(report(
        "confirmed_signin",
        !billingSignIn.error,
        billingSignIn.error ? describeAuthError(billingSignIn.error) : "confirmed user sign-in succeeded",
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
          const rawBody = await res.text();
          return report(
            name,
            res.ok || (name === "customer-portal" && res.status === 404),
            describeFunctionResponse(name, res.status, rawBody),
            { status: res.status },
          );
        };

        results.push(await invoke("create-checkout", { plan: "scout_monthly", attribution: { referral_source: "launch-check" } }));
        results.push(await invoke("customer-portal", {}));
      }
    } finally {
      const removed = await admin.auth.admin.deleteUser(created.data.user.id);
      results.push(report(
        "probe_user_cleanup",
        !removed.error,
        removed.error ? describeAuthError(removed.error) : "disposable probe user removed",
      ));
    }
  } else {
    results.push(report(
      "public_signup",
      false,
      "not run because the disposable confirmed probe identity could not be created",
    ));
  }

  const launchMonetization = getRequiredLaunchMonetizationStatus();

  results.push(advisoryReport(
    "affiliate_coverage",
    getConfiguredAffiliateCount() > 0,
    `affiliate links configured for ${getConfiguredAffiliateCount()} books`,
    {
      books: BOOKS.filter((book) => hasConfiguredAffiliateUrl(book)).map((book) => book.name),
    },
  ));
  results.push(advisoryReport(
    "monetization_coverage",
    getConfiguredMonetizationCount() > 0,
    `monetization links configured for ${getConfiguredMonetizationCount()} books`,
    {
      books: BOOKS.filter((book) => hasConfiguredMonetizationUrl(book)).map((book) => book.name),
    },
  ));
  results.push(advisoryReport(
    "required_launch_monetization",
    launchMonetization.missingBooks.length === 0,
    describeRequiredLaunchMonetization(launchMonetization),
    {
      requiredBooks: launchMonetization.requiredBooks,
      configuredBooks: launchMonetization.configuredBooks,
      missingBooks: launchMonetization.missingBooks,
    },
  ));

  const failed = results.filter((item) => !item.ok);
  const blockingFailed = failed.filter((item) => item.severity !== "advisory");
  const advisoryFailed = failed.filter((item) => item.severity === "advisory");
  const payload = {
    ok: blockingFailed.length === 0,
    failedCount: failed.length,
    blockingFailedCount: blockingFailed.length,
    advisoryFailedCount: advisoryFailed.length,
    results,
  };

  writePayload(outPath, payload);

  if (blockingFailed.length) process.exit(1);
}

const isDirectInvocation = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectInvocation) {
  main().catch((error) => {
    const outPath = readFlag("--out");
    writePayload(outPath, { ok: false, fatal: error.message });
    process.exit(1);
  });
}
