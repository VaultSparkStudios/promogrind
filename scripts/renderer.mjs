#!/usr/bin/env node
/**
 * renderer.mjs — single-entry view dispatcher (S79)
 *
 * Routes view names through scripts/lib/view-registry.mjs to the canonical
 * renderer script. Replaces the pattern of remembering which render-* script
 * produces which artifact.
 *
 * Also supports "fan-out" mode — given a source file, re-render every view
 * that reads it. This prevents the parser-drift class of bug by ensuring
 * all downstream surfaces are consistent with any source-of-truth change.
 *
 * Usage:
 *   node scripts/renderer.mjs <view>                   # render one view
 *   node scripts/renderer.mjs --list                   # list all views
 *   node scripts/renderer.mjs --describe <view>        # view detail
 *   node scripts/renderer.mjs --fanout <source>        # re-render all views reading <source>
 *   node scripts/renderer.mjs --graph                  # print source → view → output DAG
 *
 * Exit codes:
 *   0 — all renders succeeded
 *   1 — one or more renders failed
 *   2 — usage error
 */

import { spawnSync } from './lib/safe-spawn.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VIEWS, viewsReading } from './lib/view-registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

function usage(msg) {
  if (msg) process.stderr.write(`renderer: ${msg}\n\n`);
  process.stderr.write(`Usage:
  node scripts/renderer.mjs <view>                # render one view
  node scripts/renderer.mjs --list                # list all views
  node scripts/renderer.mjs --describe <view>     # view detail
  node scripts/renderer.mjs --fanout <source>     # re-render all views reading <source>
  node scripts/renderer.mjs --graph               # source → view → output DAG
`);
  process.exit(2);
}

function runView(name, extraArgs = []) {
  const view = VIEWS[name];
  if (!view) { process.stderr.write(`✗ unknown view: ${name}\n`); return 1; }
  const scriptPath = path.join(ROOT, 'scripts', view.script);
  const isShell = view.script.endsWith('.sh');
  const cmd = isShell ? 'bash' : 'node';
  const cmdArgs = [scriptPath, ...extraArgs];
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit' });
  return r.status ?? 1;
}

if (args.includes('--list')) {
  process.stdout.write('Views available:\n\n');
  for (const [name, v] of Object.entries(VIEWS)) {
    process.stdout.write(`  ${name.padEnd(22)} → ${v.outputs[0]}\n`);
    process.stdout.write(`  ${' '.repeat(22)}   ${v.role} · consumed by: ${v.consumers.join(', ')}\n`);
  }
  process.exit(0);
}

if (args[0] === '--describe') {
  const name = args[1];
  if (!name) usage('--describe requires a view name');
  const view = VIEWS[name];
  if (!view) { process.stderr.write(`unknown view: ${name}\n`); process.exit(1); }
  process.stdout.write(`View: ${name}\n`);
  process.stdout.write(`Script:    ${view.script}\n`);
  process.stdout.write(`Role:      ${view.role}\n`);
  process.stdout.write(`Sources:   ${view.sources.join('\n           ')}\n`);
  process.stdout.write(`Outputs:   ${view.outputs.join('\n           ')}\n`);
  process.stdout.write(`Consumers: ${view.consumers.join(', ')}\n`);
  if (view.notes) process.stdout.write(`Notes:     ${view.notes}\n`);
  process.exit(0);
}

if (args[0] === '--graph') {
  process.stdout.write('Source → View → Output DAG\n\n');
  const sources = new Set();
  for (const v of Object.values(VIEWS)) for (const s of v.sources) sources.add(s);
  for (const src of [...sources].sort()) {
    const consumers = viewsReading(src);
    if (!consumers.length) continue;
    process.stdout.write(`${src}\n`);
    for (const c of consumers) {
      const v = VIEWS[c];
      process.stdout.write(`  └─ ${c.padEnd(22)} → ${v.outputs[0]}\n`);
    }
    process.stdout.write('\n');
  }
  process.exit(0);
}

if (args[0] === '--fanout') {
  const src = args[1];
  if (!src) usage('--fanout requires a source file or glob');
  const views = viewsReading(src);
  if (!views.length) { process.stderr.write(`✗ no views read: ${src}\n`); process.exit(1); }
  process.stdout.write(`Fan-out: re-rendering ${views.length} view(s) that read ${src}\n`);
  let bad = 0;
  for (const name of views) {
    process.stdout.write(`\n── ${name} ──\n`);
    const code = runView(name);
    if (code !== 0) bad++;
  }
  process.exit(bad ? 1 : 0);
}

if (args.length === 0 || args[0].startsWith('--')) usage();

// Single-view invocation: pass remaining args to the underlying script
const [viewName, ...rest] = args;
process.exit(runView(viewName, rest));
