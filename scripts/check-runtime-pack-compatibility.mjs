#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { resolveProjectIdentity } from './lib/write-admission.mjs';
import { DOCUMENTED_LOCAL_OVERRIDES } from './lib/runtime-overlay-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OPS = path.resolve(ROOT, '..', 'vaultspark-studio-ops');
const JSON_MODE = process.argv.includes('--json');

const BASE_PROPAGATED_SURFACE = [
  'scripts/check-secrets.mjs',
  'scripts/check-windows-hide.mjs',
  'scripts/compact-handoff.mjs',
  'scripts/context-meter.mjs',
  'scripts/lib/context-verdicts.mjs',
  'scripts/lib/context-wipe-guard.mjs',
  'scripts/lib/doctor-predicates.mjs',
  'scripts/lib/doctor-remedies.mjs',
  'scripts/lib/model-router.mjs',
  'scripts/lib/secrets.mjs',
  'scripts/lib/sil-forecaster.mjs',
  'scripts/lib/sil-v6.mjs',
  'scripts/lib/task-board.mjs',
  'scripts/probe-capability.mjs',
  'scripts/render-closeout-board.mjs',
  'scripts/render-startup-brief.mjs',
  'scripts/validate-brief-format.mjs',
  'scripts/write-session-lock.mjs',
  'scripts/check-codex-trusted-project.mjs',
  'scripts/check-last-session-summary.mjs',
  'scripts/check-scheduled-write-admission.mjs',
  'scripts/lib/archive-then-compact.mjs',
  'scripts/lib/boot-amortization.mjs',
  'scripts/lib/brief-preflight.mjs',
  'scripts/lib/flaky-trend.mjs',
  'scripts/lib/forecast-ledger.mjs',
  'scripts/lib/host-load.mjs',
  'scripts/lib/proof-source-manifest.mjs',
  'scripts/lib/session-beacon.mjs',
  'scripts/lib/session-economics.mjs',
  'scripts/lib/session-floor-items.mjs',
  'scripts/lib/sil-ledger.mjs',
  'scripts/lib/spawn-resilience.mjs',
  'scripts/lib/test-duration-ordering.mjs',
  'scripts/lib/test-sidecar-summary.mjs',
  'scripts/lib/test-signal.mjs',
  'scripts/lib/token-cost-tier.mjs',
  'scripts/run-tests.mjs',
  'scripts/session-beacon.mjs',
  'scripts/session-floor.mjs'
];

function changedUpstreamScripts() {
  const result = spawnSync('git', ['-C', ROOT, 'status', '--porcelain=v1', '--', 'scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
  });
  if (result.status !== 0) return [];
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/\\/g, '/'))
    .filter((file) => file.startsWith('scripts/') && fs.existsSync(path.join(OPS, file)));
}

export const PROPAGATED_SURFACE = [...new Set([
  ...BASE_PROPAGATED_SURFACE,
  ...changedUpstreamScripts(),
])].sort();
const LOCAL_OVERRIDE_SET = new Set(DOCUMENTED_LOCAL_OVERRIDES);

function normalizedSourceHash(file) {
  const source = fs.readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n+$/, '\n');
  return createHash('sha256').update(source).digest('hex');
}

function result(id, pass, detail) {
  return { id, pass: Boolean(pass), detail };
}

const checks = [];
const files = [];
for (const rel of PROPAGATED_SURFACE) {
  const local = path.join(ROOT, rel);
  const upstream = path.join(OPS, rel);
  const exists = fs.existsSync(local);
  let syntax = false;
  if (exists) {
    const run = spawnSync(process.execPath, ['--check', local], {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
    });
    syntax = run.status === 0;
  }
  const upstreamExists = fs.existsSync(upstream);
  const exactMirror = exists && upstreamExists
    ? normalizedSourceHash(local) === normalizedSourceHash(upstream)
    : null;
  const documentedOverride = LOCAL_OVERRIDE_SET.has(rel);
  const driftClass = exactMirror === true
    ? 'exact-mirror'
    : exactMirror === false && documentedOverride
      ? 'documented-local-override'
      : exactMirror === false
        ? 'undocumented-drift'
        : 'upstream-unavailable';
  files.push({ file: rel, exists, syntax, upstreamExists, exactMirror, documentedOverride, driftClass });
  checks.push(result(`module:${rel}`, exists && syntax && driftClass !== 'undocumented-drift', driftClass));
}

