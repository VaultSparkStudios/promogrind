import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PATHS = ["AGENTS.md", "docs/SESSION_PROTOCOL.md"];

function read(root, relative) {
  try { return fs.readFileSync(path.join(root, relative), "utf8"); } catch { return ""; }
}

export function protocolSourceHash(root) {
  const hash = crypto.createHash("sha256");
  for (const relative of SOURCE_PATHS) {
    hash.update(`${relative}\0`, "utf8");
    hash.update(read(root, relative), "utf8");
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export function faqDefinitionHash(root) {
  return crypto.createHash("sha256").update(read(root, "docs/PROTOCOL_FAQ_SOURCE.json"), "utf8").digest("hex");
}

export function inspectProtocolFaq(root, faqText = read(root, "docs/PROTOCOL_FAQ.md")) {
  const recordedProtocolHash = faqText.match(/protocol-source-sha256:\s*([a-f0-9]{64})/i)?.[1] || null;
  const recordedDefinitionHash = faqText.match(/faq-definition-sha256:\s*([a-f0-9]{64})/i)?.[1] || null;
  const currentProtocolHash = protocolSourceHash(root);
  const currentDefinitionHash = faqDefinitionHash(root);
  const entries = faqText.match(/^## Q: .+/gm)?.length || 0;
  const fresh = Boolean(
    entries > 0
    && recordedProtocolHash === currentProtocolHash
    && recordedDefinitionHash === currentDefinitionHash
  );
  return { fresh, entries, recordedProtocolHash, currentProtocolHash, recordedDefinitionHash, currentDefinitionHash };
}
