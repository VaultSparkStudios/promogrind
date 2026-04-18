#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : fallback;
}

const event = {
  type: getArg('--type', 'generic'),
  slug: getArg('--slug', 'studio-ops'),
  source: getArg('--source', 'manual'),
  signal: getArg('--signal', ''),
  action: getArg('--action', ''),
  severity: getArg('--severity', 'low'),
  automationStatus: getArg('--status', 'recorded'),
  attemptable: getArg('--attemptable', 'true') !== 'false',
  requiresFounderDecision: getArg('--requires-founder', 'false') === 'true',
  note: getArg('--note', '')
};

const payload = appendEvent(ROOT, event);
console.log(JSON.stringify(payload, null, 2));
