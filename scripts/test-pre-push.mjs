#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inspectModelRouterSource } from './lib/model-router-adherence.mjs';
import { inspectPushFile, parseBatchBlobs, runPrePush } from './pre-push.mjs';
const root = path.resolve(import.meta.dirname, '..');
const sdk = ['@anthropic-ai', 'sdk'].join('/');
const host = ['api', 'anthropic', 'com'].join('.');
const model = ['claude', 'sonnet', '4'].join('-');
const script = 'scripts/example.mjs';
const testScript = 'scripts/test-example.mjs';
let passed = 0;
function check(name, fn) { fn(); passed += 1; console.log(`✓ ${name}`); }
check('real propagated documentation and lock assertion are harmless', () => {
  for (const file of ['scripts/lib/model-routing.mjs', 'scripts/test-edge-verification.mjs']) assert.deepEqual(inspectModelRouterSource(fs.readFileSync(path.join(root, file), 'utf8'), file), []);
});
check('comments are ignored but adjacent executable code is still rejected', () => {
  assert.deepEqual(inspectModelRouterSource(`/**\n * ${model}\n */\n// ${sdk}\n`, script), []);
  const found = inspectModelRouterSource(`/* ${sdk} */ const model = '${model}'; // explanatory\n/* comment */ fetch('https://${host}/v1/messages');`, script);
  assert.deepEqual(found.map(({ line }) => line), [1, 2]);
  assert.equal(inspectModelRouterSource(`const text = '/*'; const model = '${model}';`, script).length, 1);
  assert.equal(inspectModelRouterSource(`const rx = /[/*]/; const model = '${model}';`, script).length, 1);
  assert.equal(inspectModelRouterSource('const text = `/* ' + model + ' */`;', script).length, 1);
});
check('only static expected assertion data is inert, including in test files', () => {
  assert.deepEqual(inspectModelRouterSource(`assert.deepEqual(Object.keys(lock.specifiers).sort(), ['npm:${sdk}@1.0']);`, testScript), []);
  assert.equal(inspectModelRouterSource(`assert.deepEqual(Object.keys(lock.specifiers).sort(), ['npm:${sdk}@1.0']);`, script).length, 1);
  for (const code of [
    `import Anthropic from '${sdk}';`,
    `assert.equal(await import('${sdk}'), expected);`,
    `assert.equal(actual, await import('${sdk}'));`,
    `assert.ok(fetch('https://${host}/v1/messages'));`,
    `const selectedModel = '${model}';`,
    `assert.equal(actual, (() => fetch('https://${host}/v1/messages'))());`,
  ]) assert.ok(inspectModelRouterSource(code, testScript).length > 0, 'live code must remain blocked');
});
check('all previous file and credential gates remain active with safe diagnostics', () => {
  const cases = [
    ['.env.production', 'not a credential', 'environment'],
    ['public/a.js', 'sk_' + 'live_' + 'a'.repeat(24), 'Stripe'],
    ['public/a.js', 'r' + 'nd_' + 'a'.repeat(20), 'Render'],
    ['public/a.js', 'gh' + 'p_' + 'a'.repeat(36), 'GitHub'],
    ['public/a.js', 'AK' + 'IA' + 'A'.repeat(16), 'AWS'],
    ['public/a.js', Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' + 'a'.repeat(50), 'JWT'],
    ['public/a.js', ['postgresql://user:', 'private-password', '@db.example.test/app'].join(''), 'Database'],
    ['public/a.js', ['C:', 'Users', 'example'].join('\\'), 'Absolute'],
  ];
  for (const [file, content, expected] of cases) {
    const findings = inspectPushFile(file, Buffer.from(content));
    assert.ok(findings.some(({ rule }) => rule.includes(expected)), expected);
    assert.ok(!JSON.stringify(findings).includes(content));
  }
  assert.deepEqual(inspectPushFile('.env.example', Buffer.from('VARIABLE=placeholder')), []);
  assert.deepEqual(inspectPushFile('sample.txt', Buffer.from(['postgresql://user:', 'local-fixture', '@localhost:5432/app'].join(''))), []);
  assert.deepEqual(inspectPushFile('sample.txt', Buffer.from(['postgresql://user:', '[REDACTED]', '@db.example.test/app'].join(''))), []);
  assert.deepEqual(inspectPushFile('image.png', Buffer.from([0, 1, 2])), []);
});
function pack(files, content = Buffer.from('export const value = 1;\n')) {
  return Buffer.concat(files.map(() => Buffer.concat([Buffer.from(`${'c'.repeat(40)} blob ${content.length}\n`), content, Buffer.from('\n')])));
}
check('200 outgoing files use only two Git calls and preserve existing gates', () => {
  const files = Array.from({ length: 200 }, (_, i) => `scripts/fixture-${i}.mjs`);
  const gitCalls = [], gateCalls = [];
  const report = runPrePush({
    root, updates: `refs/heads/main ${'a'.repeat(40)} refs/heads/main ${'b'.repeat(40)}\n`,
    git: (args, input) => { gitCalls.push({ args, input }); return args[0] === 'diff' ? Buffer.from(files.join('\0') + '\0') : pack(files); },
    gate: (script, args) => { gateCalls.push({ script, args }); return { status: 0 }; },
  });
  assert.equal(report.ok, true);
  assert.equal(report.filesScanned, 200);
  assert.equal(gitCalls.length, 2);
  assert.deepEqual(gateCalls.map(({ script }) => script), ['scripts/scan-secrets.mjs', 'scripts/canon-enforcer.mjs']);
  assert.ok(gitCalls[1].input.startsWith(`${'a'.repeat(40)}:scripts/fixture-0.mjs\n`), 'scan committed tip bytes, not a sanitized working copy');
});
check('new branches, settings checks, malformed Git data and failing gates fail safely', () => {
  const files = ['.claude/settings.local.json'];
  const calls = [];
  const report = runPrePush({
    root, updates: `refs/heads/new ${'a'.repeat(40)} refs/heads/new ${'0'.repeat(40)}\n`,
    git: (args) => { calls.push(args); return args[0] === 'ls-tree' ? Buffer.from(files[0] + '\0') : pack(files, Buffer.from('{}')); },
    gate: (script) => ({ status: script.endsWith('sanitize-claude-settings.mjs') ? 1 : 0 }),
  });
  assert.equal(calls[0][0], 'ls-tree');
  assert.equal(report.ok, false);
  assert.match(report.findings[0].rule, /sanitization/);
  assert.equal(runPrePush({ root, updates: 'malformed', git: () => { throw new Error('should not run'); } }).ok, false);
  assert.throws(() => parseBatchBlobs(Buffer.from('invalid\n'), ['a']), /committed blob/);
  const failed = runPrePush({ root, updates: '', gate: () => ({ status: 1 }) });
  assert.equal(failed.ok, false);
  assert.equal(failed.findings.length, 2);
});
check('tracked shell hook contains only one executable dispatch', () => {
  const hook = fs.readFileSync(path.join(root, 'scripts/git-hooks/pre-push'), 'utf8');
  const lines = hook.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  assert.deepEqual(lines, ['exec node scripts/pre-push.mjs "$@"']);
});
console.log(`Pre-push safety: ${passed}/${passed} focused checks passing`);
