#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from './lib/safe-spawn.mjs';

const registry = JSON.parse(fs.readFileSync('portfolio/PROJECT_REGISTRY.json', 'utf8'));
const results = [];

for (const p of registry.projects) {
  if (!p.localPath || p.localPath === 'undefined') {
    results.push({ slug: p.slug, status: 'skipped', reason: 'no-local-path' });
    continue;
  }
  if (!fs.existsSync(p.localPath)) {
    results.push({ slug: p.slug, status: 'skipped', reason: 'path-missing' });
    continue;
  }
  const lockFile = path.join(p.localPath, 'context', '.session-lock');
  if (fs.existsSync(lockFile) && p.slug !== 'studio-ops') {
    results.push({ slug: p.slug, status: 'locked' });
    continue;
  }
  try {
    const out = execSync(
      `node scripts/ops.mjs onboard --project ${p.slug} --repair --write --json`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(out);
    results.push({
      slug: p.slug,
      status: 'onboarded',
      wrote: parsed.wrote?.length || 0,
      repaired: parsed.repaired?.length || 0,
      skills: parsed.installedSkills?.length || 0,
      hooks: parsed.installedHooks?.length || 0
    });
  } catch (e) {
    results.push({ slug: p.slug, status: 'error', error: (e.stderr || e.message).toString().slice(0, 200) });
  }
}

const onboarded = results.filter(r => r.status === 'onboarded').length;
const locked = results.filter(r => r.status === 'locked').length;
const skipped = results.filter(r => r.status === 'skipped').length;
const errors = results.filter(r => r.status === 'error').length;

console.log(`\nOnboarded: ${onboarded}  ·  Locked: ${locked}  ·  Skipped: ${skipped}  ·  Errors: ${errors}\n`);
for (const r of results) {
  const badge = r.status === 'onboarded' ? '✓' : r.status === 'locked' ? '🔒' : r.status === 'error' ? '⛔' : '·';
  const detail = r.status === 'onboarded'
    ? `wrote=${r.wrote} repaired=${r.repaired} skills=${r.skills} hooks=${r.hooks}`
    : r.reason || r.error || '';
  console.log(`  ${badge} ${r.slug.padEnd(40)} ${detail}`);
}

fs.writeFileSync('portfolio/compiled/BATCH_ONBOARD_RESULT.json', JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), results }, null, 2));
