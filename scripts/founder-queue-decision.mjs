#!/usr/bin/env node

import { appendDecision } from './lib/founder-decisions.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

function valueFor(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

const signal = valueFor('--signal');
const decision = valueFor('--decision');
const note = valueFor('--note') || null;

if (!signal || !decision) {
  console.error('Usage: node scripts/founder-queue-decision.mjs --signal "<signal>" --decision yes|no|defer|more-info [--note "..."]');
  process.exit(1);
}

const normalizedDecision = decision.toLowerCase();
if (!['yes', 'no', 'defer', 'more-info'].includes(normalizedDecision)) {
  console.error('Decision must be one of: yes, no, defer, more-info');
  process.exit(1);
}

const entry = {
  ts: new Date().toISOString(),
  signal: signal.trim(),
  decision: normalizedDecision,
  note,
};

appendDecision(entry);

if (jsonMode) {
  console.log(JSON.stringify(entry, null, 2));
} else {
  console.log(`✓ Founder decision recorded: ${normalizedDecision.toUpperCase()} — ${signal}`);
}
