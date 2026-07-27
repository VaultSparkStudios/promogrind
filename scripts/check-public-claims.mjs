#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_CLAIM_RULES, scanPublicClaimText } from "./lib/public-claims.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["src", "public", "index.html", "README.md"];
const EXTENSIONS = new Set([".html", ".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);

function walk(target, files) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(target).toLowerCase())) files.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "__tests__") continue;
    walk(path.join(target, entry.name), files);
  }
}

const files = [];
for (const target of TARGETS) walk(path.join(ROOT, target), files);
const findings = files.flatMap((file) => scanPublicClaimText(fs.readFileSync(file, "utf8"), path.relative(ROOT, file).replace(/\\/g, "/")));

if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: findings.length === 0, checkedFiles: files.length, rules: PUBLIC_CLAIM_RULES.length, findings }, null, 2));
if (findings.length) {
  if (!process.argv.includes("--json")) {
    console.error(`Public claims contract failed: ${findings.length} finding(s).`);
    for (const finding of findings) {
      console.error(`  [${finding.id}/${finding.locale}] ${finding.file}:${finding.line}  ${finding.excerpt}`);
      console.error(`    → ${finding.guidance}`);
    }
  }
  process.exit(1);
}
if (!process.argv.includes("--json")) console.log(`Public claims contract passed · ${files.length} files · ${PUBLIC_CLAIM_RULES.length} multilingual rules`);
