#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const appPath = path.join(process.cwd(), "src", "App.jsx");
const source = fs.readFileSync(appPath, "utf8");
const lines = source.split(/\r?\n/);

const markerIndex = lines.findIndex((line) => line.includes('if (pathname.startsWith("/land/"))'));
if (markerIndex === -1) {
  console.error("Could not find App.jsx early-return marker for landing routes.");
  process.exit(1);
}

const hookPattern = /\b(?:React\.)?use(?:State|Effect|Memo|Callback|Reducer|Ref|Context|LayoutEffect|ImperativeHandle|DeferredValue|Transition|Id|SyncExternalStore|InsertionEffect)\s*\(/;
const violations = [];

for (let index = markerIndex + 1; index < lines.length; index += 1) {
  const line = lines[index];
  if (hookPattern.test(line)) {
    violations.push({ line: index + 1, text: line.trim() });
  }
}

if (violations.length) {
  console.error("App.jsx hook-order guard failed.");
  console.error("React hooks must stay above the route early returns to avoid cold-load hook-order crashes.");
  for (const violation of violations) {
    console.error(`- ${appPath}:${violation.line}: ${violation.text}`);
  }
  process.exit(1);
}

console.log("App hook-order guard passed.");
