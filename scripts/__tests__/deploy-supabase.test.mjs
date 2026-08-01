#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "../lib/safe-spawn.mjs";
import { PROMOGRIND_PROJECT_REF } from "../lib/supabase-deploy-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(args) {
  return spawnSync(process.execPath, ["scripts/deploy-supabase.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const help = run(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /credential-free dry run/i);
assert.match(help.stdout, new RegExp(PROMOGRIND_PROJECT_REF));

const dryRun = run(["--function", "ai-action-plan", "--json"]);
assert.equal(dryRun.status, 0, dryRun.stderr);
const plan = JSON.parse(dryRun.stdout);
assert.equal(plan.mode, "dry-run");
assert.equal(plan.target, PROMOGRIND_PROJECT_REF);
assert.deepEqual(plan.selected, ["ai-action-plan"]);
assert.ok(plan.commands.every(command => command.args.includes("--project-ref")));
assert.doesNotMatch(dryRun.stdout, /(?:access[_-]?token|service[_-]?role|secret[_-]?key)/i);

const wrongTarget = run(["--target", "not-promogrind", "--json"]);
assert.notEqual(wrongTarget.status, 0);
assert.match(`${wrongTarget.stdout}\n${wrongTarget.stderr}`, /Refusing Supabase target/);

console.log("deploy-supabase entrypoint: PASS (help, pinned dry run, secret-free output, target fail-closed)");
