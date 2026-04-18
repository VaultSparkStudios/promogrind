/**
 * agent-state.mjs — Hot-swap-safe shared state between Claude Code + Codex.
 *
 * Both agents read/write `context/AGENT_STATE.json` so switching mid-session
 * (Claude → Codex or vice versa) doesn't lose in-flight context. Schema is
 * agent-neutral — no Claude-specific or Codex-specific fields at the top level.
 *
 * Schema (v1.0):
 *   {
 *     schemaVersion: "1.0",
 *     lastAgent: "claude-code" | "codex" | "other",
 *     lastUpdated: ISO-8601 UTC,
 *     sessionId: short hash (first 8 chars of session_start),
 *     inFlight: {
 *       command: string | null,          // last slash/natural-language command invoked
 *       skill: string | null,            // matched skill name (router resolution)
 *       startedAt: ISO-8601 UTC | null,
 *       status: "running" | "completed" | "deferred" | "failed" | null,
 *       note: string | null,             // free-form last-action summary
 *     },
 *     geniusList: {
 *       lastRefreshedAt: ISO-8601 UTC | null,
 *       shippedThisSession: string[],    // titles of items marked done this session
 *       deferredThisSession: string[],   // titles + reason "title — reason"
 *     },
 *     handoffNote: string | null,        // one-line "if another agent picks up now, read X"
 *   }
 *
 * Usage:
 *   import { readAgentState, updateAgentState, markInFlight, markComplete } from './lib/agent-state.mjs';
 *
 *   const st = readAgentState(repoRoot);
 *   markInFlight(repoRoot, { command: '/go', skill: 'go', note: 'executing genius list' });
 *   // ... work ...
 *   markComplete(repoRoot, { status: 'completed', note: '4 items shipped' });
 *
 * File never contains secrets. Safe to commit. In fact, committing it is the
 * whole point — the next agent-session in any cli reads it to resume.
 */

import fs from 'fs';
import path from 'path';

const SCHEMA_VERSION = '1.0';
const FILE_NAME = path.join('context', 'AGENT_STATE.json');

function emptyState(agent) {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastAgent: agent ?? null,
    lastUpdated: new Date().toISOString(),
    sessionId: null,
    inFlight: {
      command: null,
      skill: null,
      startedAt: null,
      status: null,
      note: null,
    },
    geniusList: {
      lastRefreshedAt: null,
      shippedThisSession: [],
      deferredThisSession: [],
    },
    handoffNote: null,
  };
}

function statePath(repoRoot) {
  return path.join(repoRoot, FILE_NAME);
}

export function readAgentState(repoRoot) {
  const p = statePath(repoRoot);
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.schemaVersion) parsed.schemaVersion = SCHEMA_VERSION;
    return parsed;
  } catch {
    return emptyState(null);
  }
}

export function writeAgentState(repoRoot, state) {
  const p = statePath(repoRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  state.schemaVersion = SCHEMA_VERSION;
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(state, null, 2) + '\n');
}

export function updateAgentState(repoRoot, patch) {
  const current = readAgentState(repoRoot);
  const merged = {
    ...current,
    ...patch,
    inFlight: { ...current.inFlight, ...(patch.inFlight ?? {}) },
    geniusList: { ...current.geniusList, ...(patch.geniusList ?? {}) },
    schemaVersion: SCHEMA_VERSION,
  };
  writeAgentState(repoRoot, merged);
  return merged;
}

/**
 * Mark an in-flight command. Call when an agent starts a command.
 * @param {string} repoRoot
 * @param {{ agent?: string, command: string, skill?: string, sessionId?: string, note?: string }} info
 */
export function markInFlight(repoRoot, info) {
  return updateAgentState(repoRoot, {
    lastAgent: info.agent ?? readAgentState(repoRoot).lastAgent,
    sessionId: info.sessionId ?? readAgentState(repoRoot).sessionId,
    inFlight: {
      command: info.command,
      skill: info.skill ?? null,
      startedAt: new Date().toISOString(),
      status: 'running',
      note: info.note ?? null,
    },
  });
}

/**
 * Mark the in-flight command as completed / deferred / failed.
 * @param {string} repoRoot
 * @param {{ status: 'completed'|'deferred'|'failed', note?: string, handoffNote?: string }} info
 */
export function markComplete(repoRoot, info) {
  const patch = {
    inFlight: {
      status: info.status,
      note: info.note ?? null,
    },
  };
  if (info.handoffNote !== undefined) patch.handoffNote = info.handoffNote;
  return updateAgentState(repoRoot, patch);
}

/**
 * Record a genius-list item outcome. Append to shippedThisSession / deferredThisSession.
 * @param {string} repoRoot
 * @param {{ kind: 'shipped'|'deferred', title: string, reason?: string }} info
 */
export function recordGeniusOutcome(repoRoot, info) {
  const current = readAgentState(repoRoot);
  const entry = info.kind === 'deferred' && info.reason
    ? `${info.title} — ${info.reason}`
    : info.title;
  const key = info.kind === 'shipped' ? 'shippedThisSession' : 'deferredThisSession';
  const list = Array.from(new Set([...(current.geniusList[key] ?? []), entry]));
  return updateAgentState(repoRoot, {
    geniusList: { ...current.geniusList, [key]: list },
  });
}

/**
 * Record that the genius list was refreshed.
 */
export function recordGeniusRefresh(repoRoot) {
  return updateAgentState(repoRoot, {
    geniusList: { lastRefreshedAt: new Date().toISOString() },
  });
}

/**
 * Reset the per-session fields (called at /closeout after successful write-back).
 * Preserves handoffNote + lastAgent — those carry across sessions.
 */
export function resetSessionFields(repoRoot) {
  const current = readAgentState(repoRoot);
  return updateAgentState(repoRoot, {
    sessionId: null,
    inFlight: { command: null, skill: null, startedAt: null, status: null, note: null },
    geniusList: {
      ...current.geniusList,
      shippedThisSession: [],
      deferredThisSession: [],
    },
  });
}

export default {
  readAgentState,
  writeAgentState,
  updateAgentState,
  markInFlight,
  markComplete,
  recordGeniusOutcome,
  recordGeniusRefresh,
  resetSessionFields,
};
