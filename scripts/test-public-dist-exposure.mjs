#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { scanDistDirectory } from "./check-public-dist-exposure.mjs";
import { isPinnedPublicAnonJwt } from "./lib/supabase-client-authority.mjs";
import { PROMOGRIND_PROJECT_REF } from "./lib/supabase-deploy-plan.mjs";

const claims = { iss: "supabase", ref: PROMOGRIND_PROJECT_REF, role: "anon", iat: 1700000000, exp: 2200000000 };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (overrides = {}, header = { alg: "HS256", typ: "JWT" }) => [encode(header), encode({ ...claims, ...overrides }), Buffer.alloc(32, 7).toString("base64url")].join(".");
const publicKey = token();
assert.equal(isPinnedPublicAnonJwt(publicKey), true);
const rejected = [
  ["service role", token({ role: "service_role" })],
  ["authenticated user", token({ role: "authenticated" })],
  ["unknown role", token({ role: "unknown" })],
  ["different project", token({ ref: "different-project" })],
  ["wrong issuer", token({ iss: "https://untrusted.example" })],
  ["missing role", token({ role: undefined })],
  ["user claims", token({ sub: "private-user-identifier" })],
  ["missing expiry", token({ exp: undefined })],
  ["invalid timestamps", token({ exp: 1 })],
  ["unsigned algorithm", token({}, { alg: "none", typ: "JWT" })],
  ["different algorithm", token({}, { alg: "RS256", typ: "JWT" })],
  ["unrecognized header", token({}, { alg: "HS256", typ: "JWT", jku: "https://untrusted.example" })],
  ["malformed payload", `${encode({ alg: "HS256", typ: "JWT" })}.e30.${Buffer.alloc(32, 7).toString("base64url")}`],
  ["short signature", `${publicKey.split(".").slice(0, 2).join(".")}.bad`],
  ["empty signature", `${publicKey.split(".").slice(0, 2).join(".")}.`],
  ["extra segment", `${publicKey}.extra`],
  ["padded encoding", `${publicKey}=`],
];
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "pg-dist-exposure-"));
const asset = path.join(fixture, "app.js");
try {
  fs.writeFileSync(asset, `export const publicKey = ${JSON.stringify(publicKey)};`);
  assert.equal(scanDistDirectory(fixture).ok, true, "exact pinned public anon API-key claims may ship in the browser");
  for (const [label, value] of rejected) {
    assert.equal(isPinnedPublicAnonJwt(value), false, label);
    fs.writeFileSync(asset, `export const key = ${JSON.stringify(value)};`);
    const result = scanDistDirectory(fixture);
    assert.equal(result.ok, false, `${label} must fail the dist gate`);
    assert.ok(result.findings.some((finding) => finding.rule === "jwt_like"), label);
    assert.ok(!JSON.stringify(result).includes(value), `${label} must never appear in finding output`);
    assert.ok(!JSON.stringify(result).includes(value.slice(0, 24)), `${label} prefix must remain redacted`);
  }
  const secretKey = `sb_secret_${"private-value".repeat(4)}`;
  fs.writeFileSync(asset, `export const key = ${JSON.stringify(secretKey)};`);
  assert.ok(scanDistDirectory(fixture).findings.some((finding) => finding.rule === "supabase_secret_key"));
  const privileged = token({ role: "service_role" });
  fs.writeFileSync(asset, [...Array(5).fill(publicKey), privileged, secretKey, "SUPABASE_SERVICE_ROLE_KEY", ".env.admin"].map((value) => JSON.stringify(value)).join("\n"));
  const mixed = scanDistDirectory(fixture);
  assert.equal(mixed.ok, false, "multiple allowed keys must not exhaust the finding limit and hide a later secret");
  assert.ok(mixed.findings.some((finding) => finding.rule === "jwt_like"));
  assert.ok(mixed.findings.every((finding) => finding.detail.endsWith("<redacted>")));
  assert.ok(mixed.findings.every((finding) => finding.line > 0 && finding.column > 0));
  const cli = spawnSync(process.execPath, ["scripts/check-public-dist-exposure.mjs", "--dir", fixture, "--json"], { encoding: "utf8" });
  assert.equal(cli.status, 1);
  const output = `${cli.stdout}${cli.stderr}`;
  for (const value of [privileged, privileged.slice(0, 24), secretKey, "private-value"]) assert.ok(!output.includes(value), "CLI output must redact secret content and prefixes");
  assert.equal(JSON.parse(cli.stdout).ok, false);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
console.log("Public dist exposure regression passed: pinned public anon only, private credentials rejected, findings redacted.");
