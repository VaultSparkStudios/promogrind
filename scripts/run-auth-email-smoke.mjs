#!/usr/bin/env node
/**
 * scripts/run-auth-email-smoke.mjs
 *
 * Interactive runner for the production auth email proof. It records only
 * redacted operational evidence: no email body, password, token, or address.
 *
 * Usage:
 *   node scripts/run-auth-email-smoke.mjs
 *   node scripts/run-auth-email-smoke.mjs --record
 *   node scripts/run-auth-email-smoke.mjs --print
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { appendReceipts, receiptsFromSteps } from './lib/launch-proof-quorum.mjs';

const ROOT = process.cwd();
const PROOFS_PATH = path.join(ROOT, "context", "LAUNCH_PROOFS.json");

const ARGS = process.argv.slice(2);
const PRINT_ONLY = ARGS.includes("--print");
const AUTO_RECORD = ARGS.includes("--record");

const STEPS = [
  { id: "account-create", criterionId: 'fresh-production-account-created', q: "Created a fresh production PromoGrind account at https://promogrind.bet?" },
  { id: "confirmation-delivery", criterionId: 'confirmation-email-delivered', q: "Received the confirmation email in the test inbox or spam folder?" },
  { id: "confirmation-resend", criterionId: 'confirmation-resend-verified', q: "Used Resend confirmation email and confirmed a second email arrived or Supabase showed an accepted resend?" },
  { id: "signin-after-confirm", criterionId: null, q: "Confirmed the account and signed in successfully?" },
  { id: "forgot-password", criterionId: null, q: "Requested a forgot-password email from the production sign-in dialog?" },
  { id: "recovery-delivery", criterionId: 'forgot-password-email-delivered', q: "Received the password reset email in the test inbox or spam folder?" },
  { id: "recovery-link", criterionId: 'recovery-link-opens-update-password-ui', q: "Opened the recovery link and landed on https://promogrind.bet/?auth=update-password or equivalent update-password UI?" },
  { id: "new-password-signin", criterionId: 'new-password-sign-in-succeeds', q: "Set a new password and signed in with it successfully?" },
];

function printChecklist() {
  console.log("\nPRODUCTION AUTH EMAIL SMOKE CHECKLIST\n");
  STEPS.forEach((step, index) => console.log(`  ${index + 1}. ${step.q}`));
  console.log("\nRecord only redacted evidence. Do not paste email bodies, tokens, passwords, or full email addresses.\n");
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer)));
}

function maskEmail(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([^@\s]+)@([^@\s]+)$/);
  if (!match) return raw ? "[redacted-email]" : null;
  const [, local, domain] = match;
  const localMask = local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***`;
  return `${localMask}@${domain}`;
}

function assertSafeEvidence(evidence) {
  const serialized = JSON.stringify(evidence);
  const forbidden = [
    /access_token=/i,
    /refresh_token=/i,
    /token_hash=/i,
    /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/,
    /password\s*[:=]/i,
  ];
  return !forbidden.some((pattern) => pattern.test(serialized));
}

async function run() {
  if (PRINT_ONLY) {
    printChecklist();
    return;
  }

  console.log("\nPromoGrind Production Auth Email Smoke Runner");
  console.log("--------------------------------------------");
  console.log("Answer y/n for each step. Any no aborts the pass without recording completion.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answers = [];
  let allYes = true;

  for (const step of STEPS) {
    const answer = (await ask(rl, `-> ${step.q} [y/n]: `)).trim().toLowerCase();
    answers.push({ id: step.id, criterionId: step.criterionId, q: step.q, answer });
    if (answer !== "y") {
      allYes = false;
      console.log(`  x Marked NOT-DONE for "${step.id}". Auth email smoke incomplete.`);
      break;
    }
    console.log(`  OK ${step.id}`);
  }

  if (!allYes) {
    rl.close();
    console.log("\nSmoke pass incomplete. Re-run after the failed production auth email step is fixed.");
    process.exit(1);
  }

  const testEmail = await ask(rl, "\nTest email address (will be masked): ");
  const confirmationProviderId = await ask(rl, "Confirmation message/provider ID (optional, no email body): ");
  const resetProviderId = await ask(rl, "Reset message/provider ID (optional, no email body): ");
  const notes = await ask(rl, "One-line redacted note (optional): ");
  rl.close();

  const evidence = {
    date: new Date().toISOString().split("T")[0],
    type: "manual-production-auth-email-smoke",
    detail: "Operator completed production account confirmation, resend, forgot-password, recovery-link, and new-password sign-in proof against https://promogrind.bet.",
    testEmailMasked: maskEmail(testEmail),
    confirmationProviderId: confirmationProviderId.trim() || null,
    resetProviderId: resetProviderId.trim() || null,
    notes: notes.trim() || null,
    steps: answers,
  };

  if (!assertSafeEvidence(evidence)) {
    console.error("\nRefusing to record unsafe evidence. Remove tokens, passwords, or raw auth links and retry.");
    process.exit(1);
  }

  if (!AUTO_RECORD) {
    console.log("\n--- EVIDENCE PAYLOAD ---");
    console.log(JSON.stringify(evidence, null, 2));
    console.log("\nRe-run with --record to append this evidence to context/LAUNCH_PROOFS.json and flip authEmailSmoke to complete.");
    return;
  }

  const proofs = JSON.parse(fs.readFileSync(PROOFS_PATH, "utf8"));
  proofs.proofs.authEmailSmoke.evidence ??= [];
  proofs.proofs.authEmailSmoke.evidence.push({ ...evidence, authority: 'narrative-only; criteria receipts derive status' });
  appendReceipts(proofs, 'authEmailSmoke', receiptsFromSteps(answers, {
    source: 'human-observation', target: 'https://promogrind.bet', verifier: 'runner:auth-email',
  }));

  fs.writeFileSync(PROOFS_PATH, JSON.stringify(proofs, null, 2) + "\n");
  console.log(`\nOK Recorded evidence to ${path.relative(ROOT, PROOFS_PATH)}`);
  console.log(`OK authEmailSmoke.status = ${proofs.proofs.authEmailSmoke.status} (derived from criterion receipts)`);
}

run().catch((error) => {
  console.error("Auth email smoke runner failed:", error);
  process.exit(1);
});