let silModule = null;
try { silModule = await import('./lib/sil-forecaster.mjs'); } catch {}
const canonicalCategories = [
  'Dev Health', 'Creative Alignment', 'Momentum', 'Engagement', 'Process Quality',
  'Cross-Repo Coherence', 'Security Posture', 'Ecosystem Integration',
  'Capital Efficiency', 'Automation Coverage'
];
const exportedCategories = silModule?.CATEGORIES;
checks.push(result('sil-module-import', Boolean(silModule), silModule ? 'module imports' : 'module import failed'));
checks.push(result('sil-category-export', JSON.stringify(exportedCategories) === JSON.stringify(canonicalCategories), `${exportedCategories?.length ?? 0} canonical categories`));
checks.push(result(
  'sil-incomplete-fail-closed',
  silModule?.forecastNext?.([{ categories: { 'Dev Health': 100 }, complete: false }]) === null,
  'incomplete SIL ledgers cannot produce a partial forecast'
));

const brief = fs.existsSync(path.join(ROOT, 'docs', 'STARTUP_BRIEF.md'))
  ? fs.readFileSync(path.join(ROOT, 'docs', 'STARTUP_BRIEF.md'), 'utf8')
  : '';
checks.push(result('brief-qualified-truth', /✓\s+Truth\s+green-repo-owned/.test(brief), 'qualified green truth renders green'));
checks.push(result('brief-zero-compliance', /⚠\s+Compliance\s+not-tracked:/.test(brief), '0\/0 history renders not-tracked'));
checks.push(result('brief-public-revenue', /✓\s+Revenue sig\.\s+\d+d old/.test(brief), 'repo-local revenue evidence rendered'));
checks.push(result('brief-canonical-profile', /Profile · app · launch-hardening/.test(brief), 'expired cache cannot override canonical type/stage'));

const identity = resolveProjectIdentity({ root: ROOT });
checks.push(result('write-admission-project', identity.ok && identity.project === 'promogrind', `project=${identity.project || 'invalid'}`));

const meterSource = fs.readFileSync(path.join(ROOT, 'scripts', 'context-meter.mjs'), 'utf8');
checks.push(result('meter-provider-native', meterSource.includes('codex-token-count') && !/ledger\.length\s*>\s*0\s*\|\|\s*interactive\.length/.test(meterSource), 'auxiliary ledger cannot promote measurement'));

const failing = checks.filter((entry) => !entry.pass);
const summary = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  project: identity.project,
  surfaceCount: PROPAGATED_SURFACE.length,
  sourceDerivedChangedFiles: changedUpstreamScripts(),
  exactMirrors: files.filter((file) => file.exactMirror === true).length,
  documentedLocalOverrides: files.filter((file) => file.driftClass === 'documented-local-override').length,
  upstreamUnavailable: files.filter((file) => file.driftClass === 'upstream-unavailable').length,
  undocumentedDrift: files.filter((file) => file.driftClass === 'undocumented-drift').length,
  checksPassing: checks.length - failing.length,
  checksTotal: checks.length,
  ok: failing.length === 0,
  files,
  checks,
  failing: failing.map((entry) => entry.id)
};

try {
  fs.mkdirSync(path.join(ROOT, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.cache', 'runtime-pack-compatibility.json'), JSON.stringify(summary, null, 2) + '\n');
} catch {}

if (JSON_MODE) console.log(JSON.stringify(summary, null, 2));
else console.log(`runtime-pack compatibility: ${summary.ok ? 'PASS' : 'FAIL'} · ${summary.checksPassing}/${summary.checksTotal} · ${summary.exactMirrors} exact · ${summary.documentedLocalOverrides} local overrides`);
process.exit(summary.ok ? 0 : 1);
