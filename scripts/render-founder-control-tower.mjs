#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildControlTower, markdownTable, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildControlTower(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_CONTROL_TOWER.json'), payload);

const sessions = markdownTable(
  ['Slug', 'Agent', 'Age', 'Stale'],
  payload.activeSessions.map((item) => [item.slug, item.agent, item.ageHuman, String(item.stale)]),
);

writeText(
  path.join(ROOT, 'docs', 'FOUNDER_CONTROL_TOWER.md'),
  [
    '# Founder Control Tower',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    `- Best next founder action: **${payload.bestNextFounderAction}**`,
    `- Best next agent action: **${payload.bestNextAgentAction}**`,
    '',
    '## Active Sessions',
    '',
    sessions,
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Founder control tower → docs/FOUNDER_CONTROL_TOWER.md');
