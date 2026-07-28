#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");
const preflightIndex = workflow.indexOf("  preflight:");
const deployIndex = workflow.indexOf("  deploy-pages:");
const verifyIndex = workflow.indexOf("npm run verify:launch-local");
const denoSetupIndex = workflow.indexOf("denoland/setup-deno@v2");
const buildIndex = workflow.indexOf("npm run build:pages");
const uploadIndex = workflow.indexOf("actions/upload-pages-artifact@");
const promoteIndex = workflow.indexOf("actions/deploy-pages@");

assert.ok(preflightIndex >= 0 && deployIndex > preflightIndex, "preflight must precede deploy job");
assert.match(workflow, /deploy-pages:\s*\n[\s\S]*?needs: preflight/);
assert.ok(denoSetupIndex > preflightIndex && denoSetupIndex < verifyIndex,
  "preflight must install Deno before the complete gate verifies Edge Functions");
assert.ok(verifyIndex > preflightIndex && verifyIndex < buildIndex, "complete gate must run before artifact build");
assert.ok(buildIndex < uploadIndex && uploadIndex < deployIndex, "artifact must be built and uploaded by preflight");
assert.ok(promoteIndex > deployIndex, "promotion action must exist only in deploy job");
assert.match(workflow, /render-release-attestation\.mjs[\s\S]*?--check/);
assert.match(workflow, /verify:web-live -- --url https:\/\/promogrind\.bet/);
assert.match(workflow, /steps\.verify_web_live\.outcome == 'failure'/);
assert.doesNotMatch(workflow.slice(preflightIndex, deployIndex), /continue-on-error:\s*true/);

console.log("release workflow regression passed · attest-before-promote DAG locked");
