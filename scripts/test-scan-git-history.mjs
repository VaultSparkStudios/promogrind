#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from './lib/safe-spawn.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1))), '..');
const scanner = path.join(root, 'scripts', 'scan-git-history.mjs');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-history-scan-'));
const runGit = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });

try {
  assert.equal(runGit('init', '-q').status, 0);
  fs.writeFileSync(path.join(repo, 'package-lock.json'), JSON.stringify({ integrity: 'sha512-83TyPk+P9rNbW2vH4sF1mQx6L0jDc7eAuYzK8iNo5VbG3tRsCpEw==' }));
  const anonJwt = jwt({ role: 'anon', ref: 'public-browser-key' });
  fs.writeFileSync(path.join(repo, 'app.js'), `export const componentFixtureText = '${'component'.repeat(5)}';\nexport const anonKey = '${anonJwt}';\n`);
  runGit('add', '.');
  assert.equal(runGit('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'noise').status, 0);

  const realSecret = 'aB3dE5fG7hJ9kL2mN4pQ' + '6rS8tU0vW1xY3zA5bC7d';
  const serviceJwt = jwt({ role: 'service_role', ref: 'private-server-key' });
  fs.writeFileSync(path.join(repo, 'deploy.env.example'), `AWS_SECRET_ACCESS_KEY=${realSecret}\nSUPABASE_SERVICE_ROLE_KEY=${serviceJwt}\n`);
  runGit('add', '.');
  assert.equal(runGit('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'real secret').status, 0);

  const result = spawnSync(process.execPath, [scanner, '--repo', repo, '--json', '--timeout-ms', '10000'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, '2.0');
  assert.equal(payload.scanned, 2);
  assert.equal(payload.timedOut, false);
  assert.equal(payload.findings.length, 2);
  assert.deepEqual(payload.findings.map((finding) => finding.patternId).sort(), ['aws-secret', 'supabase-service-jwt']);
  assert.ok(!result.stdout.includes(realSecret));
  assert.ok(!result.stdout.includes(serviceJwt));
  assert.ok(!payload.findings.some((finding) => finding.file === 'app.js'));
  assert.ok(payload.durationMs < 10000);
  console.log('history scanner regression: 10 assertions passing');
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}

function jwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.${'s'.repeat(43)}`;
}
