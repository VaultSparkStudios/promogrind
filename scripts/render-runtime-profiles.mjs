#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_MD = path.join(ROOT, 'docs', 'RUNTIME_PROFILES.md');
const OUT_JSON = path.join(ROOT, 'portfolio', 'compiled', 'RUNTIME_PROFILES.json');
const jsonMode = process.argv.includes('--json');

const profiles = [
  { id: 'internal-ops', defaults: ['full start/go/closeout', 'high protocol strictness', 'all truth surfaces required', 'MCP-first integrations'] },
  { id: 'internal-tool', defaults: ['full protocol', 'lighter launch ceremony', 'testing surfaces required', 'runtime-pack encouraged'] },
  { id: 'public-product', defaults: ['full protocol', 'strict branding/staging/sanitization', 'launch and release-gate surfaces mandatory'] },
  { id: 'private-beta', defaults: ['full protocol', 'lighter public-launch ceremony', 'release-gate before SPARKED transition'] },
  { id: 'companion-repo', defaults: ['lighter enforcement profile', 'core truth files required', 'reduced ceremony where portfolio impact is low'] },
];

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'render-runtime-profiles.mjs',
  profiles,
};

if (jsonMode) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const lines = [
  '# Runtime Profiles',
  '',
  `> Generated: ${payload.generatedAt.slice(0, 10)}`,
  '',
  'Studio OS uses one shared protocol with profile-based strictness, not separate protocol forks.',
  '',
];

for (const profile of profiles) {
  lines.push(`## ${profile.id}`);
  lines.push('');
  for (const item of profile.defaults) lines.push(`- ${item}`);
  lines.push('');
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
fs.writeFileSync(OUT_MD, lines.join('\n'));
console.log('✓ Runtime profiles → docs/RUNTIME_PROFILES.md');
