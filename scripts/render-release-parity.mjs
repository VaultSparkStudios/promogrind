#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compileReleaseParity, renderReleaseParity } from './lib/release-parity.mjs';

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const visual = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'visual-qa', 'LATEST.json'), 'utf8'));
let tests = null;
try { tests = JSON.parse(fs.readFileSync(path.join(root, 'audits', 'test-evidence-latest.json'), 'utf8')); } catch {}
const payload = compileReleaseParity({ root, visualReceipt: visual, testEvidence: tests });
const json = JSON.stringify(payload, null, 2) + '\n';
const md = renderReleaseParity(payload);
const jsonPath = path.join(root, 'audits', 'release-parity-latest.json');
const mdPath = path.join(root, 'docs', 'RELEASE_PARITY.md');
if (check) {
  const currentJson = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : '';
  const currentMd = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';
  if (currentJson !== json || currentMd !== md) {
    console.error('release parity: stale — run node scripts/render-release-parity.mjs');
    process.exit(1);
  }
  console.log(`release parity: fresh · ${payload.visual.captures.length} inspected captures · native ${payload.native.state}`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, json);
fs.writeFileSync(mdPath, md);
console.log(`release parity: wrote typed JSON + Markdown · ${payload.visual.captures.length} captures`);
