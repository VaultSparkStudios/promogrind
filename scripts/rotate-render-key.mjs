#!/usr/bin/env node
// rotate-render-key.mjs — Vorn Render API key rotation helper.
//
// The deploy hook key `rnd_OSQijzSJCUZE22etoih0xnFI5QZh` is exposed in the
// vaultspark-studio-ops LATEST_HANDOFF.md. This script:
//   1. Checks whether the exposed key is still referenced in any local file
//   2. Verifies whether it responds to a Render API probe (non-destructive)
//   3. Guides the user step-by-step through rotation
//   4. Scans for all hardcoded references that need updating
//
// Rotation requires human action in the Render dashboard (no API for key deletion).
// This script handles the audit + reference-search; you do the dashboard click.
//
// Usage:
//   node scripts/rotate-render-key.mjs
//   node scripts/rotate-render-key.mjs --scan-only      # scan for references, no network
//   node scripts/rotate-render-key.mjs --project <path> # scan specific project root

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));

const SCAN_ONLY    = process.argv.includes('--scan-only');
const TARGET_PROJ  = (() => { const i = process.argv.indexOf('--project'); return i >= 0 ? process.argv[i + 1] : null; })();

const EXPOSED_KEY  = 'rnd_OSQijzSJCUZE22etoih0xnFI5QZh';
const RENDER_PROBE = `https://api.render.com/deploy/${EXPOSED_KEY}?imgURL=probe`;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  RENDER API KEY ROTATION HELPER                      ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`  ⚠ Exposed key: ${EXPOSED_KEY}`);
console.log('  Source: vaultspark-studio-ops LATEST_HANDOFF.md (S46 entry)\n');

// ── 1. Scan for hardcoded references ─────────────────────────────────────────
console.log('── Step 1: Scanning for hardcoded references...\n');

const scanRoots = TARGET_PROJ
  ? [TARGET_PROJ]
  : [root, ...registry.projects
      .filter(p => p.slug !== 'studio-ops' && p.localPath && fs.existsSync(p.localPath))
      .map(p => p.localPath)];

const references = [];
for (const scanRoot of scanRoots) {
  const matches = findReferences(scanRoot, EXPOSED_KEY);
  references.push(...matches.map(m => ({ ...m, projectRoot: scanRoot })));
}

if (references.length === 0) {
  console.log('  ✓ No hardcoded references found in local project files.');
  console.log('    (The key appears only in docs/historical records — rotation is still required.)');
} else {
  console.log(`  ⚠ Found ${references.length} reference(s) to rotate after key change:\n`);
  for (const ref of references) {
    console.log(`    ${ref.file}:${ref.line}  →  ${ref.snippet}`);
  }
}

// ── 2. Probe the key (optional — network call) ────────────────────────────────
if (!SCAN_ONLY) {
  console.log('\n── Step 2: Probing exposed key status (non-destructive)...\n');
  try {
    const res = await fetch(RENDER_PROBE, { method: 'GET', signal: AbortSignal.timeout(8000) });
    if (res.status === 400 || res.status === 422) {
      console.log('  ⚠ Key is STILL ACTIVE — Render accepted the request format.');
      console.log('    Rotate immediately using the steps below.');
    } else if (res.status === 404 || res.status === 401) {
      console.log('  ✓ Key returned 404/401 — may already be rotated or service deleted.');
      console.log('    Verify in Render dashboard before closing this task.');
    } else {
      console.log(`  ? Render returned ${res.status} — manual verification required.`);
    }
  } catch (e) {
    console.log(`  ? Network probe failed (${e.message}) — unable to determine key status.`);
    console.log('    Assume active until verified in dashboard.');
  }
}

// ── 3. Rotation instructions ──────────────────────────────────────────────────
console.log('\n── Step 3: Rotation steps (human action required)\n');
console.log('  1. Open Render dashboard → https://dashboard.render.com/');
console.log('  2. Navigate to the Vorn service (search "vorn" or "joinvorn")');
console.log('  3. Settings → Deploy Hook → click "Regenerate"');
console.log('  4. Copy the NEW deploy hook URL');
console.log('  5. Update any CI workflows or scripts that trigger deploys using the old key');
if (references.length > 0) {
  console.log(`  6. Update ${references.length} hardcoded reference(s) found above`);
}
console.log('  7. Update LATEST_HANDOFF.md — redact/replace the old key in the S46 entry');
console.log('  8. Run `git grep rnd_OSQijzSJCUZE22etoih0xnFI5QZh` across all repos to confirm zero references');
console.log('');

// ── 4. Git grep across all repos for verification ────────────────────────────
console.log('── Step 4: Verification command to run after rotation:\n');
const repoPaths = [root, ...registry.projects
  .filter(p => p.localPath && fs.existsSync(path.join(p.localPath, '.git')))
  .map(p => p.localPath)];

console.log('  Run in each repo:');
for (const repoPath of repoPaths.slice(0, 8)) {
  console.log(`    git -C "${repoPath}" grep -r "${EXPOSED_KEY}" -- . || echo "  clean"`);
}
if (repoPaths.length > 8) console.log(`  ... and ${repoPaths.length - 8} more repos`);

console.log('\n  Or run the all-in-one audit:');
console.log(`    node scripts/rename-drift-audit.mjs --pattern "${EXPOSED_KEY}"\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function findReferences(dir, pattern) {
  const results = [];
  const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache']);
  const SKIP_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.dump', '.lock']);

  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (!content.includes(pattern)) continue;
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(pattern)) {
            results.push({
              file: path.relative(root, full),
              line: i + 1,
              snippet: line.trim().slice(0, 80),
            });
          }
        });
      } catch { /* binary file or permission error */ }
    }
  }

  walk(dir);
  return results;
}
