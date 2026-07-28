#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { buildReleaseAttestation, verifyReleaseAttestation } from "./lib/release-attestation.mjs";

const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const artifactDir = path.resolve(value("--dist", "dist"));
const outputPath = path.resolve(value("--out", "artifacts/release/preflight-attestation.json"));
const commitSha = value("--commit", process.env.GITHUB_SHA || "");
const check = args.includes("--check");

if (args.includes("--help")) {
  console.log("Usage: node scripts/render-release-attestation.mjs --dist <dir> --out <json> --commit <sha> [--check]");
  process.exit(0);
}

if (check) {
  const attestation = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const verdict = verifyReleaseAttestation(attestation, { artifactDir, commitSha });
  if (!verdict.ok) {
    console.error(`release-attestation: invalid (${verdict.reason})`);
    process.exit(1);
  }
  console.log(`release-attestation: valid · ${verdict.actual.fileCount} files · ${verdict.actual.digest.slice(0, 12)}`);
} else {
  const attestation = buildReleaseAttestation({
    artifactDir,
    commitSha,
    repository: process.env.GITHUB_REPOSITORY || null,
    runId: process.env.GITHUB_RUN_ID || null,
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temp = `${outputPath}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(attestation, null, 2) + "\n");
  fs.renameSync(temp, outputPath);
  console.log(`release-attestation: wrote ${path.relative(process.cwd(), outputPath)} · ${attestation.artifact.fileCount} files`);
}
