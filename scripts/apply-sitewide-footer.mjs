#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyStudioFooter } from './lib/studio-footer-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const APPLY = process.argv.includes('--apply');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(target);
  }
  return out;
}

const files = walk(PUBLIC).sort();
const rows = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = applyStudioFooter(source);
  if (APPLY && result.changed && result.after.ok) fs.writeFileSync(file, result.html, 'utf8');
  rows.push({ file: path.relative(ROOT, file).replace(/\\/g, '/'), changed: result.changed, refused: result.refused || null, ok: APPLY ? result.after.ok : result.before.ok });
}
const failing = rows.filter((row) => !row.ok || row.refused);
console.log(`sitewide footer ${APPLY ? 'apply' : 'check'} · ${files.length} files · ${rows.filter((row) => row.changed).length} changes · ${failing.length} failing`);
if (failing.length) {
  for (const row of failing.slice(0, 20)) console.error(`  ${row.file}: ${row.refused || 'missing contract'}`);
  process.exit(1);
}
