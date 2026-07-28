#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "./lib/safe-spawn.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanner = path.join(root, "scripts", "scan-secrets.mjs");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-secret-scan-"));
const fixture = path.join(tempDir, "shell-secret.sh");

try {
  // Exercise the entropy boundary deterministically. Random fixtures can produce
  // a different classifier outcome across runs and make a security gate flaky.
  // Keep source fragments below scanner token lengths while the joined value
  // covers the complete base64url alphabet exactly once (entropy = 6 bits).
  const secret = [
    "abcdefghijklmnop",
    "qrstuvwxyzABCDEF",
    "GHIJKLMNOPQRSTUV",
    "WXYZ0123456789-_",
  ].join("");
  fs.writeFileSync(fixture, `WEBHOOK_SECRET=${secret}\n`, "utf8");
  const detected = spawnSync(process.execPath, [scanner, fixture, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(detected.status, 1, "high-entropy unquoted shell secret must block");
  const payload = JSON.parse(detected.stdout);
  assert.equal(payload.count, 1);
  assert.equal(payload.findings[0].type, "generic-shell");
  assert.ok(!detected.stdout.includes(secret), "scanner output must never echo the raw secret");

  fs.writeFileSync(fixture, `WEBHOOK_SECRET=${"A".repeat(64)}\n`, "utf8");
  const placeholder = spawnSync(process.execPath, [scanner, fixture, "--json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(placeholder.status, 0, "low-entropy placeholder must remain allowed");

  console.log("secret scanner regression passed · shell assignment detected · output redacted");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
