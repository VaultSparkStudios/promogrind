import fs from 'fs';
import path from 'path';
import { spawnSync } from './safe-spawn.mjs';
import { loadPortfolioTaskBoards } from './cross-repo-tasks.mjs';
import { ensureAges, daysSince } from './human-action-ages.mjs';

const W = 62;

function pad(s, w) { const str = String(s ?? ''); return str.length >= w ? str.slice(0, w) : str + ' '.repeat(w - str.length); }
function row(content) { return `║  ${pad(content, W)}  ║`; }
function blank() { return `║  ${' '.repeat(W)}  ║`; }
function top(title) {
  const t = title ? `══ ${title} ` : '';
  return '╔' + t + '═'.repeat(Math.max(1, W + 2 - t.length)) + '╗';
}
function bot() { return '╚' + '═'.repeat(W + 2) + '╝'; }

function readText(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function readJson(filePath, fallback = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

export function renderPortfolioTaskBoardsBlock(portfolioTasks) {
  if (!portfolioTasks?.byProject?.length) return null;
  const t = portfolioTasks.totals || {};
  const out = [top('PORTFOLIO TASK BOARDS')];
  out.push(row(`Total: ${t.remaining ?? 0} open · ${t.unblocked ?? 0} unblocked · ${t.blocked ?? 0} blocked`));
  out.push(row(`Crit ${t.critical ?? 0} · High ${t.high ?? 0} · ${portfolioTasks.projectsWithWork ?? 0}/${portfolioTasks.projectsScanned ?? 0} repos active`));
  out.push(blank());

  const allActive = portfolioTasks.byProject.filter(p => p.present && p.remaining > 0);
  const active = allActive.slice(0, 1);
  for (const p of active) {
    const marker = p.isCurrent ? '>' : ' ';
    const nm = (p.name || p.slug || '').slice(0, 24).padEnd(24);
    const line = `${marker} ${nm} ${String(p.remaining).padStart(3)} open · ${String(p.unblocked).padStart(2)} unblk · C${String(p.critical).padStart(2)} H${String(p.high).padStart(2)}`;
    out.push(row(line.slice(0, W)));
  }
  const hidden = allActive.length - active.length;
  if (hidden > 0) out.push(row(`  … +${hidden} more — run: node scripts/lib/cross-repo-tasks.mjs`));
  out.push(bot());
  return out.join('\n');
}

export function loadPortfolioTaskBoardBlock({ root }) {
  try {
    return renderPortfolioTaskBoardsBlock(loadPortfolioTaskBoards({ studioRoot: root, currentRepoPath: root }));
  } catch {
    return null;
  }
}

export function renderOrchestratorBlock({
  root,
  node = process.execPath,
  active = readJson(path.join(root, 'portfolio', 'ACTIVE_SESSIONS.json'), null),
  pending = readJson(path.join(root, 'portfolio', 'PENDING_PROPAGATION.json'), null),
  now = Date.now(),
  runDetector = null,
} = {}) {
  const activeSessions = Array.isArray(active?.activeSessions) ? active.activeSessions : [];
  const staleLocks = Array.isArray(active?.staleLocks) ? active.staleLocks : [];
  const conflicts = Array.isArray(active?.conflicts) ? active.conflicts : [];
  const generatedAt = active?._generatedAt ? new Date(active._generatedAt).getTime() : null;
  const snapshotAgeMin = generatedAt ? Math.max(0, Math.round((now - generatedAt) / 60000)) : null;
  const snapshotLabel = snapshotAgeMin == null
    ? 'snapshot unknown'
    : snapshotAgeMin < 60
      ? `${snapshotAgeMin}m old`
      : `${Math.round(snapshotAgeMin / 60)}h old`;

  const pendingItems = (() => {
    if (!pending) return [];
    const raw = Array.isArray(pending) ? pending : (pending.pending || pending.queue || Object.values(pending));
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  })();
  const locked = new Set(activeSessions.map(s => s.slug));
  const lockedPending = pendingItems.filter(item => locked.has(item.slug)).length;

  const activeAvailable = Boolean(active && Array.isArray(active.activeSessions));
  const pendingAvailable = Boolean(pending);
  const ark = loadArkDrainState({ root, now });
  const untracked = loadUntrackedDevFolders({ root, node, runDetector });
  const projectLike = untracked?.categories?.projectLike?.length ?? 0;
  const scratch = untracked?.categories?.scratch?.length ?? 0;

  const out = [top('ORCHESTRATOR')];
  out.push(row(activeAvailable
    ? `Workers: ${activeSessions.length}/${active?.portfolio?.totalProjects ?? '?'} active · ${staleLocks.length} stale · ${conflicts.length} conflicts`
    : 'Workers: unavailable · public-repo shim has no portfolio snapshot'));
  out.push(row(activeAvailable
    ? `Snapshot: ${snapshotLabel} · next ${active?.recommendedNextRepo?.slug || 'n/a'}`.slice(0, W)
    : 'Snapshot: unavailable · portfolio/ACTIVE_SESSIONS.json absent'));
  out.push(row(pendingAvailable
    ? `Propagation: ${pendingItems.length} queued · ${lockedPending} lock-blocked`
    : 'Propagation: unavailable · portfolio queue absent'));
  out.push(row(ark.available
    ? `Ark: ${ark.count} drained · ${ark.ageLabel} · sig failures ${ark.sigFailures}`
    : 'Ark: unavailable · no local drain receipt'));
  out.push(row(untracked
    ? `Untracked: ${projectLike} project-like · ${scratch} scratch`
    : 'Untracked: unavailable · detector absent'));
  out.push(bot());
  return out.join('\n');
}

export function loadArkDrainState({ root, now = Date.now() }) {
  const summary = readJson(path.join(root, '.cache', 'ark-drain-summary.json'), null);
  const drainedAt = summary?.drainedAt ? new Date(summary.drainedAt).getTime() : NaN;
  if (!summary || !Number.isFinite(drainedAt)) return { available: false };
  const ageMinutes = Math.max(0, Math.round((now - drainedAt) / 60000));
  return {
    available: true,
    count: Number(summary.count) || 0,
    sigFailures: Array.isArray(summary.sigFailures) ? summary.sigFailures.length : 0,
    ageMinutes,
    ageLabel: ageMinutes < 60 ? `${ageMinutes}m old` : `${Math.round(ageMinutes / 60)}h old`,
  };
}

function countRecentArkCargo({ root, now }) {
  const cutoff = now - 24 * 3600 * 1000;
  const dir = path.join(root, 'portfolio', 'ark', 'log');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.ndjson'))
      .flatMap(f => readText(path.join(dir, f)).split(/\r?\n/).filter(Boolean))
      .reduce((count, line) => {
        try {
          const item = JSON.parse(line);
          const ts = new Date(item.ts || item.timestamp || item.shippedAt || 0).getTime();
          return ts >= cutoff ? count + 1 : count;
        } catch {
          return count;
        }
      }, 0);
  } catch {
    return 0;
  }
}

function loadUntrackedDevFolders({ root, node, runDetector }) {
  const detector = path.join(root, 'scripts', 'detect-new-dev-folders.mjs');
  if (!runDetector && !fs.existsSync(detector)) return null;
  try {
    const res = runDetector
      ? runDetector()
      : spawnSync(node, [detector, '--json'], { cwd: root, encoding: 'utf8', timeout: 5000 });
    return res.status === 0 && res.stdout ? JSON.parse(res.stdout) : null;
  } catch {
    return null;
  }
}

export function renderFounderUnlocksBlock({ root, taskBoard }) {
  const humanSection = (() => {
    const parts = String(taskBoard || '').split(/^## /m);
    const match = parts.find(p => p.startsWith('Human Action Required'));
    if (!match) return '';
    const nl = match.indexOf('\n');
    return nl === -1 ? '' : match.slice(nl + 1);
  })();
  const items = humanSection.split(/\r?\n/).filter(l => /^- \[ \]/.test(l)).slice(0, 2);
  if (items.length === 0) return null;

  const ledger = ensureAges(taskBoard, { root });
  const out = [top('FOUNDER UNLOCKS')];
  out.push(row('Single founder actions that reopen sprint surface:'));
  for (const line of items) {
    const clean = line.replace(/^- \[ \]\s*/, '').replace(/\*\*/g, '');
    const ageMatch = clean.match(/~?(\d+)\s*sessions/);
    const title = clean.split(/\s+—\s+/)[0];
    let age;
    if (ageMatch) {
      age = `${ageMatch[1]}s`;
    } else if (ledger[title]?.firstSeen) {
      const d = daysSince(ledger[title].firstSeen);
      age = d === 0 ? 'today' : `${d}d`;
    } else {
      age = 'new';
    }
    out.push(row(`${age.padStart(5)} · ${title.slice(0, W - 12)}`));
  }
  out.push(bot());
  return out.join('\n');
}
