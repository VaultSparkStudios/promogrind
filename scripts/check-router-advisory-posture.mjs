import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_VERSION = "7.18.2";
const RSC_API_PATTERN = /\b(?:unstable_RSCStaticRouter|unstable_matchRSCServerRequest|unstable_getRSCStream|RSCRouteConfigEntry|createCallServer|decodeReply|decodeAction)\b/;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [target] : [];
  }));
  return nested.flat();
}

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(path.join(ROOT, "package-lock.json"), "utf8"));
const main = await readFile(path.join(ROOT, "src", "main.jsx"), "utf8");
const failures = [];

if (pkg.dependencies?.["react-router-dom"] !== EXPECTED_VERSION) {
  failures.push("package.json must pin react-router-dom " + EXPECTED_VERSION);
}
if (lock.packages?.["node_modules/react-router-dom"]?.version !== EXPECTED_VERSION) {
  failures.push("package-lock.json must resolve react-router-dom " + EXPECTED_VERSION);
}
if (!main.includes('import { BrowserRouter } from "react-router-dom"') || !main.includes("<BrowserRouter")) {
  failures.push("src/main.jsx must retain the client-only BrowserRouter entrypoint");
}

for (const file of await sourceFiles(path.join(ROOT, "src"))) {
  const source = await readFile(file, "utf8");
  const match = source.match(RSC_API_PATTERN);
  if (match) failures.push(path.relative(ROOT, file) + " imports or calls RSC API " + match[0]);
}

if (failures.length) {
  console.error("React Router advisory posture failed:");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}

console.log("React Router advisory posture: PASS");
console.log("- react-router-dom " + EXPECTED_VERSION + " pinned");
console.log("- static BrowserRouter entrypoint confirmed");
console.log("- no React Server Components router APIs found in src/");
