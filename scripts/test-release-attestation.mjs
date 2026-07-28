#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReleaseAttestation, verifyReleaseAttestation } from "./lib/release-attestation.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-release-attestation-"));
try {
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), "<main>PromoGrind</main>");
  fs.writeFileSync(path.join(root, "assets", "app.js"), "export const ready = true;");
  const commitSha = "abc1234";
  const attestation = buildReleaseAttestation({
    artifactDir: root,
    commitSha,
    repository: "VaultSparkStudios/promogrind",
    runId: "fixture",
    generatedAt: "2026-07-26T00:00:00.000Z",
  });
  expectOk(verifyReleaseAttestation(attestation, { artifactDir: root, commitSha }));
  assert.equal(attestation.artifact.fileCount, 2);
  assert.ok(attestation.gates.every((gate) => gate.state === "passing"));

  fs.writeFileSync(path.join(root, "assets", "app.js"), "export const ready = false;");
  assert.deepEqual(
    verifyReleaseAttestation(attestation, { artifactDir: root, commitSha }).reason,
    "artifact-mismatch",
  );
  assert.equal(
    verifyReleaseAttestation(attestation, { artifactDir: root, commitSha: "def5678" }).reason,
    "commit-mismatch",
  );
  console.log("release attestation regression passed · commit/gates/artifact bound");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function expectOk(verdict) {
  assert.equal(verdict.ok, true, verdict.reason);
}
