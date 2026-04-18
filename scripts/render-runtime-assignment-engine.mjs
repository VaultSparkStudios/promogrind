#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildRuntimeAssignment, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildRuntimeAssignment(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'RUNTIME_ASSIGNMENT_ENGINE.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'RUNTIME_ASSIGNMENT_ENGINE.md'),
  [
    '# Runtime Assignment Engine',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    '## Policies',
    '',
    ...Object.entries(payload.policies).map(([key, value]) => `- **${key}** — ${value}`),
    '',
    '## Current Assignments',
    '',
    markdownTable(
      ['Task', 'Runtime', 'Category', 'Reason'],
      payload.assignments.map((item) => [item.title, item.runtime, item.category, item.reason]),
    ),
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Runtime assignment engine → docs/RUNTIME_ASSIGNMENT_ENGINE.md');
