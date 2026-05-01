#!/usr/bin/env node
/**
 * One-command PromoGrind launch status.
 *
 * Runs repo-owned launch checks, ingests post-deploy verification when gh is
 * available, and prints the exact manual proof runners that remain.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const FAST = ARGS.has("--fast");
const SKIP_INGEST = ARGS.has("--skip-ingest");
const SKIP_PROD_SMOKE = ARGS.has("--skip-prod-smoke");

function runStep(label, command, args, options = {}) {
  console.log(`\n== ${label} ==`);
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  const ok = result.status === 0;
  if (!ok && !options.allowFailure) {
    console.log(`\n${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
  return { label, ok, status: result.status ?? 1, allowFailure: Boolean(options.allowFailure) };
}

function readProofSummary() {
  const proofPath = path.join(ROOT, "context", "LAUNCH_PROOFS.json");
  const payload = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  return Object.entries(payload.proofs || {}).map(([key, proof]) => ({
    key,
    label: proof.label,
    status: proof.status || "pending",
    blocking: Boolean(proof.blocking),
    nextStep: proof.nextStep || "",
  }));
}

function printProofSummary() {
  const proofs = readProofSummary();
  console.log("\n== Manual Launch Proofs ==");
  for (const proof of proofs) {
    const marker = proof.status === "complete" ? "complete" : proof.blocking ? "blocking" : "pending";
    console.log(`- ${proof.key}: ${marker} - ${proof.label}`);
    if (proof.nextStep) console.log(`  next: ${proof.nextStep}`);
  }

  console.log("\n== Proof Runners ==");
  console.log("- Affiliate links: node scripts/update-launch-proof.mjs --list --guide");
  console.log("- Stripe smoke: npm run smoke:stripe -- --record");
  console.log("- Friend beta: npm run beta:check -- --record");
}

const results = [];

if (FAST) {
  console.log("Fast mode: skipping npm run verify:launch-local.");
} else {
  results.push(runStep("Local launch gate", "npm", ["run", "verify:launch-local"]));
}

if (!SKIP_PROD_SMOKE) {
  results.push(runStep("Production dashboard smoke", "npm", ["run", "smoke:production-dashboard"], { allowFailure: true }));
}

if (!SKIP_INGEST) {
  results.push(runStep("Post-deploy artifact ingest", "npm", ["run", "ingest:launch"], { allowFailure: true }));
}

results.push(runStep("Proof guide", "node", ["scripts/update-launch-proof.mjs", "--list", "--guide"], { allowFailure: true }));
printProofSummary();

const blockingFailures = results.filter((result) => !result.ok && !result.allowFailure);
const advisoryFailures = results.filter((result) => !result.ok && result.allowFailure);

console.log("\n== Verdict ==");
if (blockingFailures.length) {
  console.log(`Launch status: BLOCKED by ${blockingFailures.length} repo-owned failing check(s).`);
  process.exit(1);
}

const pendingProofs = readProofSummary().filter((proof) => proof.blocking && proof.status !== "complete");
if (pendingProofs.length) {
  console.log(`Launch status: PARTIAL. ${pendingProofs.length} blocking manual proof(s) still pending.`);
} else {
  console.log("Launch status: READY from repo/manual proof surfaces.");
}

if (advisoryFailures.length) {
  console.log(`Advisory: ${advisoryFailures.length} optional status step(s) failed; see output above.`);
}
