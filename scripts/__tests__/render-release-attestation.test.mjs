#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-attestation-entrypoint-"));
try {
  const dist = path.join(fixture, "dist");
  const out = path.join(fixture, "attestation.json");
  fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
  fs.writeFileSync(path.join(dist, "index.html"), "<main>PromoGrind</main>", "utf8");
  fs.writeFileSync(path.join(dist, "assets", "app.js"), "export const ready = true;", "utf8");

  const commit = "abc1234";
  const render = run(["--dist", dist, "--out", out, "--commit", commit]);
  assert.equal(render.status, 0, render.stderr || render.stdout);
  const attestation = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(attestation.commitSha, commit);
  assert.equal(attestation.artifact.fileCount, 2);

  const valid = run(["--dist", dist, "--out", out, "--commit", commit, "--check"]);
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);
  assert.match(valid.stdout, /valid/);

  fs.writeFileSync(path.join(dist, "assets", "app.js"), "export const ready = false;", "utf8");
  const drift = run(["--dist", dist, "--out", out, "--commit", commit, "--check"]);
  assert.notEqual(drift.status, 0);
  assert.match(`${drift.stdout}\n${drift.stderr}`, /artifact-mismatch/);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log("release-attestation entrypoint: PASS (render, verify, and artifact-drift fail-closed)");

function run(args) {
  return spawnSync(process.execPath, ["scripts/render-release-attestation.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
