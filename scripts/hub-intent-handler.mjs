#!/usr/bin/env node
// hub-intent-handler.mjs — Reverse-signal Hub→Repo intent receiver.
//
// The Studio Hub UI dispatches "intents" (pause, reprioritize, redirect,
// close-blocker, pin-task, retire) back to repos via a GitHub Action.
// This handler applies intents to context/TASK_BOARD.md + PROJECT_STATUS.json.
//
// Invoked by:
//   - .github/workflows/hub-intent-receiver.yml (repository_dispatch)
//   - direct CLI: node scripts/hub-intent-handler.mjs --file=intent.json
//
// Intent schema: see docs/HUB_INTENT_SCHEMA.md
//
// Use:
//   node scripts/hub-intent-handler.mjs --file=./intent.json
//   node scripts/hub-intent-handler.mjs --json='{"kind":"pause","reason":"..."}'
//   cat intent.json | node scripts/hub-intent-handler.mjs --stdin

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const eq = a.indexOf('=');
    return eq > 0 ? [a.slice(0, eq).replace(/^--/, ''), a.slice(eq + 1)] : [a.replace(/^--/, ''), true];
  }),
);

let payload;
if (args.file) payload = JSON.parse(fs.readFileSync(args.file, 'utf8'));
else if (args.json) payload = JSON.parse(args.json);
else if (args.stdin) payload = JSON.parse(fs.readFileSync(0, 'utf8'));
else {
  console.error('hub-intent-handler: --file=, --json=, or --stdin required');
  process.exit(2);
}

const { kind, reason, slug, item, priority, signedBy, issuedAt } = payload;
const VALID = new Set(['pause', 'resume', 'reprioritize', 'redirect', 'close-blocker', 'pin-task', 'retire', 'add-task']);
if (!VALID.has(kind)) {
  console.error(`hub-intent-handler: unknown intent kind "${kind}"`);
  process.exit(2);
}

function patchJson(relPath, mutator) {
  const p = path.join(ROOT, relPath);
  if (!fs.existsSync(p)) return;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  mutator(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}

function appendTaskBoard(section, line) {
  const p = path.join(ROOT, 'context/TASK_BOARD.md');
  let tb = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '# Task Board\n\n## Now\n\n## Next\n\n## Blocked\n\n## Later\n';
  const header = `## ${section}`;
  const idx = tb.indexOf(header);
  if (idx < 0) {
    tb += `\n\n${header}\n\n- ${line}\n`;
  } else {
    const nextHeaderOffset = tb.indexOf('\n## ', idx + header.length);
    const insertAt = nextHeaderOffset < 0 ? tb.length : nextHeaderOffset;
    tb = tb.slice(0, insertAt).replace(/\n+$/, '') + `\n- ${line}\n` + tb.slice(insertAt);
  }
  fs.writeFileSync(p, tb);
}

const timestamp = issuedAt || new Date().toISOString();
const attribution = signedBy ? ` _(via Hub by ${signedBy} @ ${timestamp})_` : ` _(via Hub @ ${timestamp})_`;

switch (kind) {
  case 'pause':
    patchJson('context/PROJECT_STATUS.json', (j) => {
      j.status = 'paused';
      j.pausedReason = reason || 'paused via Hub intent';
      j.lastUpdated = timestamp;
    });
    appendTaskBoard('Blocked', `[HUB-INTENT] Paused by Hub — ${reason || 'no reason given'}${attribution}`);
    break;
  case 'resume':
    patchJson('context/PROJECT_STATUS.json', (j) => {
      j.status = j.status === 'paused' ? 'active' : j.status;
      delete j.pausedReason;
      j.lastUpdated = timestamp;
    });
    appendTaskBoard('Now', `[HUB-INTENT] Resumed by Hub${attribution}`);
    break;
  case 'reprioritize':
    appendTaskBoard('Now', `[HUB-INTENT] Reprioritized: ${item || reason}${attribution}`);
    break;
  case 'redirect':
    appendTaskBoard('Now', `[HUB-INTENT] Redirect focus → ${reason}${attribution}`);
    patchJson('context/PROJECT_STATUS.json', (j) => {
      j.currentFocus = reason || j.currentFocus;
      j.lastUpdated = timestamp;
    });
    break;
  case 'close-blocker':
    appendTaskBoard('Next', `[HUB-INTENT] Blocker resolved: ${item}${attribution}`);
    break;
  case 'pin-task':
    appendTaskBoard('Now', `[HUB-INTENT][PINNED] ${item}${attribution}`);
    break;
  case 'retire':
    patchJson('context/PROJECT_STATUS.json', (j) => {
      j.status = 'archived';
      j.vaultStatus = 'VAULTED';
      j.lastUpdated = timestamp;
    });
    break;
  case 'add-task':
    appendTaskBoard(priority === 'now' ? 'Now' : 'Next', `[HUB-INTENT] ${item}${attribution}`);
    break;
}

// Log the intent
const logPath = path.join(ROOT, 'logs/HUB_INTENTS.jsonl');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.appendFileSync(logPath, JSON.stringify({ ...payload, appliedAt: new Date().toISOString() }) + '\n');

console.log(`hub-intent-handler: applied ${kind}${item ? ' (' + item + ')' : ''}`);
