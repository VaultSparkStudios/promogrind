import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { discoverEdgeVerification, buildEdgeVerificationCommands, edgeVerificationEnvironment } from "./lib/edge-verification.mjs";

const plan = discoverEdgeVerification();
assert.equal(plan.entries.length, 16, "all 16 Edge Function entrypoints must be typechecked");
assert.equal(plan.tests.length, 10, "all ten discovered Edge test files must execute");
assert.ok(plan.entries.includes("supabase/functions/publish-public-stats/index.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/public-stats_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/stats-publisher_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/advisor-privacy_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/marketing-consent_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/stack-builder-contract_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/stripe-boundary_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/_shared/scheduler-auth_test.ts"));
assert.ok(plan.tests.includes("supabase/functions/__tests__/ai-access.test.ts"));
assert.ok(plan.entries.includes("supabase/functions/calc-api/index.ts"));
assert.equal(new Set(plan.entries).size, plan.entries.length);
assert.equal(new Set(plan.tests).size, plan.tests.length);
const commands = buildEdgeVerificationCommands(plan);
assert.equal(commands.length, 2);
for (const command of commands) {
  assert.ok(command.args.includes("--no-config"), "do not inherit an unrelated Deno configuration");
  assert.ok(command.args.includes("--node-modules-dir=none"), "verification cannot rewrite frontend node_modules");
  assert.ok(command.args.includes("--lock=deno.lock"));
  assert.ok(command.args.includes("--frozen"), "changed dependency graphs must fail without rewriting the lock");
  assert.ok(!command.args.includes("--no-lock"));
  assert.ok(!command.args.includes("--no-check"));
}
assert.deepEqual(commands[0].args.slice(-plan.entries.length), plan.entries);
assert.deepEqual(commands[1].args.slice(-plan.tests.length), plan.tests);
assert.deepEqual(edgeVerificationEnvironment({ PATH: "preserved", DENO_NO_PACKAGE_JSON: "0" }), {
  PATH: "preserved", DENO_NO_PACKAGE_JSON: "1", DENO_NO_UPDATE_CHECK: "1",
});
assert.ok(buildEdgeVerificationCommands(plan, { cachedOnly: true }).every((command) => command.args.includes("--cached-only")));
const edgeLock = JSON.parse(fs.readFileSync("deno.lock", "utf8"));
assert.ok(!edgeLock.workspace?.packageJson, "Edge lock must not contain the frontend package workspace");
assert.deepEqual(Object.keys(edgeLock.specifiers).sort(), ["npm:@anthropic-ai/sdk@0.113.0", "npm:web-push@*"], "only Edge npm imports belong in the Deno lock");

// A deliberately unresolvable frontend manifest must not affect a local Edge check or test.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "pg-edge-isolation-"));
try {
  const packageFile = path.join(fixture, "package.json");
  const lockFile = path.join(fixture, "deno.lock");
  const sentinel = path.join(fixture, "node_modules", "sentinel.txt");
  fs.mkdirSync(path.dirname(sentinel));
  fs.writeFileSync(packageFile, JSON.stringify({ dependencies: { "promogrind-must-never-resolve-this-package": "0.0.0" } }));
  fs.writeFileSync(lockFile, '{"version":"5"}\n');
  fs.writeFileSync(sentinel, "frontend-owned");
  const entry = path.join(fixture, "index.ts");
  const test = path.join(fixture, "isolated_test.ts");
  fs.writeFileSync(entry, "export const edge: number = 1;\n");
  fs.writeFileSync(test, 'Deno.test("isolated", () => { if (1 + 1 !== 2) throw new Error("failed"); });\n');
  const before = [packageFile, lockFile, sentinel].map((file) => fs.readFileSync(file, "utf8"));
  for (const command of buildEdgeVerificationCommands({ entries: [entry], tests: [test] }, { lockFile, cachedOnly: true })) {
    const result = spawnSync(process.platform === "win32" ? "deno.exe" : "deno", command.args, {
      cwd: fixture, env: edgeVerificationEnvironment(), encoding: "utf8", shell: false,
    });
    assert.equal(result.status, 0, `${command.label}: ${result.stderr || result.error?.message || "failed"}`);
  }
  assert.deepEqual([packageFile, lockFile, sentinel].map((file) => fs.readFileSync(file, "utf8")), before);
  assert.deepEqual(fs.readdirSync(path.dirname(sentinel)), ["sentinel.txt"], "Deno must not populate frontend node_modules");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log(`Edge verification discovery passed (${plan.entries.length} entrypoints, ${plan.tests.length} test files).`);
