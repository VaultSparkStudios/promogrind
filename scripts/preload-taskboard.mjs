#!/usr/bin/env node
/**
 * preload-taskboard.mjs
 * Reads context/LATEST_HANDOFF.md + context/TASK_BOARD.md and prints a
 * prioritised Now-bucket pre-load: open SIL commitments, handoff priorities,
 * and any escalated items that need surfacing at session start.
 *
 * Usage:
 *   node scripts/preload-taskboard.mjs
 *
 * Output is informational — does not modify any files.
 */

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function readFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

const handoff = readFile('context/LATEST_HANDOFF.md');
const taskBoard = readFile('context/TASK_BOARD.md');

// ── Extract open Now-bucket items from TASK_BOARD.md ──────────────────────
function extractNowItems(board) {
  const nowMatch = board.match(/## Now\s+([\s\S]*?)(?=\n## |\n---\s*\n## |$)/);
  if (!nowMatch) return [];
  return nowMatch[1]
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\[[ ]\]/.test(line))  // unchecked items only
    .map((line) => line.replace(/^\s*-\s+\[[ ]\]\s*\*?\*?/, '').replace(/\*\*.*/, '').trim())
    .filter(Boolean);
}

// ── Extract SIL-tagged open items ─────────────────────────────────────────
function extractSilItems(board) {
  return board
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\[[ ]\].*\[SIL\]/.test(line))
    .map((line) => line.replace(/^\s*-\s+\[[ ]\]\s*/, '').trim())
    .filter(Boolean);
}

// ── Extract recommended actions from LATEST_HANDOFF.md ───────────────────
function extractHandoffActions(handoff) {
  const match = handoff.match(/## Recommended first action next session[^#]*?(?:\n([\s\S]*?))?(?=\n## |\n---|\n#[^#]|$)/);
  if (!match) return [];
  const block = match[0];
  return block
    .split(/\r?\n/)
    .filter((line) => /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

// ── Extract open blockers from LATEST_HANDOFF.md ─────────────────────────
function extractHandoffBlockers(handoff) {
  const match = handoff.match(/## Open blockers.*?\n([\s\S]*?)(?=\n## |$)/);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\[[ ]\]/.test(line))
    .map((line) => line.replace(/^\s*-\s+\[[ ]\]\s*\*?\*?/, '').replace(/\*\*.*/, '').trim())
    .filter(Boolean);
}

// ── Detect escalated SIL items (pattern: added session N, still open) ────
function detectEscalated(silItems) {
  // Heuristic: items with "(NEW S" suffix more than 3 sessions ago would need
  // cross-session tracking. Here we flag items that include the LOW RUNWAY
  // note or any explicit escalation tag.
  return silItems.filter((item) =>
    /LOW RUNWAY|escalat|ESCALATE|pre-load required/i.test(item)
  );
}

const nowItems = extractNowItems(taskBoard);
const silItems = extractSilItems(taskBoard);
const handoffActions = extractHandoffActions(handoff);
const openBlockers = extractHandoffBlockers(handoff);
const escalated = detectEscalated(nowItems.concat(silItems));

// ── Output ─────────────────────────────────────────────────────────────────
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TASK BOARD PRE-LOAD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (handoffActions.length > 0) {
  console.log('▶ HANDOFF PRIORITIES (recommended first actions):');
  handoffActions.forEach((action, i) => console.log(`  ${i + 1}. ${action}`));
  console.log('');
}

if (escalated.length > 0) {
  console.log('⛔ ESCALATED ITEMS (low runway / explicitly flagged):');
  escalated.forEach((item) => console.log(`  • ${item}`));
  console.log('');
}

if (silItems.length > 0) {
  console.log(`⚠ OPEN [SIL] COMMITMENTS (${silItems.length} total):`);
  silItems.forEach((item) => console.log(`  • ${item}`));
  console.log('');
}

if (nowItems.length > 0) {
  console.log(`▸ NOW BUCKET — open items (${nowItems.length} total):`);
  nowItems.slice(0, 8).forEach((item) => console.log(`  - ${item}`));
  if (nowItems.length > 8) console.log(`  ... and ${nowItems.length - 8} more`);
  console.log('');
}

if (openBlockers.length > 0) {
  console.log('🔒 OPEN BLOCKERS (carry-forward from last session):');
  openBlockers.forEach((b) => console.log(`  • ${b}`));
  console.log('');
}

if (nowItems.length === 0 && silItems.length === 0 && handoffActions.length === 0) {
  console.log('  Nothing queued — task board is clear.');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
