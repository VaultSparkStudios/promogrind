#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';
import { summarizeVitestReport, applyVitestEvidence } from './lib/vitest-evidence.mjs';
import { writeProjectStatus } from './lib/write-project-status.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const partial = args.some((arg) => !arg.startsWith('-'));
const reportPath = path.join(root, '.cache', 'vitest-results.json');
const receiptPath = path.join(root, 'audits', 'test-evidence-latest.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
try { fs.unlinkSync(reportPath); } catch {}
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const child = spawnSync(process.execPath, [vitest, 'run', ...args, '--reporter=default', '--reporter=json', `--outputFile.json=${reportPath}`], {
  cwd: root, stdio: 'inherit', windowsHide: true,
});
const exitCode = Number.isInteger(child.status) ? child.status : 1;
let finalExitCode = exitCode;
let receipt;
try {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true });
  receipt = summarizeVitestReport(report, { exitCode, partial, commitSha: git.status === 0 ? git.stdout.trim() : null });
} catch (error) {
  receipt = {
    schemaVersion: '1.0', generatedAt: new Date().toISOString(), complete: false, partial,
    success: false, exitCode, error: String(error.message || error).slice(0, 240),
    reportSha256: crypto.createHash('sha256').update('unreadable').digest('hex'),
  };
}
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
const temp = `${receiptPath}.tmp-${process.pid}`;
fs.writeFileSync(temp, JSON.stringify(receipt, null, 2) + '\n');
fs.renameSync(temp, receiptPath);
if (!partial) {
  const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  writeProjectStatus(root, applyVitestEvidence(status, receipt));
  const mirror = spawnSync(process.execPath, [path.join(root, 'scripts', 'generate-project-status-mirror.mjs')], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  if (mirror.status !== 0) finalExitCode = 1;
  const parity = spawnSync(process.execPath, [path.join(root, 'scripts', 'render-release-parity.mjs')], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  if (parity.status !== 0) finalExitCode = 1;
}
console.log(`vitest evidence: ${receipt.success ? 'GREEN' : receipt.complete ? 'RED' : 'INCONCLUSIVE'} · receipt ${path.relative(root, receiptPath)}`);
process.exit(finalExitCode);
