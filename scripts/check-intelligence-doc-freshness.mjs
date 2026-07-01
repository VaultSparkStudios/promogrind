#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = [
  "docs/STARTUP_BRIEF.md",
  "docs/GENIUS_LIST.md",
  "docs/INNOVATION_PACK.md",
  "docs/CLOSEOUT_STATUS_BOARD.md",
  "context/PROJECT_STATUS.json",
];
const now = Date.now();
const results = docs.map((rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return { path: rel, status: "missing" };
  const ageHours = Math.round((now - fs.statSync(p).mtimeMs) / 36e5);
  return { path: rel, status: ageHours <= 24 ? "fresh" : "stale", ageHours };
});
console.log(JSON.stringify({ ok: true, results }, null, 2));