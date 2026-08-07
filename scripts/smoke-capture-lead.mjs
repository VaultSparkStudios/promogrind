#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { envForSpawn } from "./lib/secrets.mjs";
import { PROMOGRIND_PROJECT_REF, assertTargetAdminUrl } from "./lib/supabase-deploy-plan.mjs";
import { resolveTargetBrowserKey } from "./lib/supabase-client-authority.mjs";

const client = envForSpawn("supabase.client");
const admin = envForSpawn("supabase.admin");
const management = envForSpawn("supabase.management");
assertTargetAdminUrl(client.SUPABASE_URL, PROMOGRIND_PROJECT_REF);
assertTargetAdminUrl(admin.SUPABASE_URL, PROMOGRIND_PROJECT_REF);
if (client.SUPABASE_URL !== admin.SUPABASE_URL) throw new Error("Capture smoke authorities do not resolve to the same Supabase target");

const createdAt = new Date().toISOString();
const email = `launch-smoke-${Date.now()}@promogrind.invalid`;
const emailHash = crypto.createHash("sha256").update(email).digest("hex");
const endpoint = `${client.SUPABASE_URL}/rest/v1/newsletter_subscribers`;
const browserAuthority = await resolveTargetBrowserKey({ clientEnv: client, managementEnv: management });
const anonHeaders = {
  apikey: browserAuthority.key,
  Authorization: `Bearer ${browserAuthority.key}`,
  "content-type": "application/json",
  Prefer: "return=minimal",
};
const adminHeaders = {
  apikey: admin.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${admin.SUPABASE_SERVICE_ROLE_KEY}`,
  "content-type": "application/json",
};

let inserted = false;
const receipt = { schemaVersion: "1.0", target: PROMOGRIND_PROJECT_REF, createdAt, emailHash, source: "codex-s129-capture-smoke", browserAuthority: browserAuthority.source };
try {
  const submit = await fetch(endpoint, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ email, source: receipt.source, created_at: createdAt }),
    signal: AbortSignal.timeout(20_000),
  });
  receipt.submission = { status: submit.status, ok: submit.ok };
  if (!submit.ok) throw new Error(`anonymous capture submission returned HTTP ${submit.status}`);
  inserted = true;

  const select = await fetch(`${endpoint}?email=eq.${encodeURIComponent(email)}&select=id,email,source,created_at`, {
    headers: adminHeaders,
    signal: AbortSignal.timeout(20_000),
  });
  const rows = await select.json().catch(() => []);
  const row = Array.isArray(rows) ? rows.find((entry) => entry.email === email && entry.source === receipt.source) : null;
  receipt.readback = { status: select.status, ok: select.ok && Boolean(row), rowObserved: Boolean(row), sourceMatched: row?.source === receipt.source };
  if (!receipt.readback.ok) throw new Error(`admin readback did not observe the disposable capture row (HTTP ${select.status})`);
} finally {
  if (inserted) {
    const remove = await fetch(`${endpoint}?email=eq.${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: adminHeaders,
      signal: AbortSignal.timeout(20_000),
    });
    receipt.cleanup = { status: remove.status, ok: remove.ok };
    if (!remove.ok) throw new Error(`capture smoke cleanup returned HTTP ${remove.status}`);
  }
  receipt.completedAt = new Date().toISOString();
  const output = path.join("artifacts", "capture-smoke", `${receipt.completedAt.replace(/[:.]/g, "-")}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.submission?.ok && receipt.readback?.ok && receipt.cleanup?.ok, receipt: output.replaceAll("\\", "/"), ...receipt }, null, 2));
}
