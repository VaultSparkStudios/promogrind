#!/usr/bin/env node
/**
 * Usage:
 *   node scripts/deploy-supabase.mjs [--all | --function <name> ...] [--migration]
 *     [--target <project-ref>] [--apply] [--json]
 *
 * Defaults to a credential-free dry run. `--apply` resolves the pinned
 * PromoGrind deployment capability through the Studio secrets gateway.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { envForSpawn, resolveCapability } from "./lib/secrets.mjs";
import {
  assertTargetAdminUrl,
  assertTargetManagementProject,
  buildManagementMigrationQuery,
  buildSupabaseDeployPlan,
  discoverPendingMigrations,
  PROMOGRIND_DEPLOY_CAPABILITY,
  PROMOGRIND_PROJECT_REF,
} from "./lib/supabase-deploy-plan.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const json = args.includes("--json");
const includeMigration = args.includes("--migration");
const all = args.includes("--all");
const target = valueAfter("--target") || PROMOGRIND_PROJECT_REF;
const named = valuesAfter("--function");
const scope = all ? "all" : named.length ? "named" : "ai";

if (args.includes("--help")) {
  console.log(`Usage: node scripts/deploy-supabase.mjs [--all | --function <name> ...] [--migration] [--target <ref>] [--apply] [--json]

Default is a credential-free dry run for the five AI provider functions.
--apply requires ${PROMOGRIND_DEPLOY_CAPABILITY} through the secrets gateway.
Every command is pinned to ${PROMOGRIND_PROJECT_REF}; target mismatch fails closed.`);
  process.exit(0);
}

const plan = buildSupabaseDeployPlan({ root: ROOT, target, scope, names: named, includeMigration });
if (!apply) {
  print({
    ...plan,
    mode: "dry-run",
    commands: plan.commands.map((entry) => ({ ...entry, display: [entry.command, ...entry.args].join(" ") })),
  });
  process.exit(0);
}

const directCapability = resolveCapability(PROMOGRIND_DEPLOY_CAPABILITY);
const managementCapability = resolveCapability("supabase.management");
const adminCapability = resolveCapability("supabase.admin");
let authorityMode;
let env;
if (directCapability.ok) {
  authorityMode = "project-capability";
  env = envForSpawn(PROMOGRIND_DEPLOY_CAPABILITY, ["SUPABASE_ACCESS_TOKEN", "SUPABASE_URL", "POSTGRES_PASSWORD"]);
} else if (managementCapability.ok && adminCapability.ok) {
  authorityMode = "composed-target-verified";
  env = envForSpawn("supabase.management", ["SUPABASE_URL", "POSTGRES_PASSWORD"]);
} else {
  console.error(`deploy-supabase: neither ${PROMOGRIND_DEPLOY_CAPABILITY} nor the supabase.management + supabase.admin authority pair is READY`);
  process.exit(2);
}

try {
  assertTargetAdminUrl(env.SUPABASE_URL, target);
} catch (error) {
  console.error(`deploy-supabase: ${error.message}`);
  process.exit(2);
}
if (!env.SUPABASE_ACCESS_TOKEN) {
  console.error("deploy-supabase: the selected gateway authority did not yield SUPABASE_ACCESS_TOKEN");
  process.exit(2);
}
if (includeMigration && !env.POSTGRES_PASSWORD) {
  console.error("deploy-supabase: migration apply requires POSTGRES_PASSWORD through the secrets gateway");
  process.exit(2);
}
if (env.POSTGRES_PASSWORD) env.SUPABASE_DB_PASSWORD = env.POSTGRES_PASSWORD;

let managementReceipt;
try {
  const response = await fetch(`https://api.supabase.com/v1/projects/${target}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`management authorization returned HTTP ${response.status}`);
  assertTargetManagementProject(body, target);
  managementReceipt = { authorized: true, httpStatus: response.status, target };
} catch (error) {
  console.error(`deploy-supabase: target management preflight failed: ${error.message}`);
  process.exit(2);
}

const results = [];
if (includeMigration && authorityMode === "composed-target-verified") {
  const historyResponse = await managementQuery(env, target,
    "select version from supabase_migrations.schema_migrations order by version", true);
  const appliedVersions = (historyResponse.body || []).map((row) => String(row.version));
  const pendingMigrations = discoverPendingMigrations(ROOT, appliedVersions);
  for (const migration of pendingMigrations) {
    const startedAt = new Date().toISOString();
    const sql = fs.readFileSync(migration.file, "utf8");
    const query = buildManagementMigrationQuery({ ...migration, sql });
    const response = await managementQuery(env, target, query, false);
    results.push({
      kind: "migration-management-api",
      name: migration.name,
      version: migration.version,
      target,
      startedAt,
      exitCode: response.httpStatus === 201 ? 0 : 1,
      httpStatus: response.httpStatus,
    });
  }
  if (!pendingMigrations.length) {
    results.push({ kind: "migration-management-api", name: null, version: null, target, startedAt: new Date().toISOString(), exitCode: 0, noOp: true });
  }
}
for (const entry of plan.commands) {
  if (authorityMode === "composed-target-verified" && (entry.kind === "link" || entry.kind === "migration")) continue;
  const startedAt = new Date().toISOString();
  const result = spawnSync(entry.command, entry.args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
  results.push({
    kind: entry.kind,
    name: entry.name || null,
    target: entry.target,
    startedAt,
    exitCode: result.status,
  });
  if (result.status !== 0) {
    console.error(`deploy-supabase: ${entry.kind} ${entry.name || ""} failed with exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

const receipt = {
  schemaVersion: "1.0",
  receiptId: crypto.randomUUID(),
  target: plan.target,
  capability: PROMOGRIND_DEPLOY_CAPABILITY,
  authorityMode,
  managementReceipt,
  completedAt: new Date().toISOString(),
  planDigest: crypto.createHash("sha256").update(JSON.stringify(plan.commands)).digest("hex"),
  results,
};
const receiptPath = path.join(ROOT, "artifacts", "supabase-deploy", `${receipt.completedAt.replace(/[:.]/g, "-")}.json`);
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
print({ mode: "applied", receiptPath: path.relative(ROOT, receiptPath).replace(/\\/g, "/"), receipt });

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function valuesAfter(flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function print(payload) {
  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(`Supabase deploy ${payload.mode} · target ${payload.target || payload.receipt?.target}`);
    for (const command of payload.commands || []) console.log(`  ${command.display}`);
    if (payload.receiptPath) console.log(`  receipt: ${payload.receiptPath}`);
  }
}

async function managementQuery(authorityEnv, projectRef, query, readOnly) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authorityEnv.SUPABASE_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, read_only: Boolean(readOnly) }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message || body?.error || `HTTP ${response.status}`;
    throw new Error(`Supabase management query failed (${response.status}): ${message}`);
  }
  return { httpStatus: response.status, body };
}
