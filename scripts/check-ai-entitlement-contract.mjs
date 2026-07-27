#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS = path.join(ROOT, "supabase", "functions");
const failures = [];
const providerFunctions = [];

for (const entry of fs.readdirSync(FUNCTIONS, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
  const index = path.join(FUNCTIONS, entry.name, "index.ts");
  if (!fs.existsSync(index)) continue;
  const source = fs.readFileSync(index, "utf8");
  if (!/(?:api\.anthropic\.com|ANTHROPIC_API_KEY|npm:@anthropic-ai\/sdk)/.test(source)) continue;
  providerFunctions.push(entry.name);
  const checks = [
    ["authenticated access", /requireAiAccess\(req/],
    ["central entitlement", /AI_ENTITLEMENTS\.[A-Za-z]+/],
    ["atomic usage reservation", /requireAiAccess\(req[\s\S]*AI_ENTITLEMENTS\./],
    ["usage event", /recordAiUsage\(/],
  ];
  for (const [label, pattern] of checks) {
    if (!pattern.test(source)) failures.push(`${entry.name}: missing ${label}`);
  }
  if (/trialLifetimeLimit\s*:|dailyLimits\s*:|lifetimeLimits\s*:/.test(source)) {
    failures.push(`${entry.name}: embeds entitlement limits outside the central registry`);
  }
  if (/npm:@anthropic-ai\/sdk(?:['"]|$)/.test(source)) {
    failures.push(`${entry.name}: uses an unpinned Anthropic SDK import`);
  }
}

const registry = fs.readFileSync(path.join(FUNCTIONS, "_shared", "ai-entitlements.ts"), "utf8");
for (const functionName of providerFunctions) {
  const feature = functionName.replace(/-/g, "_");
  if (!registry.includes(`feature: "${feature}"`)) failures.push(`${functionName}: absent from entitlement registry`);
}

if (failures.length) {
  console.error(`AI entitlement contract failed · ${failures.length} finding(s)`);
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}

console.log(`AI entitlement contract passed · ${providerFunctions.length} provider function(s) · centralized + authenticated + metered`);
