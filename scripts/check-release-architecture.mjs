#!/usr/bin/env node
/**
 * Public-safe CANON-007/CANON-045 release architecture checker.
 *
 * Examples:
 *   node scripts/check-release-architecture.mjs --json
 *   node scripts/check-release-architecture.mjs --project promogrind --canon 045 --json
 */
import { evaluateReleaseArchitecture, readProjectStatus } from './lib/release-architecture.mjs';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/check-release-architecture.mjs [--project <slug>] [--canon 007|045] [--json]');
  console.log('Example: node scripts/check-release-architecture.mjs --project promogrind --canon 045 --json');
  process.exit(0);
}

const expectedSlug = value('--project');
const canon = value('--canon');
let status;
try {
  status = readProjectStatus(process.cwd());
} catch (error) {
  const output = { schemaVersion: 1, pass: false, error: `PROJECT_STATUS unreadable: ${error.message}` };
  console.log(JSON.stringify(output, null, 2));
  process.exit(2);
}

const result = evaluateReleaseArchitecture(status, { canon });
if (expectedSlug && status.slug !== expectedSlug) {
  result.pass = false;
  result.releaseReady = false;
  result.gaps.unshift(`project slug mismatch: expected ${expectedSlug}, found ${status.slug || 'missing'}`);
}
result.slug = status.slug || null;

if (args.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`${result.pass ? '✓' : '⛔'} release architecture · ${result.posture} · canon ${result.canon}`);
  for (const gap of result.gaps) console.log(`  · ${gap}`);
}
process.exit(result.pass ? 0 : 2);

