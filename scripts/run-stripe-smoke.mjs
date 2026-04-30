#!/usr/bin/env node
/**
 * scripts/run-stripe-smoke.mjs
 *
 * Interactive runner for the manual Stripe smoke checklist documented in
 * docs/STRIPE_SMOKE_TEST.md. Walks the operator step-by-step, captures
 * evidence inline, and on success records evidence to context/LAUNCH_PROOFS.json
 * (only with explicit confirmation).
 *
 * Usage:
 *   node scripts/run-stripe-smoke.mjs              # interactive checklist
 *   node scripts/run-stripe-smoke.mjs --record     # record evidence after pass
 *   node scripts/run-stripe-smoke.mjs --print      # print checklist & exit
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
  { id: "auth", q: "Signed in with a real test PromoGrind account?" },
  { id: "checkout-open", q: "Opened Pricing and started checkout for Scout monthly?" },
  { id: "payment", q: "Completed payment in Stripe Checkout (test card or low-risk live)?" },
  { id: "redirect", q: "Redirected back to https://promogrind.bet/?checkout=success?" },
  { id: "subscription-row", q: "Verified `subscriptions` row exists in Supabase with plan=scout, status=active, stripe_customer_id, stripe_subscription_id, current_period_end?" },
  { id: "portal-open", q: "Opened User Menu → Manage billing and confirmed Stripe Customer Portal loaded for the same customer?" },
  { id: "portal-action", q: "Performed at least one portal action (cancel / update card / view invoices)?" },
  { id: "webhook-update", q: "Confirmed webhook updated the `subscriptions` row after the portal action (no errors in stripe-webhook logs)?" },
];

function printChecklist() {
  console.log("\nSTRIPE SMOKE CHECKLIST\n");
  STEPS.forEach((s, i) => console.log(`  ${i + 1}. ${s.q}`));
  console.log("");
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a)));
}

async function run() {
  if (PRINT_ONLY) {
    printChecklist();
    return;
  }

  console.log("\nPromoGrind Stripe Smoke Runner\n──────────────────────────────");
  console.log("Reference: docs/STRIPE_SMOKE_TEST.md");
  console.log("Answer y/n for each step. Anything else = skip/abort.\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answers = [];
  let allYes = true;

  for (const step of STEPS) {
    const ans = (await ask(rl, `→ ${step.q} [y/n]: `)).trim().toLowerCase();
    answers.push({ id: step.id, q: step.q, answer: ans });
    if (ans !== "y") {
      allYes = false;
      console.log(`  ✗ Marked NOT-DONE for "${step.id}". Aborting smoke pass.`);
      break;
    }
    console.log(`  ✓ ${step.id}`);
  }

  if (!allYes) {
    rl.close();
    console.log("\nSmoke pass incomplete. Re-run after the failed step is fixed.");
    process.exit(1);
  }

  const checkoutId = (await ask(rl, "\nStripe checkout session ID (cs_…): ")).trim();
  const customerId = (await ask(rl, "Stripe customer ID (cus_…): ")).trim();
  const subscriptionId = (await ask(rl, "Stripe subscription ID (sub_…): ")).trim();

  rl.close();

  const evidence = {
    date: new Date().toISOString().split("T")[0],
    type: "manual-stripe-smoke",
    detail: "Operator-completed Stripe smoke pass: checkout → webhook → portal → subscription confirmed against deployed app.",
    checkoutSessionId: checkoutId || null,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    steps: answers,
  };

  if (!AUTO_RECORD) {
    console.log("\n--- EVIDENCE PAYLOAD ---");
    console.log(JSON.stringify(evidence, null, 2));
    console.log("\nRe-run with --record to append this evidence to context/LAUNCH_PROOFS.json and flip stripeSmoke to complete.");
    return;
  }

  const proofs = JSON.parse(fs.readFileSync(PROOFS_PATH, "utf8"));
  proofs.proofs.stripeSmoke ??= {};
  proofs.proofs.stripeSmoke.status = "complete";
  proofs.proofs.stripeSmoke.evidence ??= [];
  proofs.proofs.stripeSmoke.evidence.push(evidence);
  proofs.lastUpdated = new Date().toISOString().split("T")[0];

  fs.writeFileSync(PROOFS_PATH, JSON.stringify(proofs, null, 2) + "\n");
  console.log(`\n✓ Recorded evidence to ${path.relative(ROOT, PROOFS_PATH)}`);
  console.log("✓ stripeSmoke.status = complete");
}

run().catch((err) => {
  console.error("Stripe smoke runner failed:", err);
  process.exit(1);
});
