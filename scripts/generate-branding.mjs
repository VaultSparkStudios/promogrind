#!/usr/bin/env node
/**
 * generate-branding.mjs
 * Outputs ready-to-paste VaultSpark Studios branding snippets for all projects
 * where brandingRequired=true and brandingCompliant=false.
 *
 * Usage:
 *   node scripts/generate-branding.mjs             # all non-compliant projects
 *   node scripts/generate-branding.mjs call-of-doodie  # specific project slug
 *
 * CANON-006 branding spec: docs/BRANDING_PROTOCOL.md
 */

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'portfolio', 'PROJECT_REGISTRY.json'), 'utf8'));

const filterSlug = process.argv[2] ?? null;

const STUDIO_URL = 'https://vaultsparkstudios.com/';

const TYPE_MAP = {
  game:         { copy: 'A VaultSpark Studios Game', type: 'game' },
  'novel-series': { copy: 'A VaultSpark Studios Production', type: 'novel' },
  novel:        { copy: 'A VaultSpark Studios Production', type: 'novel' },
  app:          { copy: 'Powered by VaultSpark Studios', type: 'app' },
  tool:         { copy: 'Powered by VaultSpark Studios', type: 'app' },
  dashboard:    { copy: 'Powered by VaultSpark Studios', type: 'app' },
  platform:     { copy: 'A VaultSpark Studios Network', type: 'platform' },
  website:      { copy: 'A VaultSpark Studios Network', type: 'platform' },
  default:      { copy: 'VaultSpark Studios', type: 'generic' },
};

function getTypeInfo(medium) {
  return TYPE_MAP[medium] ?? TYPE_MAP.default;
}

function htmlSnippet(copy) {
  const [before, after] = copy.split('VaultSpark Studios');
  if (before !== undefined && after !== undefined) {
    return `${before}<a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a>${after}`.trim();
  }
  return `<a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a>`;
}

function jsxSnippet(copy) {
  const [before, after] = copy.split('VaultSpark Studios');
  if (before !== undefined && after !== undefined) {
    const beforeStr = before ? `${before.trim()}{' '}` : '';
    const afterStr = after ? `{' '}${after.trim()}` : '';
    return `${beforeStr}<a href="${STUDIO_URL}" rel="author">\n  VaultSpark Studios\n</a>${afterStr}`.trim();
  }
  return `<a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a>`;
}

function gameInstructions(name) {
  return `For browser games: add a small credit line to the menu/title screen footer or Credits section.
Persistent menu element (recommended):
  <div style="text-align:center;font-size:11px;color:#888;margin-top:8px">
    ${htmlSnippet('A VaultSpark Studios Game')}
  </div>

Credits screen (plain text + URL):
  A VaultSpark Studios Game
  ${STUDIO_URL}`;
}

function appInstructions() {
  return `Add to your footer component (persistent across all pages):

HTML:
  <footer>
    <p>Powered by <a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a></p>
  </footer>

JSX:
  <footer>
    <p>
      Powered by{' '}
      <a href="${STUDIO_URL}" rel="author">
        VaultSpark Studios
      </a>
    </p>
  </footer>`;
}

function platformInstructions() {
  return `Add to your footer or About page:

HTML:
  <footer>
    <p>A <a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a> Network</p>
  </footer>

JSX:
  <footer>
    <p>
      A{' '}
      <a href="${STUDIO_URL}" rel="author">
        VaultSpark Studios
      </a>{' '}
      Network
    </p>
  </footer>`;
}

function novelInstructions() {
  return `Add to copyright page or acknowledgements section:

  A VaultSpark Studios Production
  Published under the VaultSpark Studios imprint.
  ${STUDIO_URL}`;
}

function getInstructions(type, name) {
  switch (type) {
    case 'game':     return gameInstructions(name);
    case 'app':      return appInstructions();
    case 'platform': return platformInstructions();
    case 'novel':    return novelInstructions();
    default:
      return `Add anywhere visible:\n  <a href="${STUDIO_URL}" rel="author">VaultSpark Studios</a>`;
  }
}

const projects = registry.projects.filter((p) => {
  if (p.status === 'archived') return false;
  if (filterSlug && p.slug !== filterSlug) return false;
  const vaultStatus = (p.vaultStatus ?? '').toUpperCase();
  if (vaultStatus === 'VAULTED') return false;
  return p.brandingRequired === true && p.brandingCompliant !== true;
});

if (projects.length === 0) {
  if (filterSlug) {
    console.log(`No branding work needed for "${filterSlug}" (not found, already compliant, or exempt).`);
  } else {
    console.log('All projects with brandingRequired=true are compliant. Nothing to do.');
  }
  process.exit(0);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  VaultSpark Studios Branding Generator — CANON-006');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Projects needing branding: ${projects.length}`);
console.log('  Spec: docs/BRANDING_PROTOCOL.md');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

for (const p of projects) {
  const { copy, type } = getTypeInfo(p.medium);
  const vaultStatus = (p.vaultStatus ?? 'FORGE').toUpperCase();
  const urgency = vaultStatus === 'SPARKED' ? '⛔ URGENT — already SPARKED' : '⚠  needed before SPARKED';

  console.log(`── ${p.name} (${p.slug}) ──`);
  console.log(`   Medium:      ${p.medium}`);
  console.log(`   VaultStatus: ${vaultStatus}  [${urgency}]`);
  console.log(`   Approved copy: "${copy}"`);
  console.log('');
  console.log('   Implementation:');
  console.log(getInstructions(type, p.name).split('\n').map((l) => `   ${l}`).join('\n'));
  console.log('');
  console.log('   After implementing, update PROJECT_REGISTRY.json:');
  console.log(`   { "slug": "${p.slug}", "brandingCompliant": true }`);
  console.log('   Then run: node scripts/render-project-registry.mjs');
  console.log('');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Done. Implement in each project repo, then mark compliant.`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
