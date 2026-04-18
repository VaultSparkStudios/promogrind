#!/usr/bin/env node
/**
 * studio-conductor.mjs — multi-session orchestrator (S79)
 *
 * Polls every registered Studio project's .session-lock and active-session
 * beacon, aggregates into portfolio/ACTIVE_SESSIONS.json, detects cross-repo
 * conflicts, and surfaces a "what's running where" view.
 *
 * The Studio Owner runs 8–27 concurrent Claude/Codex sessions. Before S79
 * that parallelism was invisible — each session had no idea what the others
 * were doing. studio-conductor is the nervous system.
 *
 * Usage:
 *   node scripts/studio-conductor.mjs               # full refresh + write JSON
 *   node scripts/studio-conductor.mjs --refresh     # same (alias)
 *   node scripts/studio-conductor.mjs --brief       # stdout one-line status
 *   node scripts/studio-conductor.mjs --json        # stdout machine-readable
 *   node scripts/studio-conductor.mjs --conflicts   # only print conflicts
 *
 * Written to: portfolio/ACTIVE_SESSIONS.json
 * Workflow:   .github/workflows/conductor-pulse.yml (5-min cron)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readLease, leaseHealth } from './lib/session-lease.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'portfolio', 'ACTIVE_SESSIONS.json');

const args = new Set(process.argv.slice(2));
const MODE_BRIEF = args.has('--brief');
const MODE_JSON = args.has('--json');
const MODE_CONFLICTS = args.has('--conflicts');

const STALE_HOURS = 48;

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function readText(p)    { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function exists(p)      { try { return fs.statSync(p).isFile() || fs.statSync(p).isDirectory(); } catch { return false; } }

function parseLock(lockText) {
  const out = {};
  for (const line of lockText.split(/\r?\n/)) {
    const m = line.match(/^(\w[\w_-]*):\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function hoursSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

function formatDuration(hours) {
  if (hours == null) return '?';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h`;
}

// ── Load portfolio registry ─────────────────────────────────────────────────
const registry = readJson(path.join(ROOT, 'portfolio', 'PROJECT_REGISTRY.json'), { projects: [] });
const projects = Array.isArray(registry.projects) ? registry.projects : [];

// ── Poll each project ───────────────────────────────────────────────────────
const now = new Date().toISOString();
const sessions = [];
const staleLocks = [];
const unavailable = [];

for (const proj of projects) {
  const localPath = proj.localPath || null;
  const slug = proj.slug;

  // Resolve local path (handle Windows backslashes)
  const resolvedPath = localPath
    ? localPath.replace(/\\/g, '/').replace(/^[A-Z]:/i, m => m.toUpperCase())
    : null;

  if (!resolvedPath || !exists(resolvedPath)) {
    unavailable.push({ slug, reason: resolvedPath ? 'path-not-found' : 'no-local-path' });
    continue;
  }

  const lockPath = path.join(resolvedPath, 'context', '.session-lock');
  if (!exists(lockPath)) continue; // no active session — skip silently

  const lockRaw = readText(lockPath);
  const lock = parseLock(lockRaw);
  const lease = readLease(resolvedPath);
  const leaseState = leaseHealth(lease);
  const startedAt = lock.session_start || null;
  const ageHours = hoursSince(startedAt);
  // `agent` field (SESSION_PROTOCOL.md v1.0+) is the self-identified agent:
  // claude-code | codex | other. Fall back to legacy `locked_by` for older
  // locks that predate the agent field (those will show as "agent-session"
  // which is the generic marker).
  const agent = lock.agent || lock.locked_by || 'unknown';

  // Emit project-relative path only — absolute paths would leak machine-specific
  // info if ACTIVE_SESSIONS.json is consumed by public-visible surfaces.
  const relativeLocalPath = path.relative(path.dirname(ROOT), resolvedPath).replace(/\\/g, '/');

  const entry = {
    slug,
    name: proj.name || slug,
    localPath: `../${relativeLocalPath}`,
    startedAt,
    ageHours: ageHours != null ? Math.round(ageHours * 10) / 10 : null,
    ageHuman: formatDuration(ageHours),
    agent,
    stale: ageHours != null && ageHours > STALE_HOURS,
    lease: lease ? {
      leaseId: lease.leaseId,
      owner: lease.owner,
      status: lease.status,
      heartbeatAt: lease.heartbeatAt,
      expiresAt: lease.expiresAt,
      ttlMinutes: lease.ttlMinutes,
      expired: leaseState.expired,
      active: leaseState.active,
      expiresInMinutes: leaseState.expiresInMinutes,
    } : null,
    medium: proj.medium || 'unknown',
    health: proj.health || 'unknown',
  };

  sessions.push(entry);
  if (entry.stale || leaseState.expired) staleLocks.push(entry);
}

// ── Cross-repo conflict detection ───────────────────────────────────────────
// A conflict is: session A has an open diff touching repo B's path while B is locked.
// Approximation: flag any pair of active sessions whose TASK_BOARD mentions the other slug in Now/Next.
const conflicts = [];
for (const a of sessions) {
  const absPath = path.resolve(ROOT, '..', a.localPath.replace(/^\.\.\//, ''));
  const taskBoardPath = path.join(absPath, 'context', 'TASK_BOARD.md');
  const tb = readText(taskBoardPath);
  if (!tb) continue;
  const nowSection = (tb.split(/^## /m).find(s => s.startsWith('Now') || s.includes('Unified Genius List')) || '').toLowerCase();
  for (const b of sessions) {
    if (a.slug === b.slug) continue;
    const mentionsB = new RegExp(`\\b${b.slug.replace(/[-_]/g, '[-_ ]')}\\b`, 'i').test(nowSection);
    if (mentionsB) {
      conflicts.push({
        sourceSlug: a.slug,
        targetSlug: b.slug,
        kind: 'cross-repo-write-risk',
        note: `${a.slug} has Now-bucket work referencing ${b.slug} which is currently locked`,
      });
    }
  }
}

// ── Recommended next repo heuristic ─────────────────────────────────────────
// Highest momentum-runway risk (lowest runway) × not currently locked × highest priority
const locked = new Set(sessions.map(s => s.slug));
const candidates = projects
  .filter(p => p.status !== 'archived' && !locked.has(p.slug))
  .map(p => {
    const statusJsonPath = p.localPath
      ? path.join(p.localPath.replace(/\\/g, '/'), 'context', 'PROJECT_STATUS.json')
      : null;
    const ps = statusJsonPath && exists(statusJsonPath) ? readJson(statusJsonPath, {}) : {};
    const runway = ps.momentumRunway ?? null;
    const silScore = ps.silScore ?? null;
    const blockers = Array.isArray(ps.blockers) ? ps.blockers.length : 0;
    const priorityScore =
      (p.priority === 'high' ? 30 : p.priority === 'medium' ? 15 : 0) +
      (runway != null && runway <= 2 ? 30 : 0) +
      (p.health === 'red' ? 25 : p.health === 'yellow' ? 10 : 0) +
      (blockers === 0 ? 10 : 0) +
      (silScore != null && silScore < 350 ? 10 : 0);
    return { slug: p.slug, name: p.name || p.slug, runway, blockers, priorityScore, reason: null };
  })
  .sort((a, b) => b.priorityScore - a.priorityScore);

const nextRepo = candidates[0] || null;
if (nextRepo) {
  const bits = [];
  if (nextRepo.runway != null && nextRepo.runway <= 2) bits.push(`runway ${nextRepo.runway.toFixed(1)}`);
  if (nextRepo.blockers === 0) bits.push('no blockers');
  nextRepo.reason = bits.join(' · ') || 'highest priority idle';
}

// ── Portfolio aggregates ─────────────────────────────────────────────────────
const portfolio = {
  activeCount: sessions.length,
  totalProjects: projects.length,
  staleLockCount: staleLocks.length,
  conflictCount: conflicts.length,
  unavailableCount: unavailable.length,
};

// ── Assemble output ─────────────────────────────────────────────────────────
const output = {
  _schema: '1.0',
  _generatedAt: now,
  _generatedBy: 'studio-conductor.mjs',
  portfolio,
  activeSessions: sessions,
  staleLocks,
  conflicts,
  recommendedNextRepo: nextRepo,
  unavailable,
};

// ── Dispatch by mode ────────────────────────────────────────────────────────
if (MODE_JSON) {
  process.stdout.write(JSON.stringify(output, null, 2));
  process.exit(0);
}

if (MODE_BRIEF) {
  const bits = [
    `${sessions.length}/${projects.length} active`,
    staleLocks.length ? `${staleLocks.length} stale` : null,
    conflicts.length ? `${conflicts.length} conflicts` : null,
    nextRepo ? `next: ${nextRepo.slug}` : null,
  ].filter(Boolean);
  process.stdout.write(bits.join(' · ') + '\n');
  process.exit(0);
}

if (MODE_CONFLICTS) {
  if (!conflicts.length) {
    process.stdout.write('✓ No cross-repo conflicts detected.\n');
    process.exit(0);
  }
  for (const c of conflicts) {
    process.stdout.write(`⛔ ${c.sourceSlug} → ${c.targetSlug}: ${c.note}\n`);
  }
  process.exit(1);
}

// Full mode: write JSON + print summary
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');

const lines = [
  `Studio Conductor  ·  ${now}`,
  '─'.repeat(64),
  `Active sessions: ${sessions.length}/${projects.length}`,
];

if (sessions.length) {
  lines.push('');
  for (const s of sessions) {
    const marker = s.stale ? '⚠' : '🔴';
    lines.push(`  ${marker} ${s.slug.padEnd(24)} ${s.ageHuman.padStart(8)}  ${s.agent}`);
  }
}

if (staleLocks.length) {
  lines.push('');
  lines.push(`Stale locks (>${STALE_HOURS}h): ${staleLocks.length}`);
  for (const s of staleLocks) lines.push(`  ⚠ ${s.slug} — locked ${s.ageHuman} ago`);
}

if (conflicts.length) {
  lines.push('');
  lines.push(`Cross-repo conflicts: ${conflicts.length}`);
  for (const c of conflicts) lines.push(`  ⛔ ${c.sourceSlug} → ${c.targetSlug}`);
}

if (nextRepo) {
  lines.push('');
  lines.push(`Recommended next repo: ${nextRepo.slug} — ${nextRepo.reason}`);
}

lines.push('');
lines.push(`Written: portfolio/ACTIVE_SESSIONS.json`);

process.stdout.write(lines.join('\n') + '\n');
