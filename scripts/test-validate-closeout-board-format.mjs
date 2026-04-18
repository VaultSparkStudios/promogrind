#!/usr/bin/env node

import assert from 'assert/strict';
import { validateCloseoutBoard } from './validate-closeout-board-format.mjs';

const JSON_MODE = process.argv.includes('--json');

const canonicalBoard = `
╔════════════════════════════════════════════════════════════════╗
║  SESSION CLOSEOUT                                             ║
╚════════════════════════════════════════════════════════════════╝

╔══ WHAT SHIPPED ════════════════════════════════════════════════╗
║  ✓ Example shipped item                                        ║
╚════════════════════════════════════════════════════════════════╝

╔══ SCORES ══════════════════════════════════════════════════════╗
║  495/500                                                       ║
╚════════════════════════════════════════════════════════════════╝

╔══ WRITE-BACK STATUS ═══════════════════════════════════════════╗
║  ✓ CURRENT_STATE · TASK_BOARD · LATEST_HANDOFF                 ║
╚════════════════════════════════════════════════════════════════╝

╔══ GIT STATUS ══════════════════════════════════════════════════╗
║  modified: scripts/example.mjs                                 ║
╚════════════════════════════════════════════════════════════════╝

╔══ POST-SESSION SIGNALS ════════════════════════════════════════╗
║  ✓ entropy healthy                                             ║
╚════════════════════════════════════════════════════════════════╝

╔══ NEXT SESSION ════════════════════════════════════════════════╗
║  1. Finish the next repo tranche                               ║
╚════════════════════════════════════════════════════════════════╝
`.trim();
const driftBoard = `
Session closeout

What shipped
- one thing

Scores
- fine
`.trim();

const canonical = validateCloseoutBoard(canonicalBoard);
assert.equal(canonical.ok, true, 'canonical closeout prompt should pass');

const drift = validateCloseoutBoard(driftBoard);
assert.equal(drift.ok, false, 'prose drift stub should fail');
assert.ok(Array.isArray(drift.missingRequired) && drift.missingRequired.length >= 3, 'drift should miss required blocks');
assert.ok(drift.bodyShape, 'drift should fail box-board body-shape check');

const result = {
  ok: true,
  checks: 4,
  cases: [
    'canonical prompt passes',
    'prose drift fails',
    'missing required blocks detected',
    'box-board shape enforced',
  ],
};

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  console.log(`test-validate-closeout-board-format · ${result.checks}/${result.checks} passing`);
}
