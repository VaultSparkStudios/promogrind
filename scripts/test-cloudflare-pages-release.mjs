#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashArtifactDirectory, prepareReleaseBinding, validateStagingReceipt, prepareCloudflareArtifact, resolveReleaseTarget, evaluateReleaseResponse, waitForReleaseOrigin, partitionWebDnsRecords, REQUIRED_RELEASE_HEADERS, RELEASE_BINDING_FILE } from "./lib/cloudflare-pages-release.mjs";

assert.equal(resolveReleaseTarget("staging").domain, "staging.promogrind.bet");
assert.equal(resolveReleaseTarget("production").domain, "promogrind.bet");
assert.throws(() => resolveReleaseTarget("preview"), /Unknown release environment/);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pg-cf-release-"));
fs.writeFileSync(path.join(temp, "index.html"), "one");
fs.writeFileSync(path.join(temp, "_redirects"), "/* /index.html 200\n");
fs.writeFileSync(path.join(temp, "_health"), "ok\n");
fs.writeFileSync(path.join(temp, "404.html"), "github fallback");
const first = hashArtifactDirectory(temp);
fs.writeFileSync(path.join(temp, "index.html"), "two");
assert.notEqual(hashArtifactDirectory(temp), first);
assert.equal(prepareCloudflareArtifact(temp).removedGithubFallback, true);
assert.equal(fs.existsSync(path.join(temp, "404.html")), false);
const binding = prepareReleaseBinding(temp, "123456789abcdef");
const boundDigest = hashArtifactDirectory(temp);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp, RELEASE_BINDING_FILE), "utf8")), binding);
assert.deepEqual(prepareReleaseBinding(temp, "123456789abcdef"), binding, "staging and production bind identical content deterministically");
assert.equal(hashArtifactDirectory(temp), boundDigest, "repeat promotion must retain the full artifact digest");
assert.notEqual(prepareReleaseBinding(temp, "abcdef123456789").commit, binding.commit);
fs.writeFileSync(path.join(temp, "index.html"), "three");
const changedBinding = prepareReleaseBinding(temp, "123456789abcdef");
assert.notEqual(changedBinding.contentDigest, binding.contentDigest);
assert.notEqual(changedBinding.indexSha256, binding.indexSha256);
fs.rmSync(temp, { recursive: true, force: true });
const response = new Response("ok", { status: 200, headers: Object.fromEntries(REQUIRED_RELEASE_HEADERS.map((name) => [name, "present"])) });
assert.deepEqual(evaluateReleaseResponse(response), { ok: true, status: 200, missingHeaders: [] });
const primaryOrigin = "https://staging.promogrind.bet";
const fallbackOrigin = "https://promogrind-staging.pages.dev";
const healthyResponse = () => new Response("ok", { status: 200, headers: Object.fromEntries(REQUIRED_RELEASE_HEADERS.map((name) => [name, "present"])) });
const calls = [];
const sleeps = [];
const fallbackOnly = await waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 2,
  fetchImpl: async (origin) => {
    calls.push(origin);
    return origin === fallbackOrigin ? healthyResponse() : new Response("unavailable", { status: 503 });
  },
  sleep: async (milliseconds) => { sleeps.push(milliseconds); },
});
assert.equal(fallbackOnly.ok, false, "a healthy pages.dev fallback cannot attest a failing custom domain");
assert.equal(fallbackOnly.origin, primaryOrigin);
assert.equal(fallbackOnly.status, 503, "preserve the custom domain failure for the release receipt");
assert.equal(fallbackOnly.fallback.ok, true, "retain fallback diagnostics without accepting them as release proof");
assert.deepEqual(calls, [primaryOrigin, fallbackOrigin, primaryOrigin, fallbackOrigin]);
assert.deepEqual(sleeps, [5000], "do not sleep after the final probe");
const networkFailure = await waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 1,
  fetchImpl: async (origin) => {
    if (origin === primaryOrigin) throw new Error("DNS unavailable");
    return healthyResponse();
  },
});
assert.equal(networkFailure.ok, false);
assert.equal(networkFailure.error, "DNS unavailable");
assert.equal(networkFailure.fallback.ok, true);
const missingHeaders = await waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 1,
  fetchImpl: async (origin) => origin === primaryOrigin ? new Response("ok") : healthyResponse(),
});
assert.equal(missingHeaders.ok, false);
assert.deepEqual(missingHeaders.missingHeaders, REQUIRED_RELEASE_HEADERS);
let primaryAttempts = 0;
const recovered = await waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 2,
  fetchImpl: async (origin) => {
    if (origin === primaryOrigin && ++primaryAttempts === 1) return new Response("unavailable", { status: 503 });
    return healthyResponse();
  },
  sleep: async () => {},
});
assert.equal(recovered.ok, true);
assert.equal(recovered.origin, primaryOrigin);
assert.equal(primaryAttempts, 2, "allow custom-domain recovery while polling");
const redirected = await waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 1,
  fetchImpl: async () => {
    const redirectedResponse = healthyResponse();
    Object.defineProperty(redirectedResponse, "url", { value: fallbackOrigin });
    return redirectedResponse;
  },
});
assert.equal(redirected.ok, false, "cross-origin redirects cannot attest the configured domain");
assert.match(redirected.error, /redirected/);
const expectedIndex = "<html>this release</html>";
const expectedRelease = {
  schemaVersion: "1.0",
  commit: "123456789abcdef",
  contentDigest: "a".repeat(64),
  indexSha256: crypto.createHash("sha256").update(expectedIndex).digest("hex"),
};
const verifyBoundRelease = async ({ marker = expectedRelease, index = expectedIndex, markerStatus = 200 } = {}) => waitForReleaseOrigin("staging.promogrind.bet", fallbackOrigin, {
  attempts: 1,
  expectedRelease,
  fetchImpl: async (url, options) => {
    const parsed = new URL(url);
    if (parsed.pathname === `/${RELEASE_BINDING_FILE}`) {
      assert.equal(parsed.searchParams.get("release"), expectedRelease.contentDigest);
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      return new Response(JSON.stringify(marker), { status: markerStatus });
    }
    if (parsed.pathname === "/" && parsed.searchParams.has("release")) return new Response(index);
    return healthyResponse();
  },
});
const boundRelease = await verifyBoundRelease();
assert.equal(boundRelease.ok, true);
assert.equal(boundRelease.releaseVerified, true);
assert.equal(boundRelease.commit, expectedRelease.commit);
assert.equal(boundRelease.contentDigest, expectedRelease.contentDigest);
const oldRelease = await verifyBoundRelease({ marker: { ...expectedRelease, commit: "old-commit" } });
assert.equal(oldRelease.ok, false, "a healthy old release must not pass promotion verification");
assert.match(oldRelease.error, /commit does not match/);
const wrongArtifact = await verifyBoundRelease({ marker: { ...expectedRelease, contentDigest: "b".repeat(64) } });
assert.equal(wrongArtifact.ok, false);
assert.match(wrongArtifact.error, /contentDigest does not match/);
const missingMarker = await verifyBoundRelease({ markerStatus: 404 });
assert.equal(missingMarker.ok, false);
assert.match(missingMarker.error, /HTTP 404/);
const staleIndex = await verifyBoundRelease({ index: "<html>previous release</html>" });
assert.equal(staleIndex.ok, false, "new metadata cannot certify stale HTML");
assert.match(staleIndex.error, /Deployed index does not match/);
const promotion = { artifactDigest: "c".repeat(64), commit: expectedRelease.commit, releaseBinding: expectedRelease };
const stagingReceipt = {
  environment: "staging",
  project: "promogrind-staging",
  domain: "staging.promogrind.bet",
  ...promotion,
  verification: boundRelease,
};
assert.equal(validateStagingReceipt(stagingReceipt, promotion).artifactDigest, promotion.artifactDigest);
assert.throws(() => validateStagingReceipt(null, promotion), /matching verified staging receipt/);
for (const [key, value] of Object.entries({ environment: "production", project: "other", domain: "other.example", artifactDigest: "old", commit: "old" })) {
  assert.throws(() => validateStagingReceipt({ ...stagingReceipt, [key]: value }, promotion), /matching verified staging receipt/, `reject incorrect ${key}`);
}
for (const [key, value] of Object.entries({ ok: false, releaseVerified: false, origin: fallbackOrigin, commit: "old", contentDigest: "old", indexSha256: "old" })) {
  assert.throws(() => validateStagingReceipt({ ...stagingReceipt, verification: { ...boundRelease, [key]: value } }, promotion), /matching verified staging receipt/, `reject unverified ${key}`);
}
assert.throws(() => validateStagingReceipt({ ...stagingReceipt, releaseBinding: { ...expectedRelease, contentDigest: "old" } }, promotion), /releaseBinding.contentDigest/);
const partition = partitionWebDnsRecords([
  { id: "web-a", type: "A" },
  { id: "web-v6", type: "AAAA" },
  { id: "mail", type: "MX", managed_by_apps: true },
  { id: "spf", type: "TXT" },
]);
assert.deepEqual(partition.web.map((record) => record.id), ["web-a", "web-v6"]);
assert.deepEqual(partition.preserved.map((record) => record.id), ["mail", "spf"]);
console.log("Cloudflare Pages release contract: PASS");
