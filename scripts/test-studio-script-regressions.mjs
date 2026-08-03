#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { scanDirectChildProcessImports, scanShellNodeSpawns } from './check-windows-hide.mjs';
import { rewireToSafeSpawn } from './codemod-safe-spawn.mjs';
import { buildHeuristicContextMeter, loadStartupContextMeter, renderStartupContextMeterBlock } from './lib/startup-context-meter-block.mjs';
import { renderOrchestratorBlock, renderPortfolioTaskBoardsBlock } from './lib/startup-orchestrator-blocks.mjs';
import { renderExecutionPlanBlock, renderMomentumMeterBlock } from './lib/startup-summary-blocks.mjs';
import { buildExternalLaunchProofLedger, renderLedgerMd } from './render-external-launch-proof-ledger.mjs';
import { buildCloseoutGeniusHint } from './lib/closeout-genius-hint.mjs';
import { createStartupBriefBox } from './lib/startup-brief-box.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const json = process.argv.includes('--json');
const results = [];

run('startup brief box toolkit preserves width, words, and bounded bars', () => {
  const box = createStartupBriefBox(24);
  assert.equal(box.row('truth stays source bound').length, 28);
  assert.ok(box.truncateWordAware('truth stays source bound beyond width').endsWith('…'));
  assert.equal(box.bar20(150), '████████████████████');
  assert.equal(box.bar10(-5), '░░░░░░░░░░');
  assert.equal(box.bar24(500, 1000), '████████████░░░░░░░░░░░░');
  assert.throws(() => createStartupBriefBox(4), /width/);
});

