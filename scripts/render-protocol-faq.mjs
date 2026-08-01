#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { faqDefinitionHash, inspectProtocolFaq, protocolSourceHash } from "./lib/protocol-faq-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(ROOT, "docs", "PROTOCOL_FAQ_SOURCE.json");
const outputPath = path.join(ROOT, "docs", "PROTOCOL_FAQ.md");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (source.schemaVersion !== 1 || !Array.isArray(source.entries) || source.entries.length !== 10) {
  throw new Error("PROTOCOL_FAQ_SOURCE.json must contain exactly 10 reviewed schema-v1 entries");
}

const protocolHash = protocolSourceHash(ROOT);
const definitionHash = faqDefinitionHash(ROOT);
const sections = source.entries.map((entry) => `## Q: ${entry.question}\n\n> Reviewed: ${source.reviewedAt} · Reviewer: ${source.reviewedBy}\n\n${entry.answer}\n\nSource: ${entry.source}.\n\n---`).join("\n\n");
const rendered = `<!-- generated-by: scripts/render-protocol-faq.mjs -->\n<!-- protocol-source-sha256: ${protocolHash} -->\n<!-- faq-definition-sha256: ${definitionHash} -->\n\n# Protocol FAQ\n\n*Reviewed: ${source.reviewedAt}*\n\n> Deterministic, reviewed Q&A derived from the local protocol contract. Freshness is content-addressed; elapsed time alone never makes an unchanged protocol stale.\n\n${sections}\n`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== rendered) {
    console.error("Protocol FAQ contract stale: rendered output does not match current protocol and reviewed definitions.");
    process.exit(1);
  }
  const receipt = inspectProtocolFaq(ROOT, current);
  console.log(`Protocol FAQ contract passed · ${receipt.entries} entries · ${receipt.currentProtocolHash.slice(0, 12)}`);
  process.exit(0);
}

fs.writeFileSync(outputPath, rendered, "utf8");
console.log(`Protocol FAQ rendered · ${source.entries.length} entries · ${protocolHash.slice(0, 12)}`);
