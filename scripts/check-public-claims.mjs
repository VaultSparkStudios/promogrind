#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["src", "public", "index.html", "README.md"];
const EXTENSIONS = new Set([".html", ".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);
const RULES = [
  { id: "absolute-legality", pattern: /\b100% legal\b/i, guidance: "Describe eligibility as jurisdiction- and terms-dependent." },
  { id: "passive-income", pattern: /\bpassive profit\b/i, guidance: "Describe recurring promo value without passive-income framing." },
  { id: "free-money", pattern: /\bfree money\b/i, guidance: "Explain the real inputs, risks, and tradeoffs." },
  { id: "money-machine", pattern: /\bmoney machine\b/i, guidance: "Use disciplined workflow language." },
  { id: "self-paying-certainty", pattern: /\bpays? for itself\b/i, guidance: "Make value conditional on actual usage and results." },
  { id: "income-testimonial", pattern: /\bmaking extra income every month\b/i, guidance: "Share tracked outcomes without recurring-income certainty." },
  { id: "side-hustle", pattern: /\bside hustle\b/i, guidance: "Use operator-routine language rather than income-hype language." },
  { id: "no-risk", pattern: /\b(?:no gambling risk|virtually no risk|risk[- ]free profit)\b/i, guidance: "Acknowledge execution, void, limit, and account risk." },
  { id: "guaranteed-income", pattern: /\bguaranteed income\b/i, guidance: "Use estimates or tracked outcomes, never income guarantees." },
];

function walk(target, files) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(target).toLowerCase())) files.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    walk(path.join(target, entry.name), files);
  }
}

const files = [];
for (const target of TARGETS) walk(path.join(ROOT, target), files);

const findings = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;
      if (rule.id === "guaranteed-income" && /not guaranteed income/i.test(line)) continue;
      findings.push({
        ...rule,
        file: path.relative(ROOT, file).replace(/\\/g, "/"),
        line: index + 1,
        excerpt: line.trim().slice(0, 180),
      });
    }
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: findings.length === 0, checkedFiles: files.length, findings }, null, 2));
}

if (findings.length) {
  if (!process.argv.includes("--json")) {
    console.error(`Public claims contract failed: ${findings.length} finding(s).`);
    for (const finding of findings) {
      console.error(`  [${finding.id}] ${finding.file}:${finding.line}  ${finding.excerpt}`);
      console.error(`    → ${finding.guidance}`);
    }
  }
  process.exit(1);
}

if (!process.argv.includes("--json")) {
  console.log(`Public claims contract passed · ${files.length} files · ${RULES.length} rules`);
}
