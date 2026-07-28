#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildPublicCapabilityContract } from "./lib/public-capability-contract.mjs";

const target = "public/capabilities.json";
const expected = `${JSON.stringify(buildPublicCapabilityContract(), null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== expected) {
    console.error(`${target} is stale; run node scripts/generate-public-capabilities.mjs`);
    process.exit(1);
  }
  console.log(`${target} matches source truth.`);
} else {
  const temporary = `${target}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temporary, expected);
  fs.renameSync(temporary, target);
  console.log(`Generated ${target}.`);
}
