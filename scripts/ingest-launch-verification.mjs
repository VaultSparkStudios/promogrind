#!/usr/bin/env node
/**
 * scripts/ingest-launch-verification.mjs
 *
 * Pull the most recent post-deploy `launch-verification` GitHub artifact,
 * extract its JSON results, and write an additive summary to
 * `artifacts/launch-verification/post-deploy-summary.md` plus
 * `artifacts/launch-verification/post-deploy.json`.
 *
 * Does NOT modify `context/LAUNCH_PROOFS.json` — manual proof status is the
 * source of truth for human-attested blockers (affiliate links, Stripe smoke,
 * friend beta). This script only ingests automated post-deploy verification
 * truth alongside it.
 *
 * Usage:
 *   node scripts/ingest-launch-verification.mjs           # latest run on main
 *   node scripts/ingest-launch-verification.mjs --run 12345
 *   node scripts/ingest-launch-verification.mjs --dry-run
 *
 * Requires the `gh` CLI authenticated against the repo.
 */

import { execFileSync } from "./lib/safe-spawn.mjs";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "launch-verification");
const SUMMARY_MD = path.join(ARTIFACT_DIR, "post-deploy-summary.md");
const SUMMARY_JSON = path.join(ARTIFACT_DIR, "post-deploy.json");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const runIdx = args.indexOf("--run");
const RUN_ID = runIdx >= 0 ? args[runIdx + 1] : null;

function gh(...cliArgs) {
  return execFileSync("gh", cliArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function findLatestRunId() {
  const json = gh(
    "run", "list",
    "--workflow", "deploy-pages.yml",
    "--branch", "main",
    "--limit", "10",
    "--json", "databaseId,conclusion,status,createdAt,headSha",
  );
  const runs = JSON.parse(json);
  const completed = runs.find((r) => r.status === "completed");
  if (!completed) throw new Error("No completed deploy-pages runs found.");
  return completed.databaseId;
}

function downloadArtifact(runId) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pg-launch-"));
  try {
    gh("run", "download", String(runId), "--name", "launch-verification", "--dir", tmp);
  } catch (err) {
    throw new Error(`gh run download failed for run ${runId}: ${err.message}`);
  }
  return tmp;
}

function readResults(dir) {
  const files = fs.readdirSync(dir);
  const jsonName = files.find((f) => f.endsWith(".json"));
  if (!jsonName) throw new Error(`No JSON artifact in ${dir}`);
  return JSON.parse(fs.readFileSync(path.join(dir, jsonName), "utf8"));
}

function renderMarkdown({ runId, results }) {
  const lines = [];
  const generated = new Date().toISOString();
  lines.push("<!-- generated-by: scripts/ingest-launch-verification.mjs -->");
  lines.push(`<!-- generated-at: ${generated} -->`);
  lines.push(`<!-- source-run-id: ${runId} -->`);
  lines.push("");
  lines.push("# Post-Deploy Launch Verification Summary");
  lines.push("");
  lines.push(`- Source run: \`${runId}\``);
  lines.push(`- Overall: ${results.ok ? "✓ PASS" : "⚠ FAILING"}`);
  lines.push(`- Failed checks: ${results.failedCount ?? 0}`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push("| Check | Status | Detail |");
  lines.push("| --- | --- | --- |");
  for (const r of results.results || []) {
    const icon = r.ok ? "✓" : "⚠";
    lines.push(`| \`${r.name}\` | ${icon} | ${r.detail || ""} |`);
  }
  lines.push("");
  lines.push("> Manual launch proofs (affiliate links, Stripe smoke, friend beta) live in `context/LAUNCH_PROOFS.json` and are intentionally not modified by this script.");
  return lines.join("\n") + "\n";
}

function main() {
  const runId = RUN_ID || findLatestRunId();
  console.log(`→ Ingesting launch-verification artifact from run ${runId}…`);
  const tmpDir = downloadArtifact(runId);
  const results = readResults(tmpDir);
  const md = renderMarkdown({ runId, results });

  const payload = {
    ingestedAt: new Date().toISOString(),
    runId: String(runId),
    ...results,
  };

  if (DRY) {
    console.log("--- DRY RUN ---");
    console.log(md);
    return;
  }

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(SUMMARY_MD, md);
  fs.writeFileSync(SUMMARY_JSON, JSON.stringify(payload, null, 2) + "\n");
  console.log(`✓ Wrote ${path.relative(ROOT, SUMMARY_MD)}`);
  console.log(`✓ Wrote ${path.relative(ROOT, SUMMARY_JSON)}`);
  console.log(results.ok ? "  Status: PASS" : `  Status: ${results.failedCount} failing check(s)`);
}

main();
