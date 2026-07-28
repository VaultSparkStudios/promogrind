#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyCredentialText } from "./lib/credential-classifiers.mjs";
import { spawnSync } from "./lib/safe-spawn.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))), "..");
const scanner = path.join(root, "scripts", "scan-secrets.mjs");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "promogrind-credential-classifier-"));
const fixture = path.join(tempDir, "credential-fixture.py");

try {
  const password = ["db", "Pass", "2026", "x"].join("-");
  const privilegedJwt = jwt({ role: "service_role", ref: "fixture" });
  const databaseUri = [
    "postgresql", "://", "operator", ":", password,
    "@", "db.example.invalid", ":", "5432", "/", "app",
  ].join("");
  const content = [
    ["DATABASE", "_URL", '="', databaseUri, '"'].join(""),
    ["PG", "PASSWORD", "='", password, "'"].join(""),
    ["SERVICE", "_ROLE_KEY", "='", privilegedJwt, "'"].join(""),
    "ANON_KEY='example-public-browser-value'",
    "DATABASE_URL='${DATABASE_URL}'",
  ].join("\n");

  const classified = classifyCredentialText(content);
  assert.deepEqual(
    [...new Set(classified.map((finding) => finding.type))].sort(),
    ["postgres-credential-uri", "privileged-jwt", "secret-assignment"],
  );
  assert.ok(classified.every((finding) => !JSON.stringify(finding).includes(password)));
  assert.ok(classified.every((finding) => !JSON.stringify(finding).includes(privilegedJwt)));

  fs.writeFileSync(fixture, content, "utf8");
  const result = spawnSync(process.execPath, [scanner, fixture, "--json", "--no-ledger"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.findings.some((finding) => finding.type === "postgres-credential-uri"));
  assert.ok(payload.findings.some((finding) => finding.type === "privileged-jwt"));
  assert.ok(!result.stdout.includes(password));
  assert.ok(!result.stdout.includes(privilegedJwt));

  console.log("credential classifier regression passed · URI/assignment/role detected · output fully redacted");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function jwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.${"s".repeat(43)}`;
}
