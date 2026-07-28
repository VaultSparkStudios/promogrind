import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function walkFiles(root, dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(root, absolute, out);
    else if (entry.isFile()) out.push(path.relative(root, absolute).replace(/\\/g, "/"));
  }
  return out;
}

export function digestDirectory(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`artifact directory missing: ${root}`);
  const files = walkFiles(root);
  if (!files.length) throw new Error(`artifact directory is empty: ${root}`);
  const hash = crypto.createHash("sha256");
  for (const relative of files) {
    const content = fs.readFileSync(path.join(root, relative));
    hash.update(relative);
    hash.update("\0");
    hash.update(crypto.createHash("sha256").update(content).digest("hex"));
    hash.update("\n");
  }
  return { algorithm: "sha256-tree-v1", digest: hash.digest("hex"), fileCount: files.length };
}

export function buildReleaseAttestation({ artifactDir, commitSha, repository, runId, generatedAt = new Date().toISOString() }) {
  if (!/^[a-f0-9]{7,64}$/i.test(String(commitSha || ""))) throw new Error("commitSha must be a Git commit identifier");
  const artifact = digestDirectory(artifactDir);
  return {
    schemaVersion: "1.0",
    generatedAt,
    repository: repository || null,
    runId: runId || null,
    commitSha,
    artifact,
    gates: [
      { command: "npm run verify:launch-local", state: "passing", source: "workflow-step-success" },
      { command: "npm run build:pages", state: "passing", source: "workflow-step-success" },
    ],
  };
}

export function verifyReleaseAttestation(attestation, { artifactDir, commitSha }) {
  if (attestation?.schemaVersion !== "1.0") return { ok: false, reason: "schema-version" };
  if (attestation.commitSha !== commitSha) return { ok: false, reason: "commit-mismatch" };
  const actual = digestDirectory(artifactDir);
  if (actual.algorithm !== attestation.artifact?.algorithm || actual.digest !== attestation.artifact?.digest || actual.fileCount !== attestation.artifact?.fileCount) {
    return { ok: false, reason: "artifact-mismatch", actual };
  }
  const gatesPassing = Array.isArray(attestation.gates) && attestation.gates.length > 0
    && attestation.gates.every((gate) => gate.state === "passing" && gate.source === "workflow-step-success");
  return gatesPassing ? { ok: true, reason: null, actual } : { ok: false, reason: "gate-state", actual };
}
