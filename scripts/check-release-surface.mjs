#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkReleaseSurface } from "./lib/release-surface.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "public", "navigation-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const result = checkReleaseSurface(root, manifest);
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else if (result.ok) console.log(`release surface passed · ${result.counts.requiredFooter} footer destinations · ${result.counts.standardFiles} standard files · live headers require external proof`);
else {
  console.error(`release surface failed · ${result.findings.length} finding(s)`);
  for (const finding of result.findings) console.error(`  ${finding.id}: ${JSON.stringify(finding.missing || finding.file || finding.detail)}`);
}
process.exit(result.ok ? 0 : 1);
