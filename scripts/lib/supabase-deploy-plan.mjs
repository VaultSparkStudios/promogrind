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

export function assertTargetAdminUrl(url, target = PROMOGRIND_PROJECT_REF) {
  assertTarget(target);
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error("Refusing Supabase deploy: target admin URL is missing or invalid");
  }
  if (hostname !== `${target}.supabase.co`) {
    throw new Error(`Refusing Supabase admin URL ${hostname}; expected ${target}.supabase.co`);
  }
  return url;
}

export function assertTargetManagementProject(project, target = PROMOGRIND_PROJECT_REF) {
  assertTarget(target);
  const observed = project?.id || project?.ref || project?.project_ref || null;
  if (observed !== target) {
    throw new Error(`Refusing Supabase management project ${observed || "<missing>"}; expected ${target}`);
  }
  return project;
}

export function discoverPendingMigrations(root, appliedVersions = []) {
  const applied = new Set(appliedVersions.map(String));
  const migrationsRoot = path.join(root, "supabase", "migrations");
  return fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/.test(entry.name))
    .map((entry) => {
      const match = entry.name.match(/^(\d+)_(.+)\.sql$/);
      return {
        version: match[1],
        name: match[2],
        file: path.join(migrationsRoot, entry.name),
      };
    })
    .filter((entry) => !applied.has(entry.version))
    .sort((a, b) => a.version.localeCompare(b.version));
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildManagementMigrationQuery({ version, name, sql }) {
  if (!/^\d+$/.test(String(version || ""))) throw new Error("Migration version must be numeric");
  if (!String(name || "").trim()) throw new Error("Migration name is required");
  if (!String(sql || "").trim()) throw new Error("Migration SQL is required");
  return [
    "begin;",
    sql.trim(),
    "insert into supabase_migrations.schema_migrations(version, name, statements)",
    `values (${sqlLiteral(version)}, ${sqlLiteral(name)}, ARRAY[${sqlLiteral(sql)}]::text[])`,
    "on conflict (version) do nothing;",
    "commit;",
  ].join("\n");
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
      kind: "link",
      command: "supabase",
      args: ["link", "--project-ref", target, "--yes"],
      target,
    });
    commands.push({
      kind: "migration",
      command: "supabase",
      args: ["db", "push", "--linked", "--yes"],
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
