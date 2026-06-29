#!/usr/bin/env node
/**
 * render-protocol-biography.mjs
 *
 * Temporal Protocol Replay — generates docs/PROTOCOL_BIOGRAPHY.md
 * A living narrative of how this project's protocol evolved over time,
 * correlated against git commits, SIL entries, and decision milestones.
 *
 * Output: chronological timeline of protocol events with context, velocity
 * trends, and key inflection points marked.
 *
 * Usage:
 *   node scripts/render-protocol-biography.mjs [--project <localPath>] [--limit N]
 *   node scripts/ops.mjs biography
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from './lib/safe-spawn.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx = process.argv.indexOf('--project');
const targetPath = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;
const limitIdx   = process.argv.indexOf('--limit');
const limit      = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : 60;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}
function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}
function extractBetween(content, start, end) {
  const si = content.indexOf(start);
  const ei = content.indexOf(end);
  if (si === -1 || ei === -1 || ei <= si) return '';
  return content.slice(si + start.length, ei).trim();
}

// ── Load sources ──────────────────────────────────────────────────────────────
const ctx    = (f) => path.join(targetPath, 'context', f);
const status = readJson(ctx('PROJECT_STATUS.json'));
const silText = readText(ctx('SELF_IMPROVEMENT_LOOP.md'));

// ── Parse SIL session history ─────────────────────────────────────────────────
const SIL_ENTRY = /^## (\d{4}-\d{2}-\d{2}) — Session (\d+) \| Total: (\d+)\/500 \| Velocity: (\d+)/gm;
const silSessions = [];
let m;
while ((m = SIL_ENTRY.exec(silText)) !== null) {
  silSessions.push({
    date: m[1],
    session: parseInt(m[2]),
    total: parseInt(m[3]),
    velocity: parseInt(m[4]),
  });
}

// ── Parse DECISIONS.md milestones ─────────────────────────────────────────────
const decisionsText = readText(ctx('DECISIONS.md'));
const DECISION_ENTRY = /^## (\d{4}-\d{2}-\d{2})[^\n]*— ([^\n]+)/gm;
const decisions = [];
let dm;
while ((dm = DECISION_ENTRY.exec(decisionsText)) !== null) {
  decisions.push({ date: dm[1], title: dm[2].trim().slice(0, 80) });
}

// ── Read git log ──────────────────────────────────────────────────────────────
function gitLog(repoPath) {
  const result = spawnSync('git', [
    'log',
    '--format=%H|%as|%s',
    `--max-count=${limit}`,
    '--no-merges',
  ], { cwd: repoPath, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return result.stdout.trim().split('\n').filter(Boolean).map(line => {
    const [hash, date, ...msgParts] = line.split('|');
    return { hash: hash.slice(0, 9), date, msg: msgParts.join('|').slice(0, 80) };
  });
}

const commits = gitLog(targetPath);

// Detect protocol-significant commits by keywords
function isProtocolCommit(msg) {
  return /\b(protocol|canon|sil|genome|ignis|truth|closeout|start|session|template|prompts|agents|ops|scripts|workflow|hook|entropy)\b/i.test(msg);
}

// ── Build unified timeline ────────────────────────────────────────────────────
// Each event: { date, type: 'commit'|'sil'|'decision', payload }
const timeline = [];

for (const c of commits) {
  timeline.push({ date: c.date, type: 'commit', payload: c, isProtocol: isProtocolCommit(c.msg) });
}
for (const s of silSessions) {
  timeline.push({ date: s.date, type: 'sil', payload: s });
}
for (const d of decisions) {
  timeline.push({ date: d.date, type: 'decision', payload: d });
}

// Sort ascending by date
timeline.sort((a, b) => a.date.localeCompare(b.date));

// Group by date
const byDate = {};
for (const ev of timeline) {
  (byDate[ev.date] ??= []).push(ev);
}

// ── Detect inflection points in SIL trend ─────────────────────────────────────
const sortedSil = [...silSessions].sort((a, b) => a.session - b.session);
const inflections = new Set();
for (let i = 1; i < sortedSil.length - 1; i++) {
  const prev = sortedSil[i - 1].total;
  const curr = sortedSil[i].total;
  const next = sortedSil[i + 1].total;
  // Local peak: +10 pts above neighbors
  if (curr - prev >= 10 && curr - next >= 5) inflections.add(sortedSil[i].date);
  // Local trough: -10 pts below neighbors
  if (prev - curr >= 10 && next - curr >= 5) inflections.add(sortedSil[i].date);
}

// ── Build sparkline for recent SIL ────────────────────────────────────────────
const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function sparkline(vals) {
  if (vals.length === 0) return '';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  return vals.map(v => SPARK_CHARS[Math.round(((v - min) / range) * (SPARK_CHARS.length - 1))]).join('');
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const silTotals = sortedSil.map(s => s.total);
const silVelocities = sortedSil.map(s => s.velocity);
const peakSession = sortedSil.reduce((best, s) => s.total > (best?.total ?? 0) ? s : best, null);
const firstSession = sortedSil[0];
const lastSession  = sortedSil.at(-1);
const avgVelocity  = silVelocities.length > 0
  ? (silVelocities.reduce((a, b) => a + b, 0) / silVelocities.length).toFixed(1)
  : 'N/A';
const totalProtocolCommits = commits.filter(c => isProtocolCommit(c.msg)).length;

// ── Build markdown ────────────────────────────────────────────────────────────
const today   = new Date().toISOString().slice(0, 10);
const projName = status.name ?? path.basename(targetPath);
const lines = [
  `<!-- generated-by: scripts/render-protocol-biography.mjs -->`,
  `<!-- generated-at: ${today} -->`,
  ``,
  `# Protocol Biography — ${projName}`,
  ``,
  `> A chronological replay of how this project's protocol evolved across sessions.`,
  `> Correlates git commits, SIL scores, and decision milestones.`,
  `> Regenerate with: \`node scripts/ops.mjs biography\``,
  ``,
  `---`,
  ``,
  `## At a Glance`,
  ``,
  `\`\`\``,
  `Sessions recorded:    ${sortedSil.length}`,
  `Protocol commits:     ${totalProtocolCommits} / ${commits.length} (${Math.round(totalProtocolCommits / Math.max(1, commits.length) * 100)}%)`,
  `Decisions logged:     ${decisions.length}`,
  `First session:        ${firstSession ? `S${firstSession.session} (${firstSession.date}) — ${firstSession.total}/500` : 'N/A'}`,
  `Latest session:       ${lastSession  ? `S${lastSession.session} (${lastSession.date}) — ${lastSession.total}/500` : 'N/A'}`,
  `Peak SIL:             ${peakSession  ? `S${peakSession.session} (${peakSession.date}) — ${peakSession.total}/500` : 'N/A'}`,
  `Avg velocity:         ${avgVelocity} tasks/session`,
  `SIL sparkline:        ${sparkline(silTotals.slice(-20))}  (last ${Math.min(20, silTotals.length)} sessions)`,
  `\`\`\``,
  ``,
  `---`,
  ``,
  `## Timeline`,
  ``,
];

const dates = [...new Set(timeline.map(e => e.date))].sort();

for (const date of dates) {
  const events = byDate[date] ?? [];
  const silEv  = events.find(e => e.type === 'sil');
  const decEvs = events.filter(e => e.type === 'decision');
  const commitEvs = events.filter(e => e.type === 'commit');
  const isInflection = inflections.has(date);

  // Section header
  const inflectionTag = isInflection ? ' ★' : '';
  if (silEv) {
    const spark = silEv.payload;
    const trend = sortedSil.indexOf(spark) > 0
      ? spark.total - sortedSil[sortedSil.indexOf(spark) - 1].total
      : 0;
    const trendStr = trend > 0 ? `↑${trend}` : trend < 0 ? `↓${Math.abs(trend)}` : '→0';
    lines.push(`### ${date} — Session ${spark.session}  \`SIL ${spark.total}/500\`  \`v${spark.velocity}\`  \`${trendStr}\`${inflectionTag}`);
  } else {
    const hasDecisions = decEvs.length > 0;
    const hasCommits = commitEvs.some(c => c.isProtocol);
    if (!hasDecisions && !hasCommits) continue; // skip boring dates
    lines.push(`### ${date}${inflectionTag}`);
  }
  lines.push('');

  // Decisions
  for (const d of decEvs) {
    lines.push(`- 📋 **Decision:** ${d.payload.title}`);
  }

  // Protocol commits
  const protocolCommits = commitEvs.filter(c => c.isProtocol);
  if (protocolCommits.length > 0) {
    for (const c of protocolCommits) {
      lines.push(`- \`${c.payload.hash}\` ${c.payload.msg}`);
    }
    const otherCount = commitEvs.length - protocolCommits.length;
    if (otherCount > 0) {
      lines.push(`- *(+${otherCount} non-protocol commit${otherCount !== 1 ? 's' : ''})*`);
    }
  } else if (commitEvs.length > 0 && !silEv) {
    // Non-protocol day — only show if there are decisions
    if (decEvs.length === 0) { lines.pop(); continue; }
  }

  // Inflection note
  if (isInflection && silEv) {
    const spark = silEv.payload;
    const idx = sortedSil.indexOf(spark);
    if (idx > 0) {
      const prev = sortedSil[idx - 1].total;
      const diff = spark.total - prev;
      if (diff > 0) lines.push(`- ⬆ **Peak inflection** (+${diff} pts from previous session)`);
      else          lines.push(`- ⬇ **Trough inflection** (${diff} pts from previous session)`);
    }
  }

  lines.push('');
}

// ── Velocity chart ────────────────────────────────────────────────────────────
if (sortedSil.length >= 3) {
  lines.push('---', '', '## Velocity Over Time', '', '```');
  const maxVel = Math.max(...silVelocities, 1);
  const last15 = sortedSil.slice(-15);
  for (const s of last15) {
    const bar = '█'.repeat(Math.round((s.velocity / maxVel) * 20));
    const pad = ' '.repeat(20 - Math.round((s.velocity / maxVel) * 20));
    lines.push(`S${String(s.session).padStart(3)} |${bar}${pad}| ${s.velocity} tasks`);
  }
  lines.push('```', '');
}

lines.push(
  '---',
  '',
  `*Generated by \`scripts/render-protocol-biography.mjs\` · ${today}*`,
  '',
);

// ── Write output ──────────────────────────────────────────────────────────────
const outPath = path.join(targetPath, 'docs', 'PROTOCOL_BIOGRAPHY.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');

const rel = path.relative(ROOT, outPath);
console.log(`✓ Protocol biography → ${rel}`);
console.log(`  ${sortedSil.length} sessions · ${decisions.length} decisions · ${totalProtocolCommits}/${commits.length} protocol commits`);
console.log(`  Peak: S${peakSession?.session ?? '?'} (${peakSession?.total ?? '?'}/500) · Avg velocity: ${avgVelocity}`);
