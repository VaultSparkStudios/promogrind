#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { scanShellNodeSpawns } from './check-windows-hide.mjs';
import { buildHeuristicContextMeter, loadStartupContextMeter, renderStartupContextMeterBlock } from './lib/startup-context-meter-block.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const json = process.argv.includes('--json');
const results = [];

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
    assert.equal(meter.pctUsed, 0.1);
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

