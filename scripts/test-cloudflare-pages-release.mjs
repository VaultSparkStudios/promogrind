#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashArtifactDirectory, prepareCloudflareArtifact, resolveReleaseTarget, evaluateReleaseResponse, partitionWebDnsRecords, REQUIRED_RELEASE_HEADERS } from "./lib/cloudflare-pages-release.mjs";

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
fs.rmSync(temp, { recursive: true, force: true });
const response = new Response("ok", { status: 200, headers: Object.fromEntries(REQUIRED_RELEASE_HEADERS.map((name) => [name, "present"])) });
assert.deepEqual(evaluateReleaseResponse(response), { ok: true, status: 200, missingHeaders: [] });
const partition = partitionWebDnsRecords([
  { id: "web-a", type: "A" },
  { id: "web-v6", type: "AAAA" },
  { id: "mail", type: "MX", managed_by_apps: true },
  { id: "spf", type: "TXT" },
]);
assert.deepEqual(partition.web.map((record) => record.id), ["web-a", "web-v6"]);
assert.deepEqual(partition.preserved.map((record) => record.id), ["mail", "spf"]);
console.log("Cloudflare Pages release contract: PASS");
