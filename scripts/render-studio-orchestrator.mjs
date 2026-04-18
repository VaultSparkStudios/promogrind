#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const json = process.argv.includes('--json');

const status = readJson('context/PROJECT_STATUS.json', {});
const activeSessions = readJson('portfolio/ACTIVE_SESSIONS.json', {});
const founderControl = readJson('portfolio/compiled/FOUNDER_CONTROL.json', {});
const humanPressure = readJson('portfolio/compiled/HUMAN_ACTION_PRESSURE.json', {});
const localItems = readTaskBoard();

const prioritizedLocal = localItems
  .filter(item => item.status === 'unblocked')
  .slice(0, 5)
  .map(item => ({
    ...item,
    runtime: recommendRuntime(item),
    lane: recommendLane(item),
    why: runtimeWhy(item),
  }));

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-studio-orchestrator.mjs',
  sessionMode: status.sessionMode ?? 'builder',
  summary: {
    activeSessions: activeSessions?.portfolio?.activeCount ?? 0,
    recommendedNextRepo: activeSessions?.recommendedNextRepo?.slug ?? null,
    topOwnerBlocker: humanPressure?.topPressure?.[0]?.title ?? null,
    topLocalItem: prioritizedLocal[0]?.title ?? null,
    currentFocus: status.currentFocus ?? null,
  },
  continue_here: prioritizedLocal,
  owner_only: (humanPressure?.topPressure ?? []).slice(0, 5).map(item => ({
    title: item.title,
    impact: item.impactLabel,
    nextAction: item.nextAgentAction,
    pressure: item.pressureScore,
    runtime: 'human',
  })),
  delegate_to_codex: (founderControl?.delegate_to_codex ?? []).slice(0, 5).map(item => ({
    title: item.title,
    why: item.why,
    action: item.action,
    runtime: 'codex',
  })),
  auto_run: (founderControl?.auto_run ?? []).slice(0, 5).map(item => ({
    title: item.title,
    why: item.why,
    action: item.action,
    runtime: 'automation',
  })),
  next_repo: activeSessions?.recommendedNextRepo
    ? {
        slug: activeSessions.recommendedNextRepo.slug,
        reason: activeSessions.recommendedNextRepo.reason,
        priorityScore: activeSessions.recommendedNextRepo.priorityScore,
      }
    : null,
  runtime_policy: {
    claude: 'Use for founder-scale synthesis, cross-project protocol/integration design, and decisions that shape multiple surfaces.',
    codex: 'Use for bounded implementation, verification, and repairs once the task is well-scoped.',
    automation: 'Use for deterministic refreshes, renderers, feeds, and recurring maintenance.',
    human: 'Use only for true owner-only credentials, approvals, token scopes, DNS, billing, or partner actions.',
  },
};

writeFile('portfolio/compiled/STUDIO_ORCHESTRATOR.json', JSON.stringify(payload, null, 2) + '\n');
writeFile('docs/STUDIO_ORCHESTRATOR.md', renderMarkdown(payload));

if (json) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`✓ Studio orchestrator → docs/STUDIO_ORCHESTRATOR.md`);
  console.log(`   Continue here: ${payload.continue_here.length} item(s) · owner-only: ${payload.owner_only.length} · codex: ${payload.delegate_to_codex.length}`);
}

function readTaskBoard() {
  const text = readText('context/TASK_BOARD.md');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length < 6) continue;
    if (!/^\d+(\.\d+)?$/.test(cells[0])) continue;
    rows.push({
      id: cells[0],
      tier: cells[1],
      category: cells[2].toLowerCase(),
      status: cells[3].toLowerCase(),
      effort: cells[4],
      title: cells[5].replace(/\*\*/g, ''),
    });
  }
  return rows;
}

function recommendRuntime(item) {
  const t = `${item.category} ${item.title}`.toLowerCase();
  if (/(credential|token|dns|approval|affiliate|owner)/.test(t)) return 'human';
  if (/(refresh|render|compile|rebuild|queue|feed|autopilot)/.test(t)) return 'automation';
  if (/(orchestrator|identity contract|protocol|launch mesh|runtime assignment|governance|digest)/.test(t)) return 'claude';
  return 'codex';
}

function recommendLane(item) {
  const runtime = recommendRuntime(item);
  if (runtime === 'claude') return 'founder-synthesis';
  if (runtime === 'automation') return 'deterministic-refresh';
  if (runtime === 'human') return 'owner-only';
  return 'bounded-implementation';
}

function runtimeWhy(item) {
  const runtime = recommendRuntime(item);
  if (runtime === 'claude') return 'Cross-project or founder-facing synthesis with protocol/integration implications.';
  if (runtime === 'automation') return 'Deterministic renderer/compiler style work; safe to run repeatedly.';
  if (runtime === 'human') return 'Requires credentials, approvals, or admin action outside agent authority.';
  return 'Bounded implementation and verification work fits the Codex execution lane.';
}

function renderMarkdown(data) {
  const lines = [];
  lines.push('# Studio Orchestrator');
  lines.push('');
  lines.push(`> Generated: ${data.generatedAt.slice(0, 10)} · session mode: ${data.sessionMode}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Active sessions: **${data.summary.activeSessions}**`);
  lines.push(`- Recommended next repo: **${data.summary.recommendedNextRepo ?? 'none'}**`);
  lines.push(`- Top local item: **${data.summary.topLocalItem ?? 'none'}**`);
  lines.push(`- Top owner blocker: **${data.summary.topOwnerBlocker ?? 'none'}**`);
  if (data.summary.currentFocus) lines.push(`- Current focus: ${data.summary.currentFocus}`);
  lines.push('');
  lines.push('## Continue Here');
  lines.push('');
  for (const item of data.continue_here) {
    lines.push(`- **${item.title}** — runtime: \`${item.runtime}\` · lane: ${item.lane} · effort: ${item.effort}`);
    lines.push(`  Why: ${item.why}`);
  }
  lines.push('');
  lines.push('## Delegate To Codex');
  lines.push('');
  for (const item of data.delegate_to_codex) {
    lines.push(`- **${item.title}** — ${item.why}`);
  }
  lines.push('');
  lines.push('## Owner Only');
  lines.push('');
  for (const item of data.owner_only) {
    lines.push(`- **${item.title}** — pressure ${item.pressure} · next action: \`${item.nextAction}\``);
  }
  lines.push('');
  lines.push('## Auto Run');
  lines.push('');
  for (const item of data.auto_run) {
    lines.push(`- **${item.title}** — \`${item.action}\``);
  }
  lines.push('');
  lines.push('## Runtime Policy');
  lines.push('');
  for (const [runtime, detail] of Object.entries(data.runtime_policy)) {
    lines.push(`- **${runtime}** — ${detail}`);
  }
  lines.push('');
  return lines.join('\n');
}

function readJson(relPath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch {
    return '';
  }
}

function writeFile(relPath, content) {
  const abs = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}
