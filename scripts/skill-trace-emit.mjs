#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, ".cache");
fs.mkdirSync(dir, { recursive: true });
const entry = { at: new Date().toISOString(), argv: process.argv.slice(2) };
fs.appendFileSync(path.join(dir, "skill-trace.ndjson"), `${JSON.stringify(entry)}\n`);
console.log("skill-trace: recorded");