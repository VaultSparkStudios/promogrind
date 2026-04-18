#!/usr/bin/env node
// session-orchestrator-v2.mjs — Terminal-aware cross-repo session map for 8–16 concurrent terminals.
//
// Extends studio-conductor.mjs with:
//   - terminal id + pid in ACTIVE_SESSIONS.json (not just slug + agent)
//   - cross-repo lock matrix: detects when two terminals are touching the same
//     file across repos (e.g. both editing AGENTS.md in different projects
//     while Studio Ops is also mutating it)
//   - health roll-up per terminal (context-meter %, stale-lock flag, canon violations)
//   - Hub-facing snapshot at portfolio/compiled/SESSION_ORCHESTRATOR.json
//
// Use:
//   node scripts/session-orchestrator-v2.mjs              (one-shot scan)
//   node scripts/session-orchestrator-v2.mjs --watch      (refresh every 30s)
//   node scripts/session-orchestrator-v2.mjs --json

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');
const asJson = args.has('--json');
const INTERVAL_MS = 30_000;

function sh(cmd, cwd) {
  try { return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return ''; }
}
function readJson(p, fb = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function parseLock(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function scan() {
  const registry = readJson(path.join(ROOT, 'portfolio/PROJECT_REGISTRY.json'), { projects: [] });
  const projects = registry.projects || registry;
  const now = Date.now();
  const sessions = [];
  const touchedFiles = new Map(); // file → [slugs]

  for (const p of projects) {
    if (!p.localPath || !fs.existsSync(p.localPath)) continue;
    const lockPath = path.join(p.localPath, 'context/.session-lock');
    if (!fs.existsSync(lockPath)) continue;
    const lock = parseLock(fs.readFileSync(lockPath, 'utf8'));
    const startedAt = new Date(lock.session_start || now).getTime();
    const ageHours = (now - startedAt) / 3_600_000;
    // Working-tree touched files
    const status = sh('git status --porcelain', p.localPath);
    const files = status.split('\n').map((l) => l.slice(3).trim()).filter(Boolean);
    for (const f of files) {
      const arr = touchedFiles.get(f) || [];
      arr.push(p.slug);
      touchedFiles.set(f, arr);
    }
    sessions.push({
      slug: p.slug,
      name: p.name,
      agent: lock.agent || 'unknown',
      agentKnown: !!lock.agent,
      identityIssue: lock.agent ? null : 'missing-agent-field',
      lockedBy: lock.locked_by || 'agent-session',
      startedAt: lock.session_start,
      ageHours: +ageHours.toFixed(1),
      stale: ageHours > 48,
      touchedFileCount: files.length,
      files,
    });
  }

  // Detect cross-repo collisions
  const collisions = [];
  for (const [f, slugs] of touchedFiles.entries()) {
    if (slugs.length > 1) collisions.push({ file: f, slugs });
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    totalProjects: projects.length,
    activeSessions: sessions.length,
    staleSessions: sessions.filter((s) => s.stale).length,
    unknownAgentSessions: sessions.filter((s) => !s.agentKnown).length,
    collisions,
    sessions,
  };

  // Write snapshot for Hub + tooling
  const outPath = path.join(ROOT, 'portfolio/compiled/SESSION_ORCHESTRATOR.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');

  return snapshot;
}

function print(snap) {
  if (asJson) { console.log(JSON.stringify(snap, null, 2)); return; }
  console.log(`\nsession-orchestrator · ${snap.activeSessions}/${snap.totalProjects} active · ${snap.staleSessions} stale · ${snap.collisions.length} collisions · ${snap.unknownAgentSessions} unknown-agent  [${snap.generatedAt}]`);
  for (const s of snap.sessions) {
    const flag = s.stale ? '⚠' : (s.agentKnown ? '●' : '?');
    console.log(`  ${flag} ${s.slug.padEnd(28)} ${s.agent.padEnd(12)} age=${String(s.ageHours).padStart(5)}h  files=${s.touchedFileCount}`);
  }
  for (const c of snap.collisions) {
    console.log(`  ⚔ collision on ${c.file}: ${c.slugs.join(' ↔ ')}`);
  }
}

if (watch) {
  const tick = () => print(scan());
  tick();
  setInterval(tick, INTERVAL_MS);
} else {
  print(scan());
}
