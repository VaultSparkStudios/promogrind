#!/usr/bin/env node
// audit-stale-tasks.mjs — Cross-reference open TASK_BOARD items against git log
// Flags items whose description matches a recent commit message (done but not marked)
// Usage: node scripts/audit-stale-tasks.mjs [--apply]

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, '../portfolio/PROJECT_REGISTRY.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const APPLY = process.argv.includes('--apply');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

console.log(`\n${BOLD}Stale Task Audit — VaultSpark Studios${RESET}`);
console.log(`Cross-references open TASK_BOARD items against git log (last 60 commits per repo)`);
if (APPLY) console.log(`${YELLOW}Mode: APPLY — will mark confirmed-stale items${RESET}\n`);
else console.log(`${DIM}Mode: DRY RUN — use --apply to mark items\n${RESET}`);

const candidates = registry.projects.filter(p =>
  p.studioOsApplied && p.status !== 'archived' && p.localPath
);

let totalStale = 0;

for (const p of candidates) {
  const localPath = p.localPath.replace(/\\\\/g, '/');
  const taskboardPath = join(localPath, 'context/TASK_BOARD.md');

  if (!existsSync(localPath) || !existsSync(taskboardPath)) continue;

  // Get recent commit messages
  let commits = '';
  try {
    commits = execSync('git log --oneline -60 --no-merges', { cwd: localPath, encoding: 'utf8' });
  } catch { continue; }

  const commitLines = commits.toLowerCase().split('\n').filter(Boolean);

  // Parse open tasks from TASK_BOARD
  const tb = readFileSync(taskboardPath, 'utf8');
  const openTasks = [];
  const lines = tb.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('- [ ]') && line.length > 10) {
      // Extract task text (strip markdown, labels, etc.)
      const text = line.replace(/^.*- \[ \]\s*/, '').replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();
      if (text.length > 5) {
        openTasks.push({ line: i, text, raw: line });
      }
    }
  }

  if (openTasks.length === 0) continue;

  const stale = [];
  for (const task of openTasks) {
    const words = task.text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const topWords = words.slice(0, 5);
    const matchScore = commitLines.filter(c => topWords.some(w => c.includes(w))).length;
    if (matchScore >= 2) {
      stale.push(task);
    }
  }

  if (stale.length > 0) {
    totalStale += stale.length;
    console.log(`\n${BOLD}${p.name}${RESET} — ${stale.length} potentially stale:`);
    for (const s of stale) {
      console.log(`  ${YELLOW}⚠${RESET} Line ${s.line + 1}: ${s.text.slice(0, 80)}`);
    }
  }
}

if (totalStale === 0) {
  console.log(`\n${GREEN}No stale tasks detected across all projects.${RESET}\n`);
} else {
  console.log(`\n${BOLD}Total potentially stale: ${totalStale}${RESET}`);
  console.log(`Review the items above and manually mark as [x] if confirmed done.\n`);
}
