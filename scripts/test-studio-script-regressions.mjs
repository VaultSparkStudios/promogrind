#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { scanShellNodeSpawns } from './check-windows-hide.mjs';

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
