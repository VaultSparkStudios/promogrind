#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { buildFounderDigest, writeJson, writeText } from './lib/portfolio-surfaces.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');
const payload = buildFounderDigest(ROOT);

writeJson(path.join(ROOT, 'portfolio', 'compiled', 'FOUNDER_DIGEST_5.json'), payload);
writeText(
  path.join(ROOT, 'docs', 'FOUNDER_DIGEST_5.md'),
  [
    '# Founder Digest 5',
    '',
    `> Generated: ${payload.generatedAt.slice(0, 10)}`,
    '',
    '## Must Know',
    '',
    ...payload.mustKnow.map((item, index) => `${index + 1}. **${item.title}** — ${item.action}`),
    '',
    '## Strategic Bet',
    '',
    `- ${payload.strategicBet}`,
    '',
  ].join('\n'),
);

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else console.log('✓ Founder digest → docs/FOUNDER_DIGEST_5.md');
