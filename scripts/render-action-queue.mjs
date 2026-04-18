#!/usr/bin/env node
/**
 * render-action-queue.mjs
 *
 * Turns Studio Ops from a reporting system into an execution system.
 * Aggregates:
 * - top unblocked local work from the Unified Genius List
 * - human-action items that should be attempted by the agent first
 * - advisory doctor drift that should inform planning but not block local work
 *
 * Output:
 * - context/ACTION_QUEUE.md
 * - --json for tooling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveCapability } from './lib/secrets.mjs';
import { classifyBlocker } from './lib/blocker-rules.mjs';
import { parseHumanItems, parseUnifiedItems } from './lib/task-board.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TASK_BOARD = path.join(ROOT, 'context', 'TASK_BOARD.md');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');
const OUT = path.join(ROOT, 'context', 'ACTION_QUEUE.md');
const AUTOMATION_QUEUE = path.join(ROOT, 'portfolio', 'AUTOMATION_QUEUE.json');
const jsonMode = process.argv.includes('--json');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

const board = readText(TASK_BOARD);
const status = readJson(STATUS, {});
const unified = parseUnifiedItems(board);
const humanItems = parseHumanItems(board);
const automationQueue = readJson(AUTOMATION_QUEUE, { items: [] });
const ACTIONABLE_STATUSES = new Set(['unblocked', 'now']);

const executeNow = unified
  .filter((item) => ACTIONABLE_STATUSES.has(String(item.status || '').toLowerCase()))
  .slice(0, 5);

const approvedAutomation = (automationQueue.items || [])
  .filter((item) => item.automationStatus === 'ready-to-run')
  .slice(0, 5);

const attemptFirst = humanItems.map((item) => {
  const info = classifyBlocker(`${item.title} ${item.description}`);
  const capabilityStatus = info.capabilities.map((capability) => ({
    capability,
    ...resolveCapability(capability),
  }));
  return {
    ...item,
    category: info.category,
    attemptable: info.attemptable,
    elevatedProbe: info.elevatedProbe,
    probeCommands: info.probeCommands,
    capabilityStatus,
  };
});

const advisoryDrift = (status.doctorScore?.checks || [])
  .filter((check) => check.pass === false && check.blocking === false)
  .map((check) => ({
    id: check.id,
    driftClass: check.driftClass,
  }));

const payload = {
  generatedAt: new Date().toISOString().slice(0, 10),
  executeNow,
  approvedAutomation,
  attemptFirst,
  advisoryDrift,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  `<!-- generated-by: scripts/render-action-queue.mjs -->`,
  `<!-- generated-at: ${payload.generatedAt} -->`,
  '',
  '# Action Queue',
  '',
  '> Execution-first queue for this repo. Read this after the startup brief when you need the next concrete move.',
  '',
  `## Execute Now (${executeNow.length})`,
  '',
];

if (executeNow.length === 0) {
  lines.push('- No unblocked local items found.');
} else {
  for (const item of executeNow) {
    lines.push(`- **${item.rank} · ${item.category} · ${item.effort}** — ${item.item}`);
  }
}

lines.push('', `## Approved Automation (${approvedAutomation.length})`, '');

if (approvedAutomation.length === 0) {
  lines.push('- No founder-approved automation items ready to run.');
} else {
  for (const item of approvedAutomation) {
    const probes = (item.probeCommands || []).join('  ·  ');
    lines.push(`- **${item.signal}** — ${item.source} · ${item.category}`);
    if (probes) lines.push(`  - Probe commands: ${probes}`);
    if (item.action) lines.push(`  - Action: ${item.action}`);
  }
}

lines.push('', `## Try Before Escalating (${attemptFirst.length})`, '');

if (attemptFirst.length === 0) {
  lines.push('- No open Human Action Required items.');
} else {
  for (const item of attemptFirst) {
    const caps = item.capabilityStatus.length > 0
      ? item.capabilityStatus.map((entry) => `${entry.capability}=${entry.ok ? 'READY' : 'MISSING'}`).join(' · ')
      : 'none mapped';
    lines.push(`- **${item.title}** — ${item.attemptable ? 'agent should attempt first' : 'likely true human-only'}`);
    lines.push(`  - Capability state: ${caps}`);
    lines.push(`  - Elevated/admin probe: ${item.elevatedProbe}`);
    if (item.probeCommands.length > 0) {
      lines.push(`  - Probe commands: ${item.probeCommands.join('  ·  ')}`);
    }
  }
}

lines.push('', `## Advisory Drift (${advisoryDrift.length})`, '');

if (advisoryDrift.length === 0) {
  lines.push('- No advisory doctor drift currently recorded.');
} else {
  for (const drift of advisoryDrift) {
    lines.push(`- **${drift.id}** — ${drift.driftClass}`);
  }
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`✓ Action Queue → context/ACTION_QUEUE.md  (${executeNow.length} execute-now · ${attemptFirst.length} blocker items)`);
