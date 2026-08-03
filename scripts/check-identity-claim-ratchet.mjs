#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateIdentityClaimRatchet } from './lib/identity-claim-ratchet.mjs';

const root = process.cwd();
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const { IDENTITY_ARCHITECTURE } = await import(pathToFileURL(path.join(root, 'src/data/identityArchitecture.js')).href);
const result = evaluateIdentityClaimRatchet({
  contract: IDENTITY_ARCHITECTURE,
  projectStatus: readJson('context/PROJECT_STATUS.json'),
  studioManifest: readJson('context/STUDIO_MANIFEST.json'),
  agents: readJson('public/agents.json'),
  surfaces: {
    'src/components/AuthDialog.jsx': readText('src/components/AuthDialog.jsx'),
    'src/ObeliskLogin.jsx': readText('src/ObeliskLogin.jsx'),
    'src/obelisk-callback.js': readText('src/obelisk-callback.js'),
  },
});

if (process.argv.includes('--write-receipt')) {
  const output = path.join(root, 'audits/identity-architecture-latest.json');
  fs.writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), ...result }, null, 2)}\n`);
}
if (process.argv.includes('--json')) console.log(JSON.stringify(result));
else {
  console.log(`identity claim ratchet · ${result.comparisons.length} cross-surface assertions · ${result.ok ? 'PASS' : 'FAIL'}`);
  for (const error of result.errors) console.log(`  - ${error}`);
}
process.exit(result.ok ? 0 : 1);
