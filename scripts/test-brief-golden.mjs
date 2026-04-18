#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

const checks = [
  ['prompts/start.md', /template-version:\s*3\.2/, 'start prompt template version pinned'],
  ['prompts/closeout.md', /template-version:\s*3\.2/, 'closeout prompt template version pinned'],
  ['docs/templates/project-system/START_PROMPT.template.md', /template-version:\s*3\.2/, 'start template version pinned'],
  ['docs/templates/project-system/CLOSEOUT_PROMPT.template.md', /template-version:\s*3\.2/, 'closeout template version pinned'],
  ['docs/STARTUP_BRIEF.md', /STARTUP BRIEF|STUDIO OPS/i, 'startup brief rendered'],
  ['prompts/start.md', /Execution-first workflow/i, 'start prompt includes execution-first rule'],
  ['prompts/closeout.md', /Run closeout autopilot/i, 'closeout prompt includes autopilot rule'],
];

const results = checks.map(([relPath, pattern, note]) => {
  const pass = pattern.test(read(relPath));
  return { relPath, note, pass };
});

const payload = {
  generatedAt: new Date().toISOString(),
  schemaVersion: '1.0',
  total: results.length,
  passing: results.filter((item) => item.pass).length,
  failing: results.filter((item) => !item.pass).length,
  results,
};

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else if (payload.failing === 0) console.log(`✓ Brief golden tests ${payload.passing}/${payload.total}`);
else {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}
