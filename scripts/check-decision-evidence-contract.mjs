import fs from "node:fs";

const provenance = fs.readFileSync("src/lib/promoProvenance.js", "utf8");
const resultCard = fs.readFileSync("src/components/ResultFeedbackCard.jsx", "utf8");
const trackInsights = fs.readFileSync("src/components/TrackInsights.jsx", "utf8");
const registry = fs.readFileSync("src/lib/storageRegistry.js", "utf8");

const failures = [];
if (!provenance.includes('scope: "local-decision-continuity"')) failures.push("v3 evidence scope missing");
if (!provenance.includes("workflowPreviousHash")) failures.push("per-workflow link missing");
if (!provenance.includes("sourceEvidenceRef")) failures.push("source evidence reference missing");
if (!provenance.includes("operatorContextRef")) failures.push("private-note digest missing");
if (!resultCard.includes("appendDecisionEvidence")) failures.push("calculator lifecycle is not linked in production");
if (!trackInsights.includes("appendDecisionEvidence")) failures.push("Track settlement lifecycle is not linked in production");
if (!resultCard.includes("not independent execution proof")) failures.push("honest evidence qualifier missing from UI");
if (!registry.includes('"pg_promo_integrity_ledger_v3"')) failures.push("v3 ledger lacks data-rights registration");

if (failures.length) {
  console.error("Decision-evidence source contract FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Decision-evidence source contract: source refs + dual links + production lifecycle + honest qualifier present.");
