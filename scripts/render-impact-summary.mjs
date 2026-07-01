#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const handoffPath = path.join(root, "context", "LATEST_HANDOFF.md");
const cacheDir = path.join(root, ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
const handoff = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, "utf8") : "";
const block = handoff.split(/^---$/m)[0].trim();
const bullets = [...block.matchAll(/^- (.+)$/gm)].slice(0, 5).map((m) => m[1]);
const headline = block.match(/Intent Outcome:\s*(.+)/)?.[1] || "Closeout impact summary generated from latest handoff.";
const session = block.match(/Session\s+(\d+)/)?.[1] || "unknown";
const lines = [`Impact Summary S${session}`, "", headline, "", ...bullets.map((b) => `- ${b}`)];
const md = `${lines.join("\n")}\n`;
fs.writeFileSync(path.join(cacheDir, `closeout-impact-${session}.md`), md);
fs.writeFileSync(path.join(cacheDir, `closeout-impact-${session}.json`), JSON.stringify({ session, headline, bullets }, null, 2));
console.log(md);