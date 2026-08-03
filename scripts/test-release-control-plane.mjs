#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from './lib/safe-spawn.mjs';
import { classifySpawnResult, resolveCommandSpec } from './lib/command-spec.mjs';
import { evaluateReleaseArchitecture } from './lib/release-architecture.mjs';

assert.deepEqual(resolveCommandSpec('npm', ['run', 'test'], 'win32'), {
  executable: 'cmd.exe',
  args: ['/d', '/s', '/c', 'npm', 'run', 'test'],
  transport: 'windows-command-shim',
});
assert.deepEqual(resolveCommandSpec('npm', ['run', 'test'], 'linux'), {
  executable: 'npm', args: ['run', 'test'], transport: 'direct',
});
if (process.platform === 'win32') {
  const npmSpec = resolveCommandSpec('npm', ['--version']);
  const npmProbe = spawnSync(npmSpec.executable, npmSpec.args, { encoding: 'utf8' });
  assert.equal(npmProbe.status, 0, npmProbe.error?.message || npmProbe.stderr);
  assert.match(npmProbe.stdout.trim(), /^\d+\.\d+\.\d+/);
}
assert.deepEqual(classifySpawnResult({ status: null, error: { code: 'ENOENT', message: 'missing' } }), {
  ok: false,
  status: null,
  signal: null,
  spawnError: { code: 'ENOENT', message: 'missing' },
  detail: 'spawn error ENOENT: missing',
});

const forge = evaluateReleaseArchitecture({
  vaultStatus: 'FORGE',
  stagingType: 'local',
  stagingUrl: null,
  obeliskArchitecture: 'hybrid',
  identityArchitecture: { currentHumanAuthority: 'promogrind-supabase', obeliskDelegation: 'not-live' },
});
assert.equal(forge.pass, false);
assert.equal(forge.posture, 'forge-declared-not-ready');
assert.equal(forge.checks.stableStaging, false);
assert.equal(forge.checks.obeliskDelegationLive, false);

const ready = evaluateReleaseArchitecture({
  vaultStatus: 'SPARKED',
  stagingType: 'remote',
  stagingUrl: 'https://staging.promogrind.bet',
  obeliskArchitecture: 'hybrid',
  identityArchitecture: { currentHumanAuthority: 'obelisk', obeliskDelegation: 'live' },
});
assert.equal(ready.pass, true);
assert.equal(ready.releaseReady, true);

const cli = spawnSync(process.execPath, [
  'scripts/check-release-architecture.mjs', '--project', 'promogrind', '--canon', '045', '--json',
], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(cli.status, 2, cli.stderr || cli.stdout);
const payload = JSON.parse(cli.stdout);
assert.equal(payload.pass, false);
assert.equal(payload.slug, 'promogrind');
assert.equal(payload.checks.architectureDeclared, true);
assert.equal(payload.checks.obeliskDelegationLive, false);

console.log('release control plane passed · Windows npm transport · explicit spawn errors · honest CANON-007/045 gaps');
