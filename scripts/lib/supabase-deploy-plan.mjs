import fs from "node:fs";
import path from "node:path";

export const PROMOGRIND_PROJECT_REF = "fjnpzjjyhnpmunfoycrp";
export const PROMOGRIND_DEPLOY_CAPABILITY = "promogrind.supabase.deploy";
export const AI_PROVIDER_FUNCTIONS = Object.freeze([
  "ai-action-plan",
  "parse-bet-slip",
  "promo-advisor",
  "promo-chat",
  "stack-builder",
]);

export function discoverSupabaseFunctions(root) {
  const functionsRoot = path.join(root, "supabase", "functions");
  return fs.readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .filter((entry) => fs.existsSync(path.join(functionsRoot, entry.name, "index.ts")))
    .map((entry) => entry.name)
    .sort();
}

export function assertTarget(target) {
  if (target !== PROMOGRIND_PROJECT_REF) {
    throw new Error(`Refusing Supabase target ${target || "<missing>"}; PromoGrind is pinned to ${PROMOGRIND_PROJECT_REF}`);
  }
  return target;
}

export function buildSupabaseDeployPlan({
  root,
  target = PROMOGRIND_PROJECT_REF,
  scope = "ai",
  names = [],
  includeMigration = false,
} = {}) {
  assertTarget(target);
  const available = discoverSupabaseFunctions(root);
  const selected = scope === "all"
    ? available
    : scope === "named"
      ? [...new Set(names)].sort()
      : AI_PROVIDER_FUNCTIONS.filter((name) => available.includes(name));
  const missing = selected.filter((name) => !available.includes(name));
  if (missing.length) throw new Error(`Unknown Supabase function(s): ${missing.join(", ")}`);
  if (!selected.length && !includeMigration) throw new Error("Deploy plan is empty");

  const commands = [];
  if (includeMigration) {
    commands.push({
      kind: "migration",
      command: "supabase",
      args: ["db", "push", "--project-ref", target],
      target,
    });
  }
  for (const name of selected) {
    commands.push({
      kind: "function",
      name,
      command: "supabase",
      args: ["functions", "deploy", name, "--project-ref", target, "--no-verify-jwt"],
      target,
    });
  }
  return {
    schemaVersion: "1.0",
    capability: PROMOGRIND_DEPLOY_CAPABILITY,
    target,
    scope,
    includeMigration,
    available,
    selected,
    commands,
  };
}
