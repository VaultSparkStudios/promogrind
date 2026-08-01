import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_PREFIX_REGISTRY, classifyStorageKey } from "../src/lib/storageRegistry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");
const extensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const nonStorageSignals = new Set([
  "pg:billing-unavailable",
  "pg:checkout-unavailable",
  "pg:quick-calc",
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : walk(full);
    if (!extensions.has(path.extname(entry.name)) || /\.test\.[^.]+$/.test(entry.name)) return [];
    if (path.resolve(full) === path.resolve(sourceRoot, "lib", "storageRegistry.js")) return [];
    return [full];
  });
}

const tokenPattern = /(?:_?pg(?::|_)[A-Za-z0-9_:-]+|promo_engine_v3)/g;
const sightings = new Map();
for (const file of walk(sourceRoot)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    if (!sightings.has(token)) sightings.set(token, new Set());
    sightings.get(token).add(relative);
  }
}

function isConstructionRoot(token) {
  return STORAGE_PREFIX_REGISTRY.some((entry) =>
    entry.prefix === token || entry.prefix.startsWith(`${token}:`) || entry.prefix.startsWith(`${token}_`));
}

const unclassified = [...sightings.entries()]
  .filter(([token]) => !nonStorageSignals.has(token))
  .filter(([token]) => !classifyStorageKey(token, token.startsWith("pg_session_") || token === "pg_launch_impressions" ? "session" : "local"))
  .filter(([token]) => !isConstructionRoot(token))
  .map(([token, files]) => ({ token, files: [...files].sort() }));

if (unclassified.length) {
  console.error("Storage registry contract FAILED: production tokens lack data-rights policy.");
  for (const item of unclassified) console.error(`- ${item.token}: ${item.files.join(", ")}`);
  process.exit(1);
}

console.log(`Storage registry contract: ${sightings.size} production tokens classified (${nonStorageSignals.size} event signals excluded).`);
