import fs from "node:fs";
import path from "node:path";

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(root, entry.name);
      return entry.isDirectory() ? walk(absolute) : [absolute];
    });
}

function portable(file) {
  return file.split(path.sep).join("/");
}

export function discoverEdgeVerification(root = "supabase/functions") {
  const files = walk(root).map(portable).sort();
  const entries = files.filter((file) => file.endsWith("/index.ts"));
  const tests = files.filter((file) =>
    /(?:\/|^)(?:[^/]+_test|[^/]+\.test)\.ts$/.test(file)
  );
  if (entries.length === 0) throw new Error("No Supabase Edge Function entrypoints found.");
  if (tests.length === 0) throw new Error("No Supabase Edge Function tests found.");
  return {
    schemaVersion: 1,
    root: portable(root),
    entries,
    tests,
  };
}

export function edgeVerificationEnvironment(environment = process.env) {
  return { ...environment, DENO_NO_PACKAGE_JSON: "1", DENO_NO_UPDATE_CHECK: "1" };
}

export function buildEdgeVerificationCommands(plan, { lockFile = "deno.lock", cachedOnly = false } = {}) {
  const dependencyFlags = ["--no-config", "--node-modules-dir=none", `--lock=${lockFile}`, "--frozen"];
  if (cachedOnly) dependencyFlags.push("--cached-only");
  return [
    { label: "typecheck-all-entrypoints", args: [...(cachedOnly ? ["test", "--no-run"] : ["check"]), ...dependencyFlags, ...plan.entries] },
    { label: "test-all-discovered-tests", args: ["test", ...dependencyFlags, "--allow-env", ...plan.tests] },
  ];
}
