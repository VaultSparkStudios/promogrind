#!/usr/bin/env node
// migrate-launch-status.mjs
// One-time migration: add launchStatus field to all projects in PROJECT_REGISTRY.json
// Values: "announced" | "deployed-unannounced" | "pre-deploy" | "not-applicable"
// Also fixes corrupted localPath entries for vaultspark-ignis and orva-eon.
// Run: node scripts/migrate-launch-status.mjs

import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const registryPath = path.join(root, 'portfolio', 'PROJECT_REGISTRY.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// launchStatus per slug
// announced            — publicly promoted, social posts made, or community aware
// deployed-unannounced — live/accessible but no formal announcement yet
// pre-deploy           — not yet live / still in development
// not-applicable       — internal tool, archived, or VAULTED/paused with no launch path
const LAUNCH_STATUS = {
  'vaultsparkstudios-website':            'announced',
  'vaultspark-studios-social-dashboard':  'pre-deploy',
  'vaultspark-studio-hub':                'announced',
  'voidfall':                             'pre-deploy',
  'voidfall-companion':                   'pre-deploy',
  'voidfall-build':                       'not-applicable',
  'mindframe':                            'deployed-unannounced',
  'call-of-doodie':                       'deployed-unannounced',
  'football-gm':                          'deployed-unannounced',
  'gridiron-gm':                          'not-applicable',
  'gridiron-gm-play':                     'deployed-unannounced',
  'solara':                               'pre-deploy',
  'vaultfront':                           'pre-deploy',
  'vaultspark-forge':                     'pre-deploy',
  'the-exodus':                           'pre-deploy',
  'statvault':                            'pre-deploy',
  'velaxis':                              'deployed-unannounced',
  'promogrind':                           'deployed-unannounced',
  'cryptomatrix-pro':                     'not-applicable',
  'vorn':                                 'deployed-unannounced',
  'studio-ops':                           'not-applicable',
  'ideaforge':                            'pre-deploy',
  'canon':                                'pre-deploy',
  'living-protocol':                      'pre-deploy',
  'vaultspark-ignis':                     'not-applicable',
  'orva-eon':                             'pre-deploy',
};

// Corrected localPaths for entries with encoding bugs
const LOCALPATH_FIXES = {
  'vaultspark-ignis': 'C:\\Users\\p4cka\\documents\\development\\vaultspark-ignis',
  'orva-eon':         'C:\\Users\\p4cka\\documents\\development\\Orva',
};

let updated = 0;
let fixed = 0;

for (const project of registry.projects) {
  const status = LAUNCH_STATUS[project.slug];
  if (status === undefined) {
    console.warn(`  ⚠  Unknown slug: ${project.slug} — skipping`);
    continue;
  }

  if (project.launchStatus === undefined) {
    project.launchStatus = status;
    updated++;
  }

  const pathFix = LOCALPATH_FIXES[project.slug];
  if (pathFix && project.localPath !== pathFix) {
    project.localPath = pathFix;
    fixed++;
  }
}

// Update schema version and notes
registry.schemaVersion = '2.0';
registry.updatedAt = new Date().toISOString().slice(0, 10);
registry.notes = `v2.0: Added launchStatus field (announced|deployed-unannounced|pre-deploy|not-applicable); fixed localPath encoding for vaultspark-ignis and orva-eon. ${registry.notes}`;

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');

console.log(`\n  ✓  Migration complete`);
console.log(`     launchStatus added: ${updated} project(s)`);
console.log(`     localPath fixed:    ${fixed} project(s)`);
console.log(`     Schema bumped: v1.9 → v2.0`);
console.log(`     File: portfolio/PROJECT_REGISTRY.json\n`);
