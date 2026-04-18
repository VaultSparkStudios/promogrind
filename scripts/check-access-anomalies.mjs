#!/usr/bin/env node
/**
 * check-access-anomalies.mjs — access-log tripwire (S79)
 *
 * Scans portfolio/ACCESS_LEDGER.ndjson for anomalies. Invoked by
 * .github/workflows/access-tripwire.yml daily.
 *
 * Exit codes:
 *   0 — clean
 *   1 — anomalies found (creates GitHub issue via CI)
 *
 * Usage:
 *   node scripts/check-access-anomalies.mjs
 *   node scripts/check-access-anomalies.mjs --json
 *   node scripts/check-access-anomalies.mjs --window 168  # past week
 */

import { scanForAnomalies } from './lib/access-ledger.mjs';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const windowIdx = args.indexOf('--window');
const windowHours = windowIdx >= 0 ? parseInt(args[windowIdx + 1], 10) : 24;

const anomalies = scanForAnomalies({ windowHours });

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({ windowHours, count: anomalies.length, anomalies }, null, 2));
  process.exit(anomalies.length ? 1 : 0);
}

const banner = '╔' + '═'.repeat(66) + '╗';
process.stdout.write([banner, `║ ACCESS TRIPWIRE · window: ${windowHours}h`.padEnd(67) + '║', banner].join('\n') + '\n');

if (anomalies.length === 0) {
  process.stdout.write('✓ No anomalies detected.\n');
  process.exit(0);
}

process.stdout.write(`⚠ ${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'} detected:\n\n`);

for (const a of anomalies) {
  const sev = a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '⚪';
  process.stdout.write(`  ${sev} [${a.rule}]\n`);
  if (a.event) {
    process.stdout.write(`     ${a.event.capability}  from  ${a.event.project}  at  ${a.event.ts}\n`);
  }
  if (a.project) {
    process.stdout.write(`     ${a.capability}  from  ${a.project}  count: ${a.count}\n`);
  }
  process.stdout.write('\n');
}

process.exit(1);
