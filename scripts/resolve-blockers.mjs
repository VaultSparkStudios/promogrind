#!/usr/bin/env node

/**
 * resolve-blockers.mjs
 *
 * Cross-repo blocker auto-resolver. Detects and resolves:
 *   1. Stale session locks (>12h old) — deletes the lock file
 *   2. Remote-ahead states — prints git commands to reconcile
 *   3. Reports unresolvable blockers for human action
 *
 * Run: node scripts/resolve-blockers.mjs [--fix]
 *   --fix: actually resolve (delete stale locks, pull remote-ahead repos)
 *   without --fix: dry-run, reports only
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));
const fix = process.argv.includes('--fix');
const now = Date.now();
const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

const activeProjects = registry.projects.filter((p) => p.status !== 'archived' && p.studioOsApplied && p.localPath);

let staleLocks = 0;
let remoteAhead = 0;
let fixed = 0;
let errors = 0;

console.log(`Cross-repo blocker scan (${fix ? 'FIX MODE' : 'DRY RUN'}):`);
console.log(`Scanning ${activeProjects.length} applied projects...\n`);

for (const project of activeProjects) {
  const localPath = project.localPath;
  if (!fs.existsSync(localPath)) {
    console.log(`  [skip] ${project.name} — local path not found: ${localPath}`);
    continue;
  }

  // Check session lock
  const lockPath = path.join(localPath, 'context', '.session-lock');
  if (fs.existsSync(lockPath)) {
    const stat = fs.statSync(lockPath);
    const age = now - stat.mtimeMs;
    const ageHours = (age / 3600000).toFixed(1);

    if (age > STALE_THRESHOLD_MS) {
      staleLocks++;
      console.log(`  [STALE LOCK] ${project.name} — lock is ${ageHours}h old`);
      if (fix) {
        try {
          fs.unlinkSync(lockPath);
          console.log(`    -> Deleted stale lock`);
          fixed++;
        } catch (err) {
          console.log(`    -> FAILED to delete: ${err.message}`);
          errors++;
        }
      } else {
        console.log(`    -> Would delete (run with --fix)`);
      }
    } else {
      console.log(`  [active lock] ${project.name} — lock is ${ageHours}h old (within threshold)`);
    }
  }

  // Check remote-ahead state
  try {
    const behindCount = execSync(
      `git -C "${localPath}" rev-list --count HEAD..@{u}`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    if (parseInt(behindCount, 10) > 0) {
      remoteAhead++;
      console.log(`  [REMOTE AHEAD] ${project.name} — ${behindCount} commit(s) behind remote`);
      if (fix) {
        try {
          const dirty = execSync(
            `git -C "${localPath}" status --porcelain`,
            { encoding: 'utf8', timeout: 10000 }
          ).trim();
          if (dirty) {
            console.log(`    -> Skipped pull — repo has uncommitted changes (manual reconciliation required)`);
            console.log(`       Run: cd "${localPath}" && git status`);
            errors++;
          } else {
            execSync(`git -C "${localPath}" pull --ff-only`, { encoding: 'utf8', timeout: 30000 });
            console.log(`    -> Pulled successfully (fast-forward)`);
            fixed++;
          }
        } catch (pullErr) {
          console.log(`    -> Fast-forward pull FAILED — manual reconciliation needed`);
          console.log(`       Run: cd "${localPath}" && git pull`);
          errors++;
        }
      } else {
        console.log(`    -> Would pull --ff-only (run with --fix)`);
      }
    }
  } catch {
    // No upstream tracking or git error — skip silently
  }

  // Check for unpushed local commits
  try {
    const aheadCount = execSync(
      `git -C "${localPath}" rev-list --count @{u}..HEAD`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    if (parseInt(aheadCount, 10) > 0) {
      console.log(`  [LOCAL AHEAD] ${project.name} — ${aheadCount} unpushed commit(s)`);
      if (fix) {
        console.log(`    -> Skipped (push requires explicit user action)`);
      } else {
        console.log(`    -> Would need: cd "${localPath}" && git push`);
      }
    }
  } catch {
    // No upstream tracking — skip
  }
}

console.log(`\n--- Summary ---`);
console.log(`Stale locks found: ${staleLocks}`);
console.log(`Remote-ahead repos: ${remoteAhead}`);
if (fix) {
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
}
