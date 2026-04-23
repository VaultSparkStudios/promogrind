#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJson } from './lib/context-parsing.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_MD = path.join(ROOT, 'docs', 'FOUNDER_CONTROL.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_CONTROL.json');
const jsonMode = process.argv.includes('--json');

const projectStatus = readJson(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), {});
const humanPressure = readJson(path.join(ROOT, 'portfolio', 'compiled', 'HUMAN_ACTION_PRESSURE.json'), { items: [] });
const hubFeed = readJson(path.join(ROOT, 'portfolio', 'compiled', 'HUB_FEED.json'), {});
const geniusList = readJson(path.join(ROOT, 'context', 'GENIUS_LIST.json'), { items: [] });
const activeSessions = hubFeed?.activeSessions?.sessions || [];

const executeNow = [
  { title: 'Refresh compiled feeds + founder surfaces', why: 'keep downstream consumers current', action: 'node scripts/ops.mjs feeds && node scripts/ops.mjs founder-control' },
  { title: 'Clear top local unblocked Studio Ops item', why: 'maintain local momentum at quality bar', action: 'node scripts/ops.mjs action-queue' },
];

const ownerOnly = (humanPressure.items || []).slice(0, 5).map((item) => ({
  title: item.title,
  why: item.impactLabel || 'founder-only blocker',
  action: item.nextAgentAction || null,
}));

const delegateToCodex = (geniusList.items || [])
  .filter((item) => String(item.status || '').toLowerCase() === 'unblocked')
  .slice(0, 5)
  .map((item) => ({
    title: item.item || item.title,
    why: `${item.cat || item.category || 'task'} · ${item.source || 'genius-list'}`,
    action: 'bounded implementation / repair / review task',
  }));

const autoRun = [
  { title: 'Refresh active session topology', why: `${activeSessions.length} active session(s) detected`, action: 'node scripts/ops.mjs studio-conductor --refresh --json' },
  { title: 'Refresh founder queue', why: 'keep owner-only blockers deduped and current', action: 'node scripts/ops.mjs founder-queue --json' },
];

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-founder-control.mjs',
  currentFocus: projectStatus.currentFocus || null,
  summary: {
    sessionMode: projectStatus.sessionMode || null,
    activeSessions: activeSessions.length,
    topHumanPressure: ownerOnly[0]?.title || null,
    topCodexCandidate: delegateToCodex[0]?.title || null,
  },
  do_now: executeNow,
  delegate_to_codex: delegateToCodex,
  owner_only: ownerOnly,
  auto_run: autoRun,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '# Founder Control',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)} · session mode: ${payload.summary.sessionMode || 'unknown'} · active sessions: ${payload.summary.activeSessions}`,
  '',
  '## Do Now',
  '',
  ...payload.do_now.map((item) => `- **${item.title}** — ${item.why}${item.action ? ` · \`${item.action}\`` : ''}`),
  '',
  '## Delegate To Codex',
  '',
  ...payload.delegate_to_codex.map((item) => `- **${item.title}** — ${item.why}${item.action ? ` · ${item.action}` : ''}`),
  '',
  '## Owner Only',
  '',
  ...payload.owner_only.map((item) => `- **${item.title}** — ${item.why}${item.action ? ` · next agent action: \`${item.action}\`` : ''}`),
  '',
  '## Auto Run',
  '',
  ...payload.auto_run.map((item) => `- **${item.title}** — ${item.why}${item.action ? ` · \`${item.action}\`` : ''}`),
  '',
];

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(OUT_MD, lines.join('\n'));
console.log('✓ Founder Control → docs/FOUNDER_CONTROL.md');
