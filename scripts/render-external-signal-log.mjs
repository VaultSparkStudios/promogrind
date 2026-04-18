#!/usr/bin/env node
// render-external-signal-log.mjs — append/read founder-curated external signals.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const appendMode = args.includes('--append');
const kind = valueAfter('--kind') ?? 'manual';
const source = valueAfter('--source') ?? 'founder';
const text = valueAfter('--text') ?? '';
const logPath = path.join(ROOT, 'portfolio', 'EXTERNAL_SIGNAL_LOG.md');

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function ensureLog() {
  if (fs.existsSync(logPath)) return;
  fs.writeFileSync(logPath, [
    '# External Signal Log',
    '',
    '> Append-only intake for signals Studio Ops cannot infer from repo state: AI platform changes, indie-dev trends, launch-channel movement, social/content shifts, and founder-observed market intelligence.',
    '',
    '## Entries',
    '',
  ].join('\n'), 'utf8');
}

function parseEntries() {
  ensureLog();
  const text = fs.readFileSync(logPath, 'utf8');
  const chunks = text.split(/^### /m).slice(1);
  return chunks.map(chunk => {
    const [title, ...body] = chunk.split('\n');
    return { title: title.trim(), body: body.join('\n').trim() };
  });
}

ensureLog();

if (appendMode) {
  if (!text.trim()) {
    console.error('render-external-signal-log: --append requires --text');
    process.exit(1);
  }
  const now = new Date().toISOString();
  const entry = [
    `### ${now.slice(0, 10)} · ${kind} · ${source}`,
    '',
    text.trim(),
    '',
  ].join('\n');
  fs.appendFileSync(logPath, entry, 'utf8');
}

const entries = parseEntries();
const latest = entries[entries.length - 1] ?? null;
const payload = {
  generatedAt: new Date().toISOString(),
  path: path.relative(ROOT, logPath),
  count: entries.length,
  latest,
};

if (jsonMode) console.log(JSON.stringify(payload, null, 2));
else {
  console.log(`external-signals: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
  if (latest) console.log(`  latest: ${latest.title}`);
  console.log(`  path: ${payload.path}`);
}
