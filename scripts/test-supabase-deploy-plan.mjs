#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "./lib/safe-spawn.mjs";
import {
  AI_PROVIDER_FUNCTIONS,
  buildSupabaseDeployPlan,
  PROMOGRIND_PROJECT_REF,
} from "./lib/supabase-deploy-plan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plan = buildSupabaseDeployPlan({ root, includeMigration: true });
assert.equal(plan.target, PROMOGRIND_PROJECT_REF);
assert.deepEqual(plan.selected, AI_PROVIDER_FUNCTIONS);
assert.equal(plan.commands[0].kind, "migration");
assert.ok(plan.commands.every((entry) => {
  const index = entry.args.indexOf("--project-ref");
  return index >= 0 && entry.args[index + 1] === PROMOGRIND_PROJECT_REF;
}));
assert.throws(
  () => buildSupabaseDeployPlan({ root, target: "wrong-project" }),
  /Refusing Supabase target/,
);
assert.throws(
  () => buildSupabaseDeployPlan({ root, scope: "named", names: ["missing-function"] }),
  /Unknown Supabase function/,
);

const dryRun = spawnSync(process.execPath, ["scripts/deploy-supabase.mjs", "--migration", "--json"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(dryRun.status, 0, dryRun.stderr);
const payload = JSON.parse(dryRun.stdout);
assert.equal(payload.mode, "dry-run");
assert.ok(payload.commands.every((entry) => entry.display.includes(`--project-ref ${PROMOGRIND_PROJECT_REF}`)));
assert.ok(!dryRun.stdout.match(/access[_-]?token|service[_-]?role/i));

console.log("Supabase deploy plan regression passed · target locked · dry run secret-free");
