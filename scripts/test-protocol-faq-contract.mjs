#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { faqDefinitionHash, inspectProtocolFaq, protocolSourceHash } from "./lib/protocol-faq-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const live = inspectProtocolFaq(ROOT);
assert.equal(live.fresh, true, "checked-in FAQ must match protocol and reviewed definitions");
assert.equal(live.entries, 10, "FAQ must contain exactly 10 reviewed entries");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-faq-contract-"));
fs.mkdirSync(path.join(temp, "docs"), { recursive: true });
fs.writeFileSync(path.join(temp, "AGENTS.md"), "alpha\nbeta\n");
fs.writeFileSync(path.join(temp, "docs", "SESSION_PROTOCOL.md"), "protocol-v1\nsecond line\n");
fs.writeFileSync(path.join(temp, "docs", "PROTOCOL_FAQ_SOURCE.json"), '{\n"schemaVersion":1\n}\n');
const initialHash = protocolSourceHash(temp);
const initialDefinitionHash = faqDefinitionHash(temp);
fs.writeFileSync(path.join(temp, "docs", "PROTOCOL_FAQ.md"), `<!-- protocol-source-sha256: ${initialHash} -->\n<!-- faq-definition-sha256: ${inspectProtocolFaq(temp, "").currentDefinitionHash} -->\n## Q: One`);
assert.equal(inspectProtocolFaq(temp).fresh, true, "matching content hashes should pass without a clock");
for (const relative of ["AGENTS.md", "docs/SESSION_PROTOCOL.md", "docs/PROTOCOL_FAQ_SOURCE.json", "docs/PROTOCOL_FAQ.md"]) {
  const file = path.join(temp, relative);
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\n/g, "\r\n"));
}
assert.equal(protocolSourceHash(temp), initialHash, "Git's LF/CRLF checkout conversion must not invalidate unchanged protocol text");
assert.equal(faqDefinitionHash(temp), initialDefinitionHash, "FAQ definition hashes must be stable across LF/CRLF checkouts");
assert.equal(inspectProtocolFaq(temp).fresh, true, "FAQ receipt must verify after Windows checkout conversion");
fs.writeFileSync(path.join(temp, "docs", "SESSION_PROTOCOL.md"), "protocol-v2");
assert.equal(inspectProtocolFaq(temp).fresh, false, "a protocol content change must invalidate the FAQ");

// Exercise the actual renderer/checker across the same checkout conversion.
fs.mkdirSync(path.join(temp, "scripts", "lib"), { recursive: true });
for (const relative of ["scripts/render-protocol-faq.mjs", "scripts/lib/protocol-faq-contract.mjs"]) {
  fs.copyFileSync(path.join(ROOT, relative), path.join(temp, relative));
}
fs.writeFileSync(path.join(temp, "docs", "PROTOCOL_FAQ_SOURCE.json"), JSON.stringify({
  schemaVersion: 1, reviewedAt: "2026-09-30", reviewedBy: "fixture",
  entries: Array.from({ length: 10 }, (_, index) => ({ question: `Question ${index + 1}`, answer: "Reviewed answer", source: "AGENTS.md" })),
}, null, 2));
const renderer = path.join(temp, "scripts", "render-protocol-faq.mjs");
const generated = spawnSync(process.execPath, [renderer], { cwd: temp, encoding: "utf8" });
assert.equal(generated.status, 0, generated.stderr);
for (const relative of ["AGENTS.md", "docs/SESSION_PROTOCOL.md", "docs/PROTOCOL_FAQ_SOURCE.json", "docs/PROTOCOL_FAQ.md"]) {
  const file = path.join(temp, relative);
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
}
const checked = spawnSync(process.execPath, [renderer, "--check"], { cwd: temp, encoding: "utf8" });
assert.equal(checked.status, 0, `renderer must accept CRLF checkout: ${checked.stderr}`);
fs.appendFileSync(path.join(temp, "docs", "PROTOCOL_FAQ_SOURCE.json"), " ");
assert.equal(inspectProtocolFaq(temp).fresh, false, "non-line-ending definition changes must still invalidate receipts");

console.log("protocol FAQ contract passed · LF/CRLF stable · content change invalidates · elapsed time ignored");
