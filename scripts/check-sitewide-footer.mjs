#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inspectStudioFooter } from './lib/studio-footer-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(target);
  }
}
walk(path.join(ROOT, 'public'));
files.sort();
const rows = files.map((file) => ({ file: path.relative(ROOT, file).replace(/\\/g, '/'), ...inspectStudioFooter(fs.readFileSync(file, 'utf8')) }));
const failing = rows.filter((row) => !row.ok);
const sourceSha256 = createHash('sha256').update(rows.map((row) => `${row.file}:${row.occurrences}:${row.linked}`).join('\n')).digest('hex');
const receipt = { schemaVersion: '1.0', generatedAt: new Date().toISOString(), ok: failing.length === 0, checkedFiles: rows.length, passing: rows.length - failing.length, sourceSha256, failing };
if (process.argv.includes('--write-receipt')) {
  fs.mkdirSync(path.join(ROOT, 'audits'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'audits', 'sitewide-footer-latest.json'), JSON.stringify(receipt, null, 2) + '\n');
}
if (process.argv.includes('--json')) console.log(JSON.stringify(receipt, null, 2));
else console.log(`sitewide proprietary footer · ${receipt.passing}/${receipt.checkedFiles} · ${receipt.ok ? 'PASS' : 'FAIL'}`);
process.exit(receipt.ok ? 0 : 1);