run('scanner flags shell-resolved literal node spawns', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-hide-node-'));
  try {
    const file = path.join(dir, 'bad.mjs');
    fs.writeFileSync(file, "import { spawnSync } from './lib/safe-spawn.mjs';\nspawnSync('node', ['x.mjs'], { shell: true, windowsHide: true });\n", 'utf8');
    const hits = scanShellNodeSpawns(dir);
    assert.equal(hits.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

run('scanner ignores process.execPath shell spawns', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-hide-execpath-'));
  try {
    const file = path.join(dir, 'ok.mjs');
    fs.writeFileSync(file, "import { spawnSync } from './lib/safe-spawn.mjs';\nspawnSync(process.execPath, ['x.mjs'], { shell: true, windowsHide: true });\n", 'utf8');
    const hits = scanShellNodeSpawns(dir);
    assert.equal(hits.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

run('scanner and codemod close dynamic child_process import escape hatches', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-hide-dynamic-'));
  try {
    fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'lib', 'safe-spawn.mjs'), 'export const spawnSync = () => ({ status: 0 });\n', 'utf8');
    const file = path.join(dir, 'bad.mjs');
    const rawModule = 'node:' + 'child_process';
    fs.writeFileSync(file, `const { spawnSync } = await import( '${rawModule}' );\nspawnSync('node', ['x.mjs']);\n`, 'utf8');
    const hits = scanDirectChildProcessImports(dir);
    assert.equal(hits.length, 1);
    const result = rewireToSafeSpawn(dir, { apply: true });
    assert.equal(result.changed.length, 1);
    const repaired = fs.readFileSync(file, 'utf8');
    assert.match(repaired, /import\(\s*['"]\.\/lib\/safe-spawn\.mjs['"]\s*\)/);
    assert.equal(scanDirectChildProcessImports(dir).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

run('genius cache refresh keeps JSON and Markdown surfaces coherent', () => {
  const refresh = spawnSync(process.execPath, ['scripts/cache-genius-list.mjs', '--force'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(refresh.status, 0, refresh.stderr || refresh.stdout);
  const cache = JSON.parse(fs.readFileSync(path.join(ROOT, '.cache', 'genius-list.json'), 'utf8'));
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'GENIUS_LIST.md'), 'utf8');
  const list = cache.list;
  const title = list.projectScoped
    ? `# Genius Hit List — ${list.project?.name || list.project?.slug || ''}`
    : `# Genius Hit List — Session ${list.session}`;
  assert.ok(doc.includes(title), 'Markdown title matches cached list scope');
  assert.ok(doc.includes(`Generated: ${list.date}`), 'Markdown date matches cached list');
  assert.ok(doc.includes(`IGNIS source: **${list.ignisSource || 'fallback'}**`), 'Markdown source matches cached list');
});

run('closeout board distinguishes exhausted genius work from a missing cache', () => {
  assert.deepEqual(buildCloseoutGeniusHint(null), { state: 'missing' });
  assert.deepEqual(buildCloseoutGeniusHint({ list: { ranked: [] } }), { state: 'exhausted' });
  assert.deepEqual(
    buildCloseoutGeniusHint({ list: { ranked: [{ id: 'next-root-fix', title: 'Next root fix' }] } }),
    { state: 'item', title: 'Next root fix', rationale: '', cmd: null },
  );
});

run('browser launch validation mirror matches canonical project status', () => {
  const mirror = spawnSync(process.execPath, ['scripts/generate-project-status-mirror.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(mirror.status, 0, mirror.stderr || mirror.stdout);
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'context', 'PROJECT_STATUS.json'), 'utf8'));
  const generated = fs.readFileSync(path.join(ROOT, 'src', 'data', 'projectStatus.generated.js'), 'utf8');
  assert.ok(generated.includes(`${source.testsPassing}/${source.testsTotal} passing`));
  assert.ok(!generated.includes('380/380 passing'));
});

run('startup context meter normalizes live ledger payload', () => {
  const meter = loadStartupContextMeter({
    root: ROOT,
    scriptsDir: path.join(ROOT, 'scripts'),
    agent: 'codex',
    limit: 1000000,
    runContextMeter: () => ({
      status: 0,
      stdout: JSON.stringify({
        usedTokens: 12345,
        limit: 1000000,
        pctUsed: 1.2,
        turnsToCompact: 88,
        continueCostPerTurn: 456,
        cacheHitRate: 0.5,
        recommendation: 'CONTINUE',
        confidence: 'measured',
        model: 'codex-1m',
      }),
    }),
  });
  assert.equal(meter.live, true);
  assert.equal(meter.agent, 'codex');
  assert.equal(meter.usedTokens, 12345);
  assert.equal(meter.model, 'codex-1m');
});

run('startup context meter fallback is deterministic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-meter-'));
  try {
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'a'.repeat(400), 'utf8');
    const meter = buildHeuristicContextMeter({
      root: dir,
      limit: 1000,
      agent: 'codex',
      files: ['AGENTS.md'],
    });
    assert.equal(meter.live, false);
    assert.equal(meter.usedTokens, 100);
    assert.equal(meter.pctUsed, 10);
    assert.equal(meter.recommendation, 'CONTINUE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

run('startup context meter block renders normalized live payload', () => {
  const rows = renderStartupContextMeterBlock({
    live: true,
    usedTokens: 12345,
    limit: 1000000,
    pctUsed: 1.2,
    turnsToCompact: 88,
    continueCostPerTurn: 456,
    cacheHitRate: 0.5,
    recommendation: 'CONTINUE',
    confidence: 'measured',
    agent: 'codex',
    model: 'codex-1m',
  }, {
    top: (title) => `[${title}]`,
    row: (line) => line,
    bot: () => '[/]',
  }).split('\n');

  assert.equal(rows[0], '[CONTEXT METER]');
  assert.ok(rows.some((line) => line.includes('  1% used')));
  assert.ok(rows.some((line) => line.includes('12,345 / 1,000,000 tok')));
  assert.ok(rows.some((line) => line.includes('cache 50%')));
  assert.ok(rows.some((line) => line.includes('Verdict: CONTINUE')));
});

run('startup context meter preserves sub-one-percent live readings', () => {
  const block = renderStartupContextMeterBlock({
    live: true,
    usedTokens: 5000,
    limit: 1000000,
    pctUsed: 0.5,
    recommendation: 'CONTINUE',
    confidence: 'measured',
    agent: 'codex',
  }, {
    top: (title) => `[${title}]`,
    row: (line) => line,
    bot: () => '[/]',
  });
  assert.match(block, /\s1% used/);
  assert.doesNotMatch(block, /50% used/);
});

run('repo-local generators preserve PromoGrind scope without a private registry', () => {
  const genius = spawnSync(process.execPath, ['scripts/generate-genius-list.mjs', '--json', '--local-only', '--no-cross-repo'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(genius.status, 0, genius.stderr || genius.stdout);
  const geniusPayload = JSON.parse(genius.stdout);
  assert.equal(geniusPayload.projectScoped, true);
  assert.equal(geniusPayload.project?.slug, 'promogrind');

  const intent = spawnSync(process.execPath, ['scripts/render-session-intent-plan.mjs', '--json', '--intent', 'Improve PromoGrind launch truth'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(intent.status, 0, intent.stderr || intent.stdout);
  const intentPayload = JSON.parse(intent.stdout);
  assert.deepEqual(intentPayload.repos, ['promogrind']);
});

run('startup orchestrator block summarizes live coordination state', () => {
  const block = renderOrchestratorBlock({
    root: ROOT,
    active: {
      _generatedAt: '2026-07-01T12:00:00.000Z',
      activeSessions: [{ slug: 'promogrind' }],
      staleLocks: [{}],
      conflicts: [{ slug: 'other' }],
      portfolio: { totalProjects: 27 },
      recommendedNextRepo: { slug: 'promogrind' },
    },
    pending: { pending: [{ slug: 'promogrind' }, { slug: 'studio-ops' }] },
    now: Date.parse('2026-07-01T12:30:00.000Z'),
    runDetector: () => ({
      status: 0,
      stdout: JSON.stringify({ categories: { projectLike: ['new-app'], scratch: ['tmp-note'] } }),
    }),
  });

  assert.ok(block.includes('ORCHESTRATOR'));
  assert.ok(block.includes('Workers: 1/27 active · 1 stale · 1 conflicts'));
  assert.ok(block.includes('Snapshot: 30m old · next promogrind'));
  assert.ok(block.includes('Propagation: 2 queued · 1 lock-blocked'));
  assert.ok(block.includes('Untracked: 1 project-like · 1 scratch'));
});

run('startup portfolio task-board block keeps top active repo compact', () => {
  const block = renderPortfolioTaskBoardsBlock({
    totals: { remaining: 7, unblocked: 3, blocked: 2, critical: 1, high: 4 },
    projectsWithWork: 2,
    projectsScanned: 5,
    byProject: [
      { present: true, isCurrent: true, name: 'PromoGrind', remaining: 3, unblocked: 2, critical: 1, high: 2 },
      { present: true, isCurrent: false, name: 'Studio Ops', remaining: 4, unblocked: 1, critical: 0, high: 2 },
    ],
  });

  assert.ok(block.includes('PORTFOLIO TASK BOARDS'));
  assert.ok(block.includes('Total: 7 open · 3 unblocked · 2 blocked'));
  assert.ok(block.includes('Crit 1 · High 4 · 2/5 repos active'));
  assert.ok(block.includes('> PromoGrind'));
  assert.ok(block.includes('+1 more'));
});

run('startup execution plan block is compact and optional', () => {
  assert.deepEqual(renderExecutionPlanBlock({ intentLine: '' }), []);
  const lines = renderExecutionPlanBlock({
    intentLine: 'Ship the next startup renderer extraction safely',
    repoTouchLine: 'promogrind',
    yieldLine: 'validated helper extraction',
  });
  assert.equal(lines[0].includes('EXECUTION PLAN'), true);
  assert.ok(lines.some((line) => line.includes('Ship the next startup renderer')));
  assert.ok(lines.some((line) => line.includes('Repo touch:')));
});

run('startup momentum block preserves velocity and cache signals', () => {
  const block = renderMomentumMeterBlock({
    velHistBar: '█▆▄▄▄',
    velocity: 2,
    velTrend: '↑',
    intentPct: 100,
    streak: 3,
    cacheHitPct: 75,
    weeklyCost: 0.1,
  }).join('\n');
  assert.ok(block.includes('MOMENTUM METER'));
  assert.ok(block.includes('Velocity:'));
  assert.ok(block.includes('100% achieved'));
  assert.ok(block.includes('Cache hit:  75%'));
  assert.ok(block.includes('Weekly spend: $0.10'));
});
run('external launch proof ledger preserves pending proof blockers', () => {
  const ledger = buildExternalLaunchProofLedger({
    status: {
      name: 'PromoGrind',
      currentSession: 113,
      liveUrl: 'https://promogrind.bet',
      blockers: [
        'Run real production auth email smoke with npm run smoke:auth-email -- --record.',
        'Run one real Stripe smoke purchase and verify the post-checkout portal/subscription path.',
        'Wire the real browser-safe Supabase anon key into the production capture page/deploy config.',
      ],
    },
    launchProofs: {
      proofs: {
        authEmailSmoke: {
          label: 'Production auth email smoke',
          status: 'pending',
          blocking: true,
          requiredFor: ['soft-launch'],
          evidenceRequired: ['confirmation email delivered'],
          evidence: [],
          nextStep: 'Run auth email smoke.',
        },
      },
    },
  });

  assert.equal(ledger.blockersOpen, 3);
  assert.equal(ledger.launchProofsBlocking, 1);
  assert.equal(ledger.blockerRows[0].category, 'auth-email');
  const md = renderLedgerMd(ledger);
  assert.ok(md.includes('Production auth email smoke'));
  assert.ok(md.includes('Do not paste secrets'));
});
const summary = {
  ok: results.every(r => r.pass),
  passing: results.filter(r => r.pass).length,
  failing: results.filter(r => !r.pass).length,
  results,
};

if (json) console.log(JSON.stringify(summary, null, 2));
else {
  console.log('\nStudio script regression tests');
  for (const result of results) console.log(`  ${result.pass ? '✓' : '⛔'} ${result.name}${result.pass ? '' : ` — ${result.detail}`}`);
  console.log(`\n  ${summary.passing}/${results.length} passing\n`);
}

process.exit(summary.ok ? 0 : 1);

function run(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (error) {
    results.push({ name, pass: false, detail: error.message });
  }
}
