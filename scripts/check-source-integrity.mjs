#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = process.argv.includes("--fix");
const ROOT_TARGETS = ["src", "public", "index.html", "README.md"];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);
const SUSPICIOUS = /(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â(?:[\u0080-\u009f]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ])|ðŸ|ï¿½|�)/g;
const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);
const decoder = new TextDecoder("utf-8", { fatal: true });

function countSuspicious(text) {
  return (String(text).match(SUSPICIOUS) || []).length;
}

function encodeWindows1252(text) {
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code <= 0xff) bytes.push(code);
    else if (CP1252.has(code)) bytes.push(CP1252.get(code));
    else return null;
  }
  return Uint8Array.from(bytes);
}

function repairLine(line) {
  if (!countSuspicious(line)) return line;
  const encoded = encodeWindows1252(line);
  if (!encoded) return line;
  try {
    const decoded = decoder.decode(encoded);
    return countSuspicious(decoded) < countSuspicious(line) ? decoded : line;
  } catch {
    return line;
  }
}

function walk(target, files) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (TEXT_EXTENSIONS.has(path.extname(target).toLowerCase())) files.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    walk(path.join(target, entry.name), files);
  }
}

const files = [];
for (const target of ROOT_TARGETS) walk(path.join(ROOT, target), files);

let repairedFiles = 0;
if (FIX) {
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const repaired = original
      .split(/(\r?\n)/)
      .map((part) => part === "\n" || part === "\r\n" ? part : repairLine(part))
      .join("");
    if (repaired !== original) {
      fs.writeFileSync(file, repaired, "utf8");
      repairedFiles += 1;
    }
  }
}

const findings = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (countSuspicious(line)) {
      findings.push({
        file: path.relative(ROOT, file).replace(/\\/g, "/"),
        line: index + 1,
        excerpt: line.trim().slice(0, 140),
      });
    }
  });
}

if (findings.length) {
  console.error(`Source integrity failed: ${findings.length} suspicious encoding sequence(s).`);
  for (const finding of findings.slice(0, 30)) {
    console.error(`  ${finding.file}:${finding.line}  ${finding.excerpt}`);
  }
  if (findings.length > 30) console.error(`  … ${findings.length - 30} more`);
  process.exit(1);
}

console.log(`Source integrity passed · ${files.length} files · repaired ${repairedFiles}`);
