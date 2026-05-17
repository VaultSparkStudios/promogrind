#!/usr/bin/env node
/**
 * scripts/run-friend-beta-checklist.mjs
 *
 * Walks a trusted tester through the friend-facing launch QA pass and writes
 * evidence to context/LAUNCH_PROOFS.json[friendBeta] when complete. The
 * checklist mirrors the evidenceRequired list — auth flow, email recovery,
 * top calculator, sportsbook CTA review, and pricing/free-account messaging review.
 *
 * Usage:
 *   node scripts/run-friend-beta-checklist.mjs                # interactive
 *   node scripts/run-friend-beta-checklist.mjs --record       # write evidence
 *   node scripts/run-friend-beta-checklist.mjs --print        # print & exit
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.cwd();
const PROOFS_PATH = path.join(ROOT, "context", "LAUNCH_PROOFS.json");

const ARGS = process.argv.slice(2);
const PRINT_ONLY = ARGS.includes("--print");
const AUTO_RECORD = ARGS.includes("--record");

const STEPS = [
  { id: "auth", q: "Tester completed account creation or sign-in at https://promogrind.bet without confusion?" },
  { id: "auth_recovery", q: "Tester verified confirmation-email handling or forgot-password recovery was visible and understandable?" },
  { id: "calculator", q: "Tester completed at least one top calculator (BonusBet, ProfitBoost, FirstBet, or Kelly) end-to-end and got a sensible result?" },
  { id: "cta", q: "Tester reviewed sportsbook CTA behavior — link opens, label is honest, no broken book buttons?" },
  { id: "pricing", q: "Tester reviewed pricing/free-account messaging and understood what's free vs paid without help?" },
  { id: "trust", q: "Tester saw responsible-gambling copy and trusted the app's honesty (no hidden fees, no dark patterns)?" },
];

const TAG_RULES = [
  { tag: "auth-confusion", patterns: [/account/i, /sign.?in/i, /login/i, /auth/i, /confirm/i, /password/i, /email/i] },
  { tag: "calculator-confusion", patterns: [/calculator/i, /result/i, /stake/i, /odds/i, /math/i] },
  { tag: "cta-friction", patterns: [/cta/i, /button/i, /link/i, /sportsbook/i, /book/i, /broken/i] },
  { tag: "pricing-objection", patterns: [/pricing/i, /price/i, /paid/i, /free/i, /subscription/i, /trial/i] },
  { tag: "trust-friction", patterns: [/trust/i, /privacy/i, /responsible/i, /hidden/i, /fee/i, /dark/i] },
];

function printChecklist() {
  console.log("\nFRIEND BETA CHECKLIST\n");
  STEPS.forEach((s, i) => console.log(`  ${i + 1}. ${s.q}`));
  console.log("");
}

function classifyFeedback(note = "", stepId = "") {
  const tags = new Set();
  const haystack = `${stepId} ${note}`;
  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) tags.add(rule.tag);
  }
  if (!tags.size && note.trim()) tags.add("general-friction");
  return [...tags];
}

function summarizeEvidence(evidence = {}) {
  const failedSteps = (evidence.steps || []).filter((step) => step.answer !== "y");
  const tagCounts = {};
  const issues = failedSteps.map((step) => {
    const tags = classifyFeedback(step.note, step.id);
    for (const tag of tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    return {
      step: step.id,
      tags,
      note: step.note || "No note captured.",
    };
  });
  if (evidence.friction) {
    const tags = classifyFeedback(evidence.friction, "summary");
    for (const tag of tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    issues.push({ step: "summary", tags, note: evidence.friction });
  }
  return { failedSteps: failedSteps.length, tagCounts, issues };
}

function renderBetaFeedbackSummary(proofs) {
  const entries = proofs?.proofs?.friendBeta?.evidence || [];
  const lines = [
    "# Friend Beta Feedback",
    "",
    `Last updated: ${new Date().toISOString().split("T")[0]}`,
    "",
    "| Date | Tester | Result | Tags | Notes |",
    "|---|---|---|---|---|",
  ];

  if (!entries.length) {
    lines.push("| - | - | No recorded friend-beta evidence yet | - | - |");
    return lines.join("\n") + "\n";
  }

  for (const entry of entries.slice(-10).reverse()) {
    const summary = summarizeEvidence(entry);
    const tags = Object.keys(summary.tagCounts);
    const notes = summary.issues.map((issue) => `${issue.step}: ${issue.note}`).join("; ");
    lines.push(`| ${entry.date || "-"} | ${entry.tester || "-"} | ${entry.allClear ? "clear" : "needs work"} | ${tags.join(", ") || "-"} | ${notes || entry.friction || "-"} |`);
  }

  lines.push("", "## Latest Issue Tags", "");
  const aggregate = entries.reduce((counts, entry) => {
    const summary = summarizeEvidence(entry);
    for (const [tag, count] of Object.entries(summary.tagCounts)) {
      counts[tag] = (counts[tag] || 0) + count;
    }
    return counts;
  }, {});
  const sortedTags = Object.entries(aggregate).sort((a, b) => b[1] - a[1]);
  if (!sortedTags.length) lines.push("- No friction tags recorded.");
  else sortedTags.forEach(([tag, count]) => lines.push(`- ${tag}: ${count}`));

  return lines.join("\n") + "\n";
}

const ask = (rl, q) => new Promise((r) => rl.question(q, (a) => r(a)));

async function run() {
  if (PRINT_ONLY) return printChecklist();

  console.log("\nPromoGrind Friend Beta Runner\n─────────────────────────────");
  console.log("Have your tester sit with you. Capture honest answers.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const testerName = (await ask(rl, "Tester name (or initials): ")).trim();
  const sessionDate = new Date().toISOString().split("T")[0];

  const answers = [];
  let allYes = true;
  for (const step of STEPS) {
    const ans = (await ask(rl, `→ ${step.q} [y/n]: `)).trim().toLowerCase();
    let note = "";
    if (ans !== "y") {
      note = (await ask(rl, "  what went wrong? (one line): ")).trim();
      allYes = false;
    }
    answers.push({ id: step.id, q: step.q, answer: ans, note });
  }

  const friction = (await ask(rl, "\nOne-line summary of biggest friction (blank = none): ")).trim();
  rl.close();

  const evidence = {
    date: sessionDate,
    type: "manual-friend-beta",
    detail: allYes
      ? "Trusted tester completed friend-facing pass across auth, account recovery, top calculator, CTA review, pricing, and trust copy."
      : "Friend-facing pass had at least one failing step — see steps[].note.",
    tester: testerName || null,
    allClear: allYes,
    friction: friction || null,
    steps: answers,
  };

  if (!AUTO_RECORD) {
    console.log("\n--- EVIDENCE PAYLOAD ---");
    console.log(JSON.stringify(evidence, null, 2));
    console.log("\nRe-run with --record to append this evidence to context/LAUNCH_PROOFS.json.");
    if (!allYes) console.log("(Status will remain pending because at least one step failed.)");
    return;
  }

  const proofs = JSON.parse(fs.readFileSync(PROOFS_PATH, "utf8"));
  proofs.proofs.friendBeta ??= {};
  proofs.proofs.friendBeta.status = allYes ? "complete" : "pending";
  proofs.proofs.friendBeta.evidence ??= [];
  proofs.proofs.friendBeta.evidence.push(evidence);
  proofs.lastUpdated = sessionDate;

  fs.writeFileSync(PROOFS_PATH, JSON.stringify(proofs, null, 2) + "\n");
  fs.writeFileSync(path.join(ROOT, "docs", "BETA_FEEDBACK.md"), renderBetaFeedbackSummary(proofs));
  console.log(`\n✓ Recorded evidence to ${path.relative(ROOT, PROOFS_PATH)}`);
  console.log("✓ Updated docs/BETA_FEEDBACK.md");
  console.log(`  friendBeta.status = ${proofs.proofs.friendBeta.status}`);
}

run().catch((err) => {
  console.error("Friend beta runner failed:", err);
  process.exit(1);
});
