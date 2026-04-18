#!/usr/bin/env node
/**
 * check-revenue-freshness.mjs
 *
 * Checks how old REVENUE_SIGNALS.md is and warns if stale.
 * Used by run-doctor.mjs and startup brief renderer.
 *
 * Usage:
 *   node scripts/check-revenue-freshness.mjs
 *   node scripts/check-revenue-freshness.mjs --json
 *   node scripts/ops.mjs revenue-check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readText(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

const jsonMode = process.argv.includes('--json');
const today    = new Date().toISOString().slice(0, 10);
const WARN_DAYS = 7;
const CRITICAL_DAYS = 14;

const content  = readText(path.join(ROOT, 'portfolio', 'REVENUE_SIGNALS.md'));
const match    = content.match(/Generated:\s*(\d{4}-\d{2}-\d{2})/);
const genDate  = match?.[1] ?? null;
const ageDays  = genDate ? Math.floor((new Date(today) - new Date(genDate)) / 86400000) : 999;
const stale    = ageDays >= WARN_DAYS;
const critical = ageDays >= CRITICAL_DAYS;

const status = critical ? '⛔ CRITICAL' : stale ? '⚠ STALE' : '✓ FRESH';
const signal = critical ? '⛔' : stale ? '⚠' : '✓';

if (jsonMode) {
  console.log(JSON.stringify({ genDate, ageDays, stale, critical, status }));
  process.exit(stale ? 1 : 0);
}

console.log(`${signal}  Revenue signals: ${genDate ?? 'unknown'} (${ageDays}d old) — ${status}`);
if (stale) {
  console.log(`   Run: node scripts/ops.mjs revenue-signals`);
}
process.exit(stale ? 1 : 0);
