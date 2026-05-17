#!/usr/bin/env node
// Synthetic replay of the last N launch-verification artifacts.
// Exits non-zero if any previously-green proof regressed in the most recent run.

import fs from "node:fs";
import path from "node:path";

const ART_DIR = path.join(process.cwd(), "artifacts", "launch-verification");
const HISTORY = 5;

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function gatherArtifacts() {
  if (!fs.existsSync(ART_DIR)) return [];
  const entries = fs.readdirSync(ART_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const file = path.join(ART_DIR, name);
      const stat = fs.statSync(file);
      return { name, file, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries.slice(0, HISTORY);
}

function indexChecks(data) {
  const out = {};
  if (!data) return out;
  const visit = (value, prefix) => {
    if (!value || typeof value !== "object") return;
    if ("status" in value && typeof value.status === "string") {
      out[prefix || "root"] = String(value.status).toLowerCase();
    }
    for (const [k, v] of Object.entries(value)) {
      if (v && typeof v === "object") visit(v, prefix ? `${prefix}.${k}` : k);
    }
  };
  visit(data, "");
  return out;
}

function main() {
  const artifacts = gatherArtifacts();
  if (artifacts.length < 2) {
    console.log("replay-launch-proofs: <2 artifacts available — nothing to compare. OK.");
    return 0;
  }
  const [current, ...prior] = artifacts;
  const currentChecks = indexChecks(loadJson(current.file));
  const regressions = [];
  for (const priorArtifact of prior) {
    const priorChecks = indexChecks(loadJson(priorArtifact.file));
    for (const [key, status] of Object.entries(priorChecks)) {
      if (!["pass", "ok", "green", "complete", "ready"].includes(status)) continue;
      const now = currentChecks[key];
      if (!now) continue;
      if (["fail", "error", "red", "blocked"].includes(now)) {
        regressions.push({ key, was: status, now, priorArtifact: priorArtifact.name });
      }
    }
  }
  if (regressions.length) {
    console.error(`replay-launch-proofs: ${regressions.length} regression(s) vs prior artifacts:`);
    for (const r of regressions) {
      console.error(`  · ${r.key}: ${r.was} → ${r.now} (from ${r.priorArtifact})`);
    }
    return 1;
  }
  console.log(`replay-launch-proofs: 0 regressions across ${artifacts.length} artifacts.`);
  return 0;
}

process.exit(main());
