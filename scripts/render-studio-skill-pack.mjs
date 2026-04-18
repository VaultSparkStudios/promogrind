#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildRuntimeAssignment, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = {
  generatedAt: new Date().toISOString(),
  schemaVersion: '1.0',
  globalSkills: [
    'studio-orchestrate',
    'studio-governance-check',
    'studio-cross-repo-plan',
    'studio-founder-digest',
    'studio-runtime-assign',
    'studio-hotswap-verify',
  ],
  projectSkills: [
    'growth-experiment-pack',
    'brand-compliance-check',
    'staging-readiness-check',
    'launch-readiness-check',
  ],
  runtimePolicy: buildRuntimeAssignment(ROOT).policies,
};

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'STUDIO_SKILL_PACK.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'STUDIO_SKILL_PACK.md'),
  [
    '# Studio Skill Pack',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    '## Global Skills',
    '',
    ...payload.globalSkills.map((item) => `- ${item}`),
    '',
    '## Project Skills',
    '',
    ...payload.projectSkills.map((item) => `- ${item}`),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Studio skill pack → docs/STUDIO_SKILL_PACK.md');
