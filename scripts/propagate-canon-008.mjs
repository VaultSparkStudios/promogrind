#!/usr/bin/env node
/**
 * propagate-canon-008.mjs — Apply CANON-008 (proprietary by default) to all studioOsApplied projects
 *
 * For each project this script:
 *   1. Adds the IP/Licensing section to AGENTS.md (before "Escalate before changing")
 *   2. Creates docs/RIGHTS_PROVENANCE.md if missing (with correct content per project)
 *   3. Appends CANON-008 entry to context/DECISIONS.md if not already present
 *
 * Usage:
 *   node scripts/propagate-canon-008.mjs              # dry-run (default)
 *   node scripts/propagate-canon-008.mjs --apply      # write files
 *   node scripts/propagate-canon-008.mjs --apply --commit  # write + git commit per repo
 *   node scripts/propagate-canon-008.mjs --project vaultfront  # single project
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from './lib/safe-spawn.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUDIO_OPS_ROOT = join(__dirname, '..');
const REGISTRY_PATH = join(STUDIO_OPS_ROOT, 'portfolio', 'PROJECT_REGISTRY.json');

// Parse flags
const DRY_RUN = !process.argv.includes('--apply');
const DO_COMMIT = process.argv.includes('--commit');
const SINGLE_PROJECT = (() => {
  const idx = process.argv.indexOf('--project');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// Projects with upstream copyleft obligations
const COPYLEFT_EXCEPTIONS = {
  vaultfront: {
    upstreamName: 'OpenFrontIO',
    upstreamRepo: 'https://github.com/openfrontio/OpenFrontIO',
    upstreamLicense: 'AGPL-3.0',
    obligation: 'Fork of OpenFrontIO (AGPL-3.0). Base code must remain AGPL-3.0 under copyleft. Source must be publicly available to any network user. VaultSpark-original additions that do not derive from AGPL code may be kept proprietary.',
  },
};

// ── Content generators ────────────────────────────────────────────────────────

function agentsIpSection() {
  return `## IP and Licensing (CANON-008)

All VaultSpark Studios code, content, assets, and designs are **proprietary by default**. All rights are reserved by VaultSpark Studios LLC unless a license is explicitly declared and approved by the Studio Owner.

**Agent rules:**
- Never add a \`LICENSE\` file with open-source terms unless explicitly instructed by the Studio Owner
- Never label a page, readme, or doc as "open source" for VaultSpark-original work
- Attribution/compliance pages on public sites must use proprietary-first language
- \`docs/RIGHTS_PROVENANCE.md\` default: \`License: Proprietary — All Rights Reserved, VaultSpark Studios LLC\`

**Exceptions (legal obligations — not discretionary):**
Any project forked from a copyleft-licensed upstream must declare its license in \`context/DECISIONS.md\` and \`docs/RIGHTS_PROVENANCE.md\`. Check \`docs/RIGHTS_PROVENANCE.md\` for this project's obligations.

Full decision: \`vaultspark-studio-ops/docs/STUDIO_CANON.md\` → CANON-008

---

`;
}

function rightsProvenanceContent(slug, name) {
  const exception = COPYLEFT_EXCEPTIONS[slug];

  if (exception) {
    return `# Rights and Provenance — ${name}

## Ownership summary

- Project owner: VaultSpark Studios LLC
- IP owner: VaultSpark Studios LLC (VaultSpark-original contributions only)
- Default license: **AGPL-3.0** — copyleft obligation from upstream fork (see below)
- License exceptions: Upstream copyleft — AGPL-3.0 applies to derived code

## Upstream license obligation

- Upstream project: **${exception.upstreamName}**
- Upstream repo: ${exception.upstreamRepo}
- Upstream license: **${exception.upstreamLicense}**
- Obligation: ${exception.obligation}
- Required: Source code must be publicly accessible to any user accessing the service over a network (AGPL network copyleft clause)

## VaultSpark-original content

Assets, levels, gameplay systems, and code created entirely by VaultSpark Studios without derivation from upstream AGPL code may be treated as proprietary. Document any such additions here with clear provenance.

| Asset or concept | Origin | Created by | Date | License note |
|---|---|---|---|---|
| *(add entries as original content is created)* | | | | |

---

*Updated: 2026-04-06 | CANON-008*
`;
  }

  return `# Rights and Provenance — ${name}

## Ownership summary

- Project owner: VaultSpark Studios LLC
- IP owner: VaultSpark Studios LLC
- Default license: **Proprietary — All Rights Reserved, VaultSpark Studios LLC** (CANON-008)
- License exceptions: *(none — list any upstream copyleft obligations here if they arise)*

## Third-party assets and dependencies

| Asset or concept | Origin | Created by | Date | Ownership or license note |
|---|---|---|---|---|
| *(add entries for any licensed third-party assets, fonts, libraries with non-standard terms)* | | | | |

---

*Updated: 2026-04-06 | CANON-008*
`;
}

function decisionsCanon008Entry() {
  return `
## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — \`docs/RIGHTS_PROVENANCE.md\` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** \`vaultspark-studio-ops/docs/STUDIO_CANON.md\` → CANON-008

---
`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function write(path, content, label) {
  if (DRY_RUN) {
    console.log(`    [dry-run] would write ${label}`);
    return;
  }
  writeFileSync(path, content, 'utf8');
  console.log(`    ✓ wrote ${label}`);
}

function append(path, content, label) {
  if (DRY_RUN) {
    console.log(`    [dry-run] would append to ${label}`);
    return;
  }
  const existing = readFileSync(path, 'utf8');
  writeFileSync(path, existing + content, 'utf8');
  console.log(`    ✓ appended to ${label}`);
}

function commitRepo(repoPath, message) {
  if (DRY_RUN) return;
  try {
    execSync('git add -A', { cwd: repoPath, stdio: 'pipe' });
    execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: 'pipe' });
    console.log(`    ✓ committed: ${message}`);
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('nothing to commit')) {
      console.log(`    → nothing to commit`);
    } else {
      console.log(`    ✗ commit failed: ${msg.split('\n')[0]}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const projects = Array.isArray(registry.projects) ? registry.projects
  : Array.isArray(registry) ? registry
  : Object.values(registry);

const targets = projects.filter(p =>
  p.studioOsApplied &&
  p.slug !== 'studio-ops' &&
  (!SINGLE_PROJECT || p.slug === SINGLE_PROJECT)
);

console.log('════════════════════════════════════════════════');
console.log('  CANON-008 Propagation — Proprietary by Default');
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (--apply to write)' : 'APPLY'}${DO_COMMIT ? ' + COMMIT' : ''}`);
console.log(`  Targets: ${targets.length} projects`);
console.log('════════════════════════════════════════════════\n');

let applied = 0;
let skipped = 0;
let missing = 0;
let errors = 0;

for (const project of targets) {
  const { slug, name, localPath } = project;
  const displayName = name || slug;

  process.stdout.write(`  ${displayName} (${slug})\n`);

  if (!localPath || !existsSync(localPath)) {
    console.log(`    ✗ localPath not found: ${localPath}`);
    missing++;
    continue;
  }

  let changed = false;

  // ── 1. AGENTS.md — add IP/Licensing section ──────────────────────────────
  const agentsPath = join(localPath, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const agentsContent = readFileSync(agentsPath, 'utf8');
    if (agentsContent.includes('CANON-008') || agentsContent.includes('IP and Licensing')) {
      console.log(`    → AGENTS.md already has IP/Licensing section`);
    } else {
      // Insert before "Escalate before changing" if present, otherwise append
      const escalateMarker = '## Escalate before changing';
      if (agentsContent.includes(escalateMarker)) {
        const updated = agentsContent.replace(escalateMarker, agentsIpSection() + escalateMarker);
        if (!DRY_RUN) writeFileSync(agentsPath, updated, 'utf8');
        console.log(`    ✓ ${DRY_RUN ? '[dry-run] would add' : 'added'} IP/Licensing section to AGENTS.md`);
      } else {
        // Append at end
        if (!DRY_RUN) writeFileSync(agentsPath, agentsContent.trimEnd() + '\n\n' + agentsIpSection(), 'utf8');
        console.log(`    ✓ ${DRY_RUN ? '[dry-run] would append' : 'appended'} IP/Licensing section to AGENTS.md`);
      }
      changed = true;
    }
  } else {
    console.log(`    ⚠ AGENTS.md not found — skipping`);
  }

  // ── 2. docs/RIGHTS_PROVENANCE.md — create if missing ────────────────────
  const docsDir = join(localPath, 'docs');
  const rightsPath = join(docsDir, 'RIGHTS_PROVENANCE.md');
  if (existsSync(rightsPath)) {
    const existing = readFileSync(rightsPath, 'utf8');
    if (existing.includes('CANON-008') || existing.length > 200) {
      console.log(`    → docs/RIGHTS_PROVENANCE.md already populated`);
    } else {
      write(rightsPath, rightsProvenanceContent(slug, displayName), 'docs/RIGHTS_PROVENANCE.md');
      changed = true;
    }
  } else {
    if (!existsSync(docsDir)) {
      if (!DRY_RUN) mkdirSync(docsDir, { recursive: true });
    }
    write(rightsPath, rightsProvenanceContent(slug, displayName), 'docs/RIGHTS_PROVENANCE.md (new)');
    changed = true;
  }

  // ── 3. context/DECISIONS.md — append CANON-008 if missing ───────────────
  const decisionsPath = join(localPath, 'context', 'DECISIONS.md');
  if (existsSync(decisionsPath)) {
    const decisionsContent = readFileSync(decisionsPath, 'utf8');
    if (decisionsContent.includes('CANON-008')) {
      console.log(`    → context/DECISIONS.md already has CANON-008 entry`);
    } else {
      append(decisionsPath, decisionsCanon008Entry(), 'context/DECISIONS.md');
      changed = true;
    }
  } else {
    console.log(`    ⚠ context/DECISIONS.md not found — skipping`);
  }

  // ── 4. Commit if requested ───────────────────────────────────────────────
  if (DO_COMMIT && changed) {
    commitRepo(localPath, 'chore(canon-008): propagate proprietary-by-default IP policy\n\nAdds CANON-008 (studio-ops/docs/STUDIO_CANON.md): all VaultSpark IP is\nproprietary by default. Adds IP/Licensing section to AGENTS.md,\ncreates docs/RIGHTS_PROVENANCE.md, appends DECISIONS.md entry.');
  }

  if (changed) applied++;
  else skipped++;
}

console.log('\n════════════════════════════════════════════════');
console.log(`  Applied: ${applied}  |  Already current: ${skipped}  |  Missing path: ${missing}  |  Errors: ${errors}`);
if (DRY_RUN) {
  console.log('\n  Run with --apply to write changes.');
  console.log('  Run with --apply --commit to write + commit per repo.');
}
console.log('════════════════════════════════════════════════\n');
