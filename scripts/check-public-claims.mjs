#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_CLAIM_RULES, scanPublicClaimText } from "./lib/public-claims.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["src", "public", "supabase/functions", "index.html", "README.md"];
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
files.sort();
const scanned = files.map((file) => ({
  file: path.relative(ROOT, file).replace(/\\/g, "/"),
  text: fs.readFileSync(file, "utf8"),
}));
const findings = scanned.flatMap(({ file, text }) => scanPublicClaimText(text, file));
const sourceHash = crypto.createHash("sha256");
for (const item of scanned) sourceHash.update(`${item.file}\0${item.text}\0`, "utf8");
const ruleHash = crypto.createHash("sha256")
  .update(PUBLIC_CLAIM_RULES.map((rule) => `${rule.id}\0${rule.locale}\0${rule.pattern}\0${rule.guidance}`).join("\n"), "utf8")
  .digest("hex");
const receipt = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  ok: findings.length === 0,
  status: findings.length ? "failed" : "passed",
  checkedFiles: files.length,
  rules: PUBLIC_CLAIM_RULES.length,
  sourceSha256: sourceHash.digest("hex"),
  ruleSha256: ruleHash,
  findings,
};

if (process.argv.includes("--write-receipt")) {
  const receiptPath = path.join(ROOT, "audits", "public-claims-latest.json");
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

if (process.argv.includes("--json")) console.log(JSON.stringify(receipt, null, 2));
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
