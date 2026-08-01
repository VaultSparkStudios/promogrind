#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectProtocolFaq, protocolSourceHash } from "./lib/protocol-faq-contract.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const live = inspectProtocolFaq(ROOT);
assert.equal(live.fresh, true, "checked-in FAQ must match protocol and reviewed definitions");
assert.equal(live.entries, 10, "FAQ must contain exactly 10 reviewed entries");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-faq-contract-"));
fs.mkdirSync(path.join(temp, "docs"), { recursive: true });
fs.writeFileSync(path.join(temp, "AGENTS.md"), "alpha");
fs.writeFileSync(path.join(temp, "docs", "SESSION_PROTOCOL.md"), "protocol-v1");
fs.writeFileSync(path.join(temp, "docs", "PROTOCOL_FAQ_SOURCE.json"), '{"schemaVersion":1}');
const initialHash = protocolSourceHash(temp);
fs.writeFileSync(path.join(temp, "docs", "PROTOCOL_FAQ.md"), `<!-- protocol-source-sha256: ${initialHash} -->\n<!-- faq-definition-sha256: ${inspectProtocolFaq(temp, "").currentDefinitionHash} -->\n## Q: One`);
assert.equal(inspectProtocolFaq(temp).fresh, true, "matching content hashes should pass without a clock");
fs.writeFileSync(path.join(temp, "docs", "SESSION_PROTOCOL.md"), "protocol-v2");
assert.equal(inspectProtocolFaq(temp).fresh, false, "a protocol content change must invalidate the FAQ");

console.log("protocol FAQ contract passed · content change invalidates · elapsed time ignored");
