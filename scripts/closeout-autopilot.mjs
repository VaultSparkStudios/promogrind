#!/usr/bin/env node
/**
 * closeout-autopilot.mjs — Studio Ops closeout autopilot (v3.1)
 *
 * Replaces the manual multi-step closeout ceremony with one guided run:
 *   1. doctor --loop
 *   2. Refresh startup brief for next session
 *   3. Update PROJECT_STATUS.json lastUpdated + currentSession
 *   3c. Run rotation tripwire / audit freshness check
 *   4. git status + diff preview (excluding secrets/)
 *   5. *** HUMAN CONFIRMATION *** — "Commit + push all of the above? [Y/n/dry]"
 *   6. git add (filtered), git commit (conventional message), git push
 *   7. Clear .session-lock + beacon
 *   8. Print Closeout Status Board
 *
 * Usage:
 *   node scripts/closeout-autopilot.mjs                 # full run with confirm
 *   node scripts/closeout-autopilot.mjs --dry-run       # show plan, skip writes
 *   node scripts/closeout-autopilot.mjs --skip-push     # commit only, no push
 *   node scripts/closeout-autopilot.mjs --message "..."
 *
 * IMPORTANT: This script does NOT overwrite the human's context/*.md edits.
 * It expects the agent to have already updated CURRENT_STATE, TASK_BOARD,
 * LATEST_HANDOFF, DECISIONS, SIL, CDR, WORK_LOG per prompts/closeout.md.
 * This script is the ceremony — docs/write-back is the agent's job.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { redact } from './lib/secrets.mjs';
import { appendEvent } from './lib/studio-events.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SKIP_PUSH = args.includes('--skip-push');
const AUTO_YES = args.includes('--yes');
const RESPECT_STAGED = args.includes('--respect-staged');
const msgIdx = args.indexOf('--message');
const CUSTOM_MSG = msgIdx >= 0 ? args[msgIdx + 1] : null;
const projectIdx = args.indexOf('--project');
const projectArg = projectIdx >= 0 ? args[projectIdx + 1] : null;
const PROJECT_ROOT = projectArg
  ? path.resolve(process.cwd(), projectArg)
  : STUDIO_ROOT;
const STATUS_PATH = path.join(PROJECT_ROOT, 'context', 'PROJECT_STATUS.json');
const LOCK_PATH = path.join(PROJECT_ROOT, 'context', '.session-lock');
const BEACON_PATH = path.join(PROJECT_ROOT, '.claude', 'beacon.env');

function sh(cmd, opts = {}) {
  const r = spawnSync(cmd, { shell: true, cwd: PROJECT_ROOT, encoding: 'utf8', ...opts });
  return { out: r.stdout || '', err: r.stderr || '', code: r.status ?? -1 };
}

function shStudio(script, scriptArgs = [], opts = {}) {
  const r = spawnSync(process.execPath, [path.join(STUDIO_ROOT, 'scripts', script), ...scriptArgs], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    ...opts,
  });
  return { out: r.stdout || '', err: r.stderr || '', code: r.status ?? -1 };
}

function sessionNumber(status) {
  return status.currentSession ?? status.lastSession ?? '?';
}

function header(title) {
  const bar = '═'.repeat(64);
  console.log(`\n╔${bar}╗`);
  console.log(`║  ${title.padEnd(62)}║`);
  console.log(`╚${bar}╝\n`);
}

async function prompt(question, defaultYes = true) {
  if (DRY) { console.log(`(dry-run) would prompt: ${question}`); return defaultYes; }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} ${defaultYes ? '[Y/n/dry]' : '[y/N/dry]'}: `, answer => {
      rl.close();
      const a = (answer || '').trim().toLowerCase();
      if (a === 'dry') resolve('dry');
      else if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

// ── Step 1: doctor --loop ────────────────────────────────────────────────────
header('Step 1 · Doctor --loop (self-healing)');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'run-doctor.mjs')} --loop --update-json`);
} else {
  const r = shStudio('run-doctor.mjs', ['--loop', '--update-json'], { stdio: 'inherit' });
  if (r.code !== 0) {
    console.error('⚠ Doctor failed — closeout aborted. Fix issues then re-run.');
    process.exit(1);
  }
}

// ── Step 2: Refresh startup brief ────────────────────────────────────────────
header('Step 2 · Refresh startup brief for next session');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'render-startup-brief.mjs')}`);
} else {
  const r = shStudio('render-startup-brief.mjs');
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Brief render failed:', redact(r.err));
    console.error('Continuing — check brief manually.');
  }
}

// ── Step 2b: Trim LATEST_HANDOFF to last 2 sessions ─────────────────────────
header('Step 2b · Trim LATEST_HANDOFF (auto-archive sessions > 2)');
if (DRY) {
  console.log(`(dry-run) would run: node compact-handoff.mjs --trim`);
} else {
  const r = shStudio('compact-handoff.mjs', ['--trim']);
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Handoff trim failed (non-fatal):', redact(r.err));
  }
}

// ── Step 3: Stamp PROJECT_STATUS.json lastUpdated ────────────────────────────
header('Step 3 · Stamp PROJECT_STATUS.json');
try {
  const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  s.lastUpdated = today;
  if (!DRY) fs.writeFileSync(STATUS_PATH, JSON.stringify(s, null, 2) + '\n');
  console.log(`  lastUpdated → ${today}  · session ${sessionNumber(s)}  · SIL ${s.silScore}/${s.silMax ?? 500}`);
} catch (e) {
  console.error('  ⚠ Could not stamp status:', e.message);
}

// ── Step 3b: Sanitize .claude/settings.local.json before diff ────────────────
header('Step 3b · Sanitize .claude/settings.local.json');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'sanitize-claude-settings.mjs')} --path ${path.join(PROJECT_ROOT, '.claude', 'settings.local.json')}`);
} else {
  const r = shStudio('sanitize-claude-settings.mjs', ['--path', path.join(PROJECT_ROOT, '.claude', 'settings.local.json')]);
  process.stdout.write(r.out);
  if (r.code !== 0) {
    console.error('⚠ Settings sanitizer failed:', redact(r.err));
    console.error('Aborting — fix the sanitizer before continuing.');
    process.exit(1);
  }
}

// ── Step 3c: Rotation tripwire before diff ──────────────────────────────────
header('Step 3c · Rotation tripwire');
if (DRY) {
  console.log(`(dry-run) would run: node ${path.join(STUDIO_ROOT, 'scripts', 'rotation-tripwire.mjs')} --auto-refresh`);
} else {
  const r = shStudio('rotation-tripwire.mjs', ['--auto-refresh'], { stdio: 'inherit' });
  if (r.code !== 0) {
    console.warn('⚠ rotation-tripwire reported warnings; continuing to pre-push checks.');
  }
}

// ── Step 4: git status + diff preview ────────────────────────────────────────
header('Step 4 · Git status + change preview');
const status = sh('git status --short').out;
if (!status.trim()) {
  console.log('  No changes — nothing to commit.');
  if (!SKIP_PUSH) {
    const aheadRes = sh('git rev-list --count @{u}..HEAD 2>/dev/null').out.trim() || '0';
    if (Number(aheadRes) > 0 && !DRY) {
      console.log(`  ${aheadRes} unpushed commit(s) — pushing…`);
      const p = sh('git push');
      console.log(redact(p.out + p.err));
    }
  }
  // Clear locks even on empty closeout
  if (!DRY && fs.existsSync(LOCK_PATH)) { fs.unlinkSync(LOCK_PATH); console.log('  ✓ Session lock cleared'); }
  process.exit(0);
}
console.log(redact(status));
const diff = sh('git diff --stat').out;
console.log('\nDiff stat:');
console.log(redact(diff.split('\n').slice(0, 20).join('\n')));

// ── Guard: any secrets/ path in diff? ────────────────────────────────────────
if (/^[\sMADRCU?]+secrets\//m.test(status)) {
  console.error('\n⛔ ABORT: changes detected under secrets/. Aborting to prevent accidental commit.');
  console.error('  If this is intentional, hand-commit with `git add <file>` first.');
  process.exit(2);
}

// ── Step 5: Confirm ──────────────────────────────────────────────────────────
header('Step 5 · Confirm commit + push');
const suggestedMsg = CUSTOM_MSG || (() => {
  const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const focus = (s.currentFocus || 'session closeout').slice(0, 60);
  return `chore(S${sessionNumber(s)}): ${focus}`;
})();
console.log(`  Suggested message:  ${suggestedMsg}\n`);
const confirm = AUTO_YES ? true : await prompt('  Commit + push the above?', true);
if (confirm === false) { console.log('  Aborted.'); process.exit(0); }
if (confirm === 'dry') { console.log('  Dry-run mode selected — no changes written.'); process.exit(0); }

// ── Step 6: Commit ───────────────────────────────────────────────────────────
header('Step 6 · Commit');
if (DRY) {
  console.log(RESPECT_STAGED
    ? `(dry-run) would: git commit -m "${suggestedMsg}"  (respecting current staged set)`
    : `(dry-run) would: git add -A :!secrets/  &&  git commit -m "${suggestedMsg}"`);
} else {
  if (!RESPECT_STAGED) {
    sh('git add -A -- . ":!secrets/" ":!.claude/worktrees/"');
  }
  const c = sh(`git commit -m ${JSON.stringify(suggestedMsg)}`);
  console.log(redact(c.out || c.err));
  if (c.code !== 0) { console.error('  ⚠ Commit failed.'); process.exit(3); }
}

// ── Step 7: Push ─────────────────────────────────────────────────────────────
if (!SKIP_PUSH) {
  header('Step 7 · Push');
  if (DRY) {
    console.log('(dry-run) would: git push');
  } else {
    const p = sh('git push');
    console.log(redact(p.out + p.err));
    if (p.code !== 0) { console.error('  ⚠ Push failed — commit succeeded, retry `git push` manually.'); }
  }
}

// ── Step 8: Clear session lock + beacon ──────────────────────────────────────
header('Step 8 · Clear session lock + beacon');
if (!DRY) {
  if (fs.existsSync(LOCK_PATH)) { fs.unlinkSync(LOCK_PATH); console.log('  ✓ context/.session-lock cleared'); }
  if (fs.existsSync(BEACON_PATH)) {
    sh(`[ -f .claude/beacon.env ] && source .claude/beacon.env && printf '{"active":[]}' | gh gist edit "$BEACON_GIST_ID" -f active.json --filename active.json 2>/dev/null || true`);
    console.log('  ✓ Beacon cleared (best-effort)');
  }
}

// ── Step 9: Status board ─────────────────────────────────────────────────────
header('Closeout Complete');
const sha = sh('git rev-parse --short HEAD').out.trim();
const branch = sh('git rev-parse --abbrev-ref HEAD').out.trim();
const pushedState = SKIP_PUSH ? 'no (--skip-push)' : DRY ? 'dry-run' : 'yes';
const summary = shStudio('closeout-summary.mjs', [
  '--project', PROJECT_ROOT,
  '--pushed', pushedState,
  '--message', suggestedMsg,
]);
if (summary.code === 0 && summary.out.trim()) {
  console.log(summary.out);
} else {
  console.log(`  Branch:  ${branch}`);
  console.log(`  HEAD:    ${sha}`);
  console.log(`  Message: ${suggestedMsg}`);
  console.log(`  Pushed:  ${pushedState}`);
  if (summary.err.trim()) console.warn(summary.err.trim());
}

// Stackable portfolio counts + short IGNIS insight for the closeout recap.
try {
  const { loadPortfolioTaskBoards } = await import(path.join(STUDIO_ROOT, 'scripts', 'lib', 'cross-repo-tasks.mjs'));
  const { loadIgnisInsight } = await import(path.join(STUDIO_ROOT, 'scripts', 'lib', 'ignis-insight.mjs'));
  const port = loadPortfolioTaskBoards({ studioRoot: STUDIO_ROOT, currentRepoPath: PROJECT_ROOT });
  if (port?.totals) {
    console.log('');
    console.log('  Portfolio task boards:');
    console.log(`    Total ${port.totals.remaining} open · ${port.totals.unblocked} unblocked · ${port.totals.blocked} blocked`);
    console.log(`    Crit ${port.totals.critical} · High ${port.totals.high} · ${port.projectsWithWork}/${port.projectsScanned} repos active`);
  }
  const ig = loadIgnisInsight({ studioRoot: STUDIO_ROOT });
  if (ig?.present) {
    console.log('');
    console.log('  IGNIS insight:');
    if (ig.generated) console.log(`    Synth ${ig.generated} (${ig.daysSinceSynth}d) · ${ig.phase || ''}`);
    if (ig.avgIq) console.log(`    Avg IQ ${ig.avgIq} · Coverage ${ig.coverage || '?'}`);
    if (ig.topProject) console.log(`    Top: ${ig.topProject}`);
    if (ig.topRisk) console.log(`    Top risk: ${ig.topRisk}`);
    if (ig.firstAction) console.log(`    Do next: ${ig.firstAction.slice(0, 120)}`);
  }
} catch { /* best-effort — do not block closeout on insight failure */ }

console.log(`\n✓ Closeout autopilot finished. Startup brief ready for next session.\n`);

if (!DRY) {
  try {
    const s = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
    appendEvent(STUDIO_ROOT, {
      type: 'session-closed',
      slug: s.slug || path.basename(PROJECT_ROOT) || 'studio-ops',
      source: 'closeout-autopilot',
      severity: 'low',
      signal: `${s.slug || path.basename(PROJECT_ROOT) || 'studio-ops'}: session ${sessionNumber(s)} closed`,
      action: null,
      attemptable: false,
      automationStatus: 'completed',
      note: `HEAD ${sha} on ${branch}; SIL ${s.silScore}/500`
    });
  } catch { /* best-effort */ }
}
