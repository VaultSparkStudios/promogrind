#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const functionsRoot = path.join(root, "supabase", "functions");
const manifestPath = path.join(functionsRoot, "_shared", "ai-egress-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const findings = [];

if (manifest.schemaVersion !== 1 || manifest.provider !== "Anthropic") findings.push("manifest header is invalid");
const declared = new Map((manifest.functions || []).map((entry) => [entry.function, entry]));
const discovered = [];
for (const entry of fs.readdirSync(functionsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
  const index = path.join(functionsRoot, entry.name, "index.ts");
  if (!fs.existsSync(index)) continue;
  const source = fs.readFileSync(index, "utf8");
  if (!/(?:api\.anthropic\.com|ANTHROPIC_API_KEY|npm:@anthropic-ai\/sdk)/.test(source)) continue;
  discovered.push(entry.name);
  const contract = declared.get(entry.name);
  if (!contract) { findings.push(`${entry.name}: provider egress is undeclared`); continue; }
  if (!Array.isArray(contract.dataClasses) || !contract.dataClasses.length) findings.push(`${entry.name}: dataClasses missing`);
  if (!contract.consentMode || !contract.payloadLimit) findings.push(`${entry.name}: consent or payload limit missing`);
  if (contract.promoGrindPayloadPersistence !== false) findings.push(`${entry.name}: persistence posture must be explicit false or separately governed`);
  if (contract.remoteFetch !== false) findings.push(`${entry.name}: remote fetch posture must be explicit false`);
  for (const token of contract.inputBoundary || []) {
    if (!source.includes(token)) findings.push(`${entry.name}: input boundary token missing: ${token}`);
  }
  if (!source.includes(contract.receiptField)) findings.push(`${entry.name}: response receipt field missing: ${contract.receiptField}`);
}
for (const name of declared.keys()) if (!discovered.includes(name)) findings.push(`${name}: manifest entry has no provider function`);

if (findings.length) {
  console.error(`AI egress contract failed · ${findings.length} finding(s)`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}
console.log(`AI egress contract passed · ${discovered.length} provider functions · classified + bounded + receipted`);
