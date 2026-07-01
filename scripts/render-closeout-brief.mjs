#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}
function bar(value) {
  const n = Math.max(0, Math.min(10, Number(value) || 0));
  return "#".repeat(n).padEnd(10, ".");
}

const root = process.cwd();
const input = arg("--input");
if (!input) {
  console.error("render-closeout-brief: --input <json> is required");
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(path.resolve(root, input), "utf8"));
const session = payload.session || "unknown";
const date = payload.date || new Date().toISOString().slice(0, 10);
const items = Array.isArray(payload.items) ? payload.items : [];
const followUps = Array.isArray(payload.followUps) ? payload.followUps : [];
const blockers = Array.isArray(payload.blockers) ? payload.blockers : [];
const honesty = Array.isArray(payload.honestyLedger) ? payload.honestyLedger : [];
const lines = [];
lines.push(`# Closeout Brief S${session} - ${date}`);
lines.push("");
lines.push(`Headline: ${payload.headline || "Session complete."}`);
lines.push("");
lines.push("## Items Shipped");
if (items.length) {
  for (const item of items) {
    lines.push(`- ${item.title || item.id}: project ${bar(item.projectImpact)} ecosystem ${bar(item.ecosystemImpact)}`);
    if (item.insight) lines.push(`  ${item.insight}`);
    if (item.evidence) lines.push(`  Evidence: ${item.evidence}`);
  }
} else {
  lines.push("- None recorded.");
}
lines.push("");
lines.push("## Honesty Ledger");
if (honesty.length) for (const h of honesty) lines.push(`- ${h.title}: ${h.why}`);
else lines.push("- No refused or deferred claims recorded.");
lines.push("");
lines.push("## Follow Ups");
if (followUps.length) for (const f of followUps) lines.push(`- ${f}`);
else lines.push("- None.");
lines.push("");
lines.push("## Blockers");
if (blockers.length) for (const b of blockers) lines.push(`- ${b}`);
else lines.push("- None.");
lines.push("");
if (payload.silDelta) lines.push(`SIL delta: ${payload.silDelta.kind || "numeric"} ${payload.silDelta.from ?? "?"} -> ${payload.silDelta.to ?? "?"}`);

const out = path.join(root, "docs", `CLOSEOUT_BRIEF_${session}_${date}.md`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${lines.join("\n")}\n`);
console.log(lines.join("\n"));