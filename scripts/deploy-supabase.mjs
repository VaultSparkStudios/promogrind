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
  buildSupabaseDeployPlan,
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

const capability = resolveCapability(PROMOGRIND_DEPLOY_CAPABILITY);
if (!capability.ok) {
  console.error(`deploy-supabase: ${PROMOGRIND_DEPLOY_CAPABILITY} is not READY through the secrets gateway`);
  process.exit(2);
}

const env = envForSpawn(PROMOGRIND_DEPLOY_CAPABILITY, ["SUPABASE_ACCESS_TOKEN", "SUPABASE_URL"]);
if (env.SUPABASE_URL && !String(env.SUPABASE_URL).includes(`${PROMOGRIND_PROJECT_REF}.supabase.co`)) {
  console.error("deploy-supabase: gateway Supabase URL does not match the pinned PromoGrind target");
  process.exit(2);
}

const results = [];
for (const entry of plan.commands) {
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
