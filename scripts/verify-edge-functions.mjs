#!/usr/bin/env node
import { spawnSync } from "./lib/safe-spawn.mjs";
import { discoverEdgeVerification } from "./lib/edge-verification.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const planOnly = args.has("--plan");
const plan = discoverEdgeVerification();

if (planOnly) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

function run(label, commandArgs) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.platform === "win32" ? "deno.exe" : "deno", commandArgs, {
    encoding: "utf8",
    stdio: json ? "pipe" : "inherit",
    shell: false,
  });
  return {
    label,
    startedAt,
    status: result.error
      ? "unavailable"
      : result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? 2,
    ...(json && {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? String(result.error?.message ?? ""),
    }),
  };
}

const checks = [
  run("typecheck-all-entrypoints", ["check", "--node-modules-dir=auto", ...plan.entries]),
  run("test-all-discovered-tests", ["test", "--allow-env", ...plan.tests]),
];
const passed = checks.every((check) => check.status === "passed");
const receipt = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: plan,
  status: passed ? "passed" : "failed",
  checks,
};

if (json) console.log(JSON.stringify(receipt, null, 2));
else console.log(`Edge verification ${receipt.status}: ${plan.entries.length} entrypoints, ${plan.tests.length} test files.`);
process.exitCode = passed ? 0 : 1;
