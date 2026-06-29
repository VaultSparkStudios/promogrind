#!/usr/bin/env node

/**
 * render-all-surfaces.mjs
 *
 * Unified orchestrator that regenerates ALL founder-facing intelligence surfaces
 * in one pass. Call this instead of running individual renderers.
 *
 * Surfaces generated:
 *   1. portfolio/STUDIO_BRAIN.md      (render-studio-brain.mjs)
 *   2. portfolio/IGNIS_CORE.md        (render-ignis-core.mjs)
 *   3. portfolio/TRUTH_DASHBOARD.md   (render-truth-dashboard.mjs)
 *   4. portfolio/WEEKLY_DIGEST.md     (render-weekly-digest.mjs)
 *   5. portfolio/DEBT_REPORT.md       (render-debt-report.mjs)
 *   6. portfolio/REVENUE_SIGNALS.md   (render-revenue-signals.mjs)
 *
 * Run: node scripts/render-all-surfaces.mjs
 */

import { execFileSync } from './lib/safe-spawn.mjs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const scriptsDir = path.join(root, 'scripts');

const renderers = [
  'render-studio-brain.mjs',
  'render-ignis-core.mjs',
  'render-truth-dashboard.mjs',
  'render-weekly-digest.mjs',
  'render-debt-report.mjs',
  'render-revenue-signals.mjs',
];

let passed = 0;
let failed = 0;

for (const renderer of renderers) {
  const script = path.join(scriptsDir, renderer);
  try {
    const output = execFileSync('node', [script], { cwd: root, encoding: 'utf8', timeout: 30000 });
    if (output.trim()) console.log(`  [ok] ${renderer}: ${output.trim()}`);
    else console.log(`  [ok] ${renderer}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${renderer}: ${err.message?.split('\n')[0] ?? 'unknown error'}`);
    failed++;
  }
}

console.log(`\nDone: ${passed} passed, ${failed} failed out of ${renderers.length} renderers.`);
if (failed > 0) process.exit(1);
