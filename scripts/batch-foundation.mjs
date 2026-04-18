#!/usr/bin/env node
// batch-foundation.mjs — Identify projects needing Foundation sessions and optionally
// write a minimal SIL bootstrap entry so future re-scores have a baseline to compare.
//
// Usage:
//   node scripts/batch-foundation.mjs            # report only
//   node scripts/batch-foundation.mjs --apply    # write bootstrap SIL to each eligible project
//   node scripts/batch-foundation.mjs --project <slug>  # target one project

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const APPLY = process.argv.includes('--apply');
const TARGET = (() => { const i = process.argv.indexOf('--project'); return i >= 0 ? process.argv[i + 1] : null; })();

const BOOTSTRAP_SENTINEL = /Bootstrap\/Foundation Baseline|Type A Bootstrap|Foundation Baseline/i;
// Match both new format (## YYYY-MM-DD — Session N) and old format (## Session N — YYYY-MM-DD)
const REAL_SCORE_PATTERN  = /^## (\d{4}-\d{2}-\d{2} — Session \d+|Session \d+ — \d{4}-\d{2}-\d{2})/m;

const results = { needsFoundation: [], hasBaseline: [], notApplied: [], error: [] };

for (const project of registry.projects) {
  if (project.status === 'archived') continue;
  if (TARGET && project.slug !== TARGET) continue;

  if (!project.studioOsApplied) {
    results.notApplied.push(project.slug);
    continue;
  }

  const localPath = project.localPath;
  if (!localPath) { results.error.push({ slug: project.slug, reason: 'no localPath' }); continue; }

  const silPath = path.join(localPath, 'context', 'SELF_IMPROVEMENT_LOOP.md');
  if (!fs.existsSync(silPath)) {
    results.needsFoundation.push({ slug: project.slug, name: project.name, reason: 'SIL file missing' });
    if (APPLY) writeBootstrap(project, silPath, 'missing');
    continue;
  }

  const content = fs.readFileSync(silPath, 'utf8');
  const hasRealScores = REAL_SCORE_PATTERN.test(content);
  const onlyBootstrap = BOOTSTRAP_SENTINEL.test(content) && !hasRealScores;

  if (!hasRealScores || onlyBootstrap) {
    results.needsFoundation.push({ slug: project.slug, name: project.name, reason: onlyBootstrap ? 'bootstrap only — no real scores' : 'no dated entries' });
    if (APPLY) writeBootstrap(project, silPath, 'bootstrap');
  } else {
    results.hasBaseline.push(project.slug);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  BATCH FOUNDATION REPORT                             ║');
console.log(`╚══════════════════════════════════════════════════════╝  ${today}\n`);

if (results.needsFoundation.length) {
  console.log(`⚠  Needs Foundation session (${results.needsFoundation.length}):`);
  for (const p of results.needsFoundation) {
    console.log(`   • ${p.name} [${p.slug}] — ${p.reason}${APPLY ? ' → bootstrap written' : ''}`);
  }
} else {
  console.log('✓  All applied projects have real SIL baselines.');
}

console.log(`\n✓  Has baseline (${results.hasBaseline.length}): ${results.hasBaseline.join(', ') || '—'}`);
if (results.notApplied.length) console.log(`⊘  Studio OS not applied (${results.notApplied.length}): ${results.notApplied.join(', ')}`);
if (results.error.length)      console.log(`✗  Errors: ${results.error.map(e => `${e.slug} (${e.reason})`).join(', ')}`);

if (!APPLY && results.needsFoundation.length) {
  console.log('\n  Run with --apply to write minimal bootstrap SIL entries.');
  console.log('  Then open each project in Claude Code and say `start` for a real Foundation session.');
}

console.log('');

// ── Bootstrap writer ─────────────────────────────────────────────────────────
function writeBootstrap(project, silPath, mode) {
  const entry = `
## ${today} — Session 1 | Total: null/500 | Velocity: 0 | Debt: →
> **Bootstrap entry** — written by batch-foundation.mjs (${mode}).
> No scores yet. Open this project in Claude Code and say \`start\` for a real Foundation session.
> This entry exists only to confirm Studio OS is applied and the SIL file is wired.

| Category | Score | vs Last | Notes |
|---|---|---|---|
| Dev Health | — | — | Foundation baseline pending |
| Creative Alignment | — | — | Foundation baseline pending |
| Momentum | — | — | Foundation baseline pending |
| Engagement | — | — | Foundation baseline pending |
| Process Quality | — | — | Foundation baseline pending |
| **Total** | **—/500** | | |

**Top win:** Studio OS applied.
**Top gap:** No Foundation session run yet.
**Intent outcome:** N/A — bootstrap only.

**Brainstorm**
1. Run Foundation session to establish real SIL baseline.
2. Fill SOUL.md non-negotiables if not yet done.
3. Define at least 3 Now tasks in TASK_BOARD.

**Committed to TASK_BOARD:** Foundation session — run \`start\` in this repo
`;

  try {
    if (!fs.existsSync(path.dirname(silPath))) {
      fs.mkdirSync(path.dirname(silPath), { recursive: true });
    }

    if (mode === 'missing') {
      // Write a minimal SIL file
      const header = `# Self-Improvement Loop\n\nThis file is the living audit and improvement engine for the project.\nThe Rolling Status header is overwritten each closeout. Entries are append-only — never delete.\n\n---\n\n<!-- rolling-status-start -->\n## Rolling Status (auto-updated each closeout)\nSparkline (last 5 totals): ░░░░░\nAvgs — 3: — | 5: — | 10: — | 25: — | all: —\n  └ 3-session: Dev — | Align — | Momentum — | Engage — | Process —\nVelocity trend: →  |  Protocol velocity: →  |  Debt: →\nMomentum runway: N/A  |  Intent rate: N/A\nLast session: ${today} | Session 1 | Total: — | Velocity: 0 | protocolVelocity: 0\n─────────────────────────────────────────────────────────────────────\n<!-- rolling-status-end -->\n\n---\n`;
      fs.writeFileSync(silPath, header + entry);
    } else {
      // Append to existing file
      fs.appendFileSync(silPath, entry);
    }
    console.log(`   → Bootstrap written to ${silPath}`);
  } catch (e) {
    console.error(`   ✗ Failed to write to ${silPath}: ${e.message}`);
  }
}
