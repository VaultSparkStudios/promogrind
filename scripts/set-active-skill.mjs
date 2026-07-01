#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const skill = process.argv[2] || "unknown";
const root = process.cwd();
const cacheDir = path.join(root, ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
const payload = {
  skill,
  pid: process.pid,
  startedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(cacheDir, "active-skill.json"), JSON.stringify(payload, null, 2));
console.log(`active-skill: ${skill}`);