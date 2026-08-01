#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../lib/safe-spawn.mjs";
import { scanProject, writeReports } from "../check-public-repo-sanitization.mjs";

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-sanitization-"));
try {
  spawnSync("git", ["init", "--quiet"], { cwd: fixture, encoding: "utf8" });
  fs.mkdirSync(path.join(fixture, "docs"), { recursive: true });
  fs.writeFileSync(path.join(fixture, ".env"), "PUBLIC_VALUE=fixture-only\n", "utf8");
  const syntheticStripe = ["sk", "test", "A".repeat(20)].join("_");
  const syntheticPath = ["C:", "Users", "fixture", "Development", "repo"].join("\\");
  fs.writeFileSync(path.join(fixture, "docs", "unsafe.md"), `${syntheticStripe}\n${syntheticPath}\\\n`, "utf8");
  fs.writeFileSync(path.join(fixture, "README.md"), "Public fixture\n", "utf8");
  const add = spawnSync("git", ["add", ".env", "docs/unsafe.md", "README.md"], { cwd: fixture, encoding: "utf8" });
  assert.equal(add.status, 0, add.stderr);

  const project = {
    slug: "sanitization-fixture",
    name: "Sanitization Fixture",
    repo: "fixture/repo",
    audience: "public-unlaunched",
    localPath: fixture,
  };
  const result = scanProject(project);
  const rules = new Set(result.findings.map(finding => finding.rule));
  assert.ok(rules.has("env_file"), "tracked .env must be rejected");
  assert.ok(rules.has("stripe_secret"), "credential-shaped content must be rejected");
  assert.ok(rules.has("windows_local_path"), "absolute local paths must be rejected");
  assert.ok(result.findings.every(finding => !String(finding.detail).includes(syntheticStripe)), "credential values must be redacted");

  const reportDir = path.join(fixture, "reports");
  writeReports([result], reportDir);
  const issue = JSON.parse(fs.readFileSync(path.join(reportDir, "sanitization-fixture.issue.json"), "utf8"));
  assert.equal(issue.slug, "sanitization-fixture");
  assert.ok(issue.labels.includes("security"));
  assert.ok(fs.existsSync(path.join(reportDir, "_summary.json")));
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log("public-repo sanitization: PASS (tracked path, credential, redaction, and report fixtures)");
