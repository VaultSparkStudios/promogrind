#!/usr/bin/env node
// check-foundation-ready.mjs — Scan bootstrapped projects for Foundation session readiness
// Usage:
//   node scripts/check-foundation-ready.mjs
//   node scripts/check-foundation-ready.mjs --project <slug>

import { readFileSync, existsSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, '../portfolio/PROJECT_REGISTRY.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const targetSlug = projectIndex >= 0 ? args[projectIndex + 1] : null;

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

console.log(`\n${BOLD}Foundation Readiness Report — VaultSpark Studios${RESET}`);
console.log(`Checks: SOUL.md, PROJECT_BRIEF.md, TASK_BOARD.md, and rights/copyleft detection\n`);

const candidates = registry.projects.filter(project =>
  project.studioOsApplied &&
  project.status !== 'archived' &&
  project.localPath &&
  (!targetSlug || project.slug === targetSlug)
);

let readyCount = 0;
let notReadyCount = 0;
let inaccessibleCount = 0;

for (const project of candidates) {
  const localPath = project.localPath.replace(/\\\\/g, '/');

  if (!existsSync(localPath)) {
    console.log(`${DIM}  ✗ ${project.name} — localPath not accessible: ${localPath}${RESET}`);
    inaccessibleCount++;
    continue;
  }

  const checks = [];
  let ready = true;

  const soulPath = join(localPath, 'context/SOUL.md');
  if (!existsSync(soulPath)) {
    checks.push(`${RED}✗ SOUL.md missing${RESET}`);
    ready = false;
  } else {
    const soul = readFileSync(soulPath, 'utf8');
    const hasReal = soul.includes('non-negotiable') ||
      (soul.length > 200 && !soul.includes('__NON_NEGOTIABLE') && !soul.includes('[Fill in'));
    if (!hasReal) {
      checks.push(`${YELLOW}⚠ SOUL.md appears template-only${RESET}`);
      ready = false;
    } else {
      checks.push(`${GREEN}✓ SOUL.md${RESET}`);
    }
  }

  const briefPath = join(localPath, 'context/PROJECT_BRIEF.md');
  if (!existsSync(briefPath)) {
    checks.push(`${RED}✗ PROJECT_BRIEF.md missing${RESET}`);
    ready = false;
  } else {
    const brief = readFileSync(briefPath, 'utf8');
    const hasReal = brief.length > 300 && !brief.includes('__PROJECT_NAME__');
    if (!hasReal) {
      checks.push(`${YELLOW}⚠ PROJECT_BRIEF.md appears template-only${RESET}`);
      ready = false;
    } else {
      checks.push(`${GREEN}✓ PROJECT_BRIEF.md${RESET}`);
    }
  }

  const taskboardPath = join(localPath, 'context/TASK_BOARD.md');
  if (!existsSync(taskboardPath)) {
    checks.push(`${RED}✗ TASK_BOARD.md missing${RESET}`);
    ready = false;
  } else {
    const taskboard = readFileSync(taskboardPath, 'utf8');
    const nowSection = taskboard.split(/^## Next/m)[0].split(/^## Now/m)[1] || '';
    const realTasks = nowSection.split('\n').filter(line =>
      line.trim().startsWith('- [ ]') && line.length > 10 && !line.includes('__')
    );
    if (realTasks.length === 0) {
      checks.push(`${YELLOW}⚠ TASK_BOARD Now bucket empty or template-only${RESET}`);
      ready = false;
    } else {
      checks.push(`${GREEN}✓ TASK_BOARD (${realTasks.length} Now tasks)${RESET}`);
    }
  }

  const rightsPath = join(localPath, 'docs/RIGHTS_PROVENANCE.md');
  const rights = existsSync(rightsPath) ? readFileSync(rightsPath, 'utf8') : '';
  const copyleftSignals = detectCopyleftSignals(localPath);

  if (!existsSync(rightsPath)) {
    checks.push(`${YELLOW}⚠ docs/RIGHTS_PROVENANCE.md missing${RESET}`);
  } else if (rights.includes('Proprietary') || rights.includes('AGPL') || rights.includes('GPL')) {
    checks.push(`${GREEN}✓ RIGHTS_PROVENANCE.md present${RESET}`);
  } else {
    checks.push(`${YELLOW}⚠ RIGHTS_PROVENANCE.md present but license summary is unclear${RESET}`);
  }

  if (copyleftSignals.length > 0) {
    const rightsMentionsSignal = copyleftSignals.some(signal => rights.toUpperCase().includes(signal.licenseToken));
    if (!rightsMentionsSignal) {
      checks.push(`${RED}✗ Copyleft signal detected (${copyleftSignals.map(signal => signal.label).join(', ')}) but RIGHTS_PROVENANCE.md does not document it${RESET}`);
      ready = false;
    } else {
      checks.push(`${GREEN}✓ Copyleft signal documented (${copyleftSignals.map(signal => signal.label).join(', ')})${RESET}`);
    }
  } else {
    checks.push(`${DIM}· No copyleft signal detected${RESET}`);
  }

  const statusIcon = ready ? `${GREEN}READY${RESET}` : `${YELLOW}NOT READY${RESET}`;
  console.log(`  ${project.name} [${project.vaultStatus?.toUpperCase()}] — ${statusIcon}`);
  checks.forEach(check => console.log(`    ${check}`));
  console.log('');

  if (ready) readyCount++;
  else notReadyCount++;
}

console.log(`${BOLD}Summary${RESET}`);
console.log(`  Foundation-ready    : ${GREEN}${readyCount}${RESET}`);
console.log(`  Not ready           : ${YELLOW}${notReadyCount}${RESET}`);
console.log(`  Inaccessible        : ${DIM}${inaccessibleCount}${RESET}\n`);

function detectCopyleftSignals(localPath) {
  const signals = [];
  const seen = new Set();

  function addSignal(label, licenseToken) {
    const key = `${label}|${licenseToken}`;
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({ label, licenseToken });
  }

  try {
    const remotes = execFileSync('git', ['-C', localPath, 'remote', '-v'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (/openfrontio/i.test(remotes) || /openfront/i.test(remotes)) {
      addSignal('git remote suggests OpenFront fork', 'AGPL');
    }
    if (/\bagpl\b/i.test(remotes)) addSignal('git remote includes AGPL token', 'AGPL');
    if (/\blgpl\b/i.test(remotes)) addSignal('git remote includes LGPL token', 'LGPL');
    if (/(^|[^A-Z])gpl([^A-Z]|$)/i.test(remotes)) addSignal('git remote includes GPL token', 'GPL');
  } catch {}

  for (const fileName of ['package.json', 'LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    const filePath = join(localPath, fileName);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    if (/\bAGPL\b/i.test(content)) addSignal(`${fileName} mentions AGPL`, 'AGPL');
    if (/\bLGPL\b/i.test(content)) addSignal(`${fileName} mentions LGPL`, 'LGPL');
    if (/(^|[^A-Z])GPL([^A-Z]|$)/i.test(content)) addSignal(`${fileName} mentions GPL`, 'GPL');
  }

  try {
    const docsDir = join(localPath, 'docs');
    if (existsSync(docsDir)) {
      const docHits = readdirSync(docsDir)
        .filter(name => /rights|provenance|license/i.test(name))
        .map(name => readFileSync(join(docsDir, name), 'utf8'))
        .join('\n');
      if (/\bAGPL\b/i.test(docHits)) addSignal('docs mention AGPL', 'AGPL');
      if (/\bLGPL\b/i.test(docHits)) addSignal('docs mention LGPL', 'LGPL');
      if (/(^|[^A-Z])GPL([^A-Z]|$)/i.test(docHits)) addSignal('docs mention GPL', 'GPL');
    }
  } catch {}

  return signals;
}
