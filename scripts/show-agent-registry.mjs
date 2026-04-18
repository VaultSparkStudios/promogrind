#!/usr/bin/env node
/**
 * show-agent-registry.mjs
 *
 * Displays the current AGENT_REGISTRY.json — active concurrent Claude Code
 * sessions across all studio projects. Used to prevent cross-repo collisions
 * when running 8-12 simultaneous agents.
 *
 * Usage:
 *   node scripts/show-agent-registry.mjs
 *   node scripts/ops.mjs agent-status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'context', 'AGENT_REGISTRY.json');
const today = new Date().toISOString();

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }

const registry = readJson(REGISTRY_PATH, { activeSessions: [] });
const sessions = registry.activeSessions ?? [];

const W = 66;
function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }

console.log(`\n╔${'═'.repeat(W)}╗`);
console.log(`║  ${pad('AGENT REGISTRY  ·  Active Concurrent Sessions', W - 2)}  ║`);
console.log(`╠${'═'.repeat(W)}╣`);

if (sessions.length === 0) {
  console.log(`║  ${pad('✓  No active sessions registered', W - 2)}  ║`);
} else {
  for (const s of sessions) {
    const age = s.since ? Math.round((Date.now() - new Date(s.since)) / 60000) : '?';
    const line = `  ${s.project ?? '?'}  →  ${s.task ?? 'unknown task'}  [${s.model ?? 'sonnet'}]  ${age}m ago`;
    console.log(`║  ${pad(line, W - 2)}  ║`);
  }
}

console.log(`╠${'═'.repeat(W)}╣`);
console.log(`║  ${pad(`${sessions.length} active · last updated: ${registry._updated ?? 'never'}`, W - 2)}  ║`);
console.log(`╚${'═'.repeat(W)}╝\n`);

if (sessions.length > 0) {
  console.log('Note: If a session is stale (>2h), the lock file may need manual clearing.');
  console.log('      Lock file: context/.session-lock  ·  Registry: context/AGENT_REGISTRY.json\n');
}
