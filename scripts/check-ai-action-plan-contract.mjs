import fs from "node:fs";

const client = fs.readFileSync("src/components/AIActionPlan.jsx", "utf8");
const context = fs.readFileSync("src/ai/actionPlanContext.js", "utf8");
const edge = fs.readFileSync("supabase/functions/ai-action-plan/index.ts", "utf8");
const contract = fs.readFileSync("supabase/functions/_shared/action-plan-contract.ts", "utf8");
const failures = [];

if (client.includes("localStorage.getItem('promo_engine_v3')") || client.includes('localStorage.getItem("promo_engine_v3")')) failures.push("client still reads the full operator workspace implicitly");
if (/pg_bankroll[^\n]+\|\|\s*['\"]1000/.test(client) || /bankroll\s*=\s*['\"]1000/.test(edge)) failures.push("phantom $1,000 bankroll default remains");
if (!client.includes("includeProfile") || !client.includes("Off by default")) failures.push("explicit profile-consent control missing");
if (!client.includes("buildVerificationFirstPlan") || !context.includes('analysisSource: "rule_engine"')) failures.push("zero-provider fallback missing");
if (!edge.includes("parseActionPlanContext") || !edge.includes("buildGroundedActionPlan")) failures.push("edge does not enforce the evidence contract");
if (!contract.includes("operator-confirmed-within-7-days") || !contract.includes("requiresVerification: true")) failures.push("freshness or re-verification gate missing");
if (!contract.includes("value: null") || !contract.includes("No live-offer or value claim is made")) failures.push("unsupported value claims are not stripped");
if (!context.includes("validateGroundedActionPlan")) failures.push("client response failsafe missing");

if (failures.length) {
  console.error("AI action-plan evidence contract FAILED:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AI action-plan contract: current observations + explicit profile consent + no-provider fallback + verify-before-act normalization.");
