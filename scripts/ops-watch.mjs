#!/usr/bin/env node
/**
 * ops-watch.mjs — Live studio health monitor.
 *
 * Reruns doctor + cockpit every 30 seconds with a cleared screen.
 * Press 'q' + Enter (or Ctrl+C) to exit.
 *
 * Usage:
 *   node scripts/ops-watch.mjs
 *   node scripts/ops.mjs watch
 *   node scripts/ops-watch.mjs --interval 60   (custom interval in seconds)
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';
import path from 'path';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const node       = process.execPath;

const intervalArg = process.argv.indexOf('--interval');
const INTERVAL_S  = intervalArg >= 0 ? parseInt(process.argv[intervalArg + 1], 10) || 30 : 30;
const INTERVAL_MS = INTERVAL_S * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(script, args = []) {
  return spawnSync(node, [path.join(ROOT, 'scripts', script), ...args], {
    encoding: 'utf8',
    cwd: ROOT,
    timeout: 60000,
  });
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// ── Single refresh tick ───────────────────────────────────────────────────────
function tick() {
  process.stdout.write('\x1Bc'); // clear screen (works on all platforms)

  const W = 62;
  const now = new Date().toISOString().slice(0, 10);
  console.log(`\n╔${'═'.repeat(W)}╗`);
  console.log(`║  STUDIO WATCH  ·  ${now}  ·  refresh: ${INTERVAL_S}s  ·  q=quit${' '.repeat(W - 52 - INTERVAL_S.toString().length)}║`);
  console.log(`╚${'═'.repeat(W)}╝\n`);

  // Doctor
  const doctorRes = run('run-doctor.mjs', []);
  if (doctorRes.stdout) process.stdout.write(doctorRes.stdout);

  // Cockpit summary (first 30 lines — suppress full file write noise)
  const cockpitRes = run('render-ops-cockpit.mjs', []);
  if (cockpitRes.stdout) {
    const lines = cockpitRes.stdout.split('\n').slice(0, 30);
    process.stdout.write(lines.join('\n') + '\n');
  }

  process.stdout.write(`\n  Last updated: ${timestamp()}  ·  Next refresh in ${INTERVAL_S}s  ·  Type q + Enter to quit\n\n`);
}

// ── Readline for 'q' exit ─────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  if (line.trim().toLowerCase() === 'q') {
    clearInterval(timer);
    rl.close();
    process.stdout.write('\n  Studio Watch stopped.\n\n');
    process.exit(0);
  }
});
rl.on('close', () => process.exit(0));

// Ctrl+C
process.on('SIGINT', () => {
  clearInterval(timer);
  process.stdout.write('\n  Studio Watch stopped.\n\n');
  process.exit(0);
});

// ── Start ─────────────────────────────────────────────────────────────────────
tick(); // immediate first run
const timer = setInterval(tick, INTERVAL_MS);
