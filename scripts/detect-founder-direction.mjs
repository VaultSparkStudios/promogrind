#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cdr = path.join(root, "docs", "CREATIVE_DIRECTION_RECORD.md");
const handoff = path.join(root, "context", "LATEST_HANDOFF.md");
const latest = fs.existsSync(handoff) ? fs.readFileSync(handoff, "utf8").slice(0, 4000) : "";
const signals = [/arc/i, /closeout/i, /deploy/i, /direct push/i, /add any missing scripts/i].filter((re) => re.test(latest));
const today = new Date().toISOString().slice(0, 10);
const cdrText = fs.existsSync(cdr) ? fs.readFileSync(cdr, "utf8") : "";
const recordedToday = cdrText.includes(today);
const payload = { ok: true, signalCount: signals.length, recordedToday, recommendation: signals.length && !recordedToday ? "review-cdr" : "none" };
console.log(JSON.stringify(payload, null, 2));