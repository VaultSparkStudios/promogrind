import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeProjectSlug, resolveProjectIdentity } from '../../scripts/lib/write-admission.mjs';

const ROOT = path.resolve('.');
const SCRIPT = path.join(ROOT, 'scripts', 'check-scheduled-write-admission.mjs');

function run(args = [], env = {}) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    env: { ...process.env, SESSION_TRIGGER: '', STUDIO_SESSION_TRIGGER: '', ...env },
    encoding: 'utf8',
    windowsHide: true,
  });
  return { status: result.status, body: JSON.parse(result.stdout) };
}

describe('scheduled write admission identity', () => {
  it('normalizes repository names into stable project slugs', () => {
    expect(normalizeProjectSlug('PromoGrind')).toBe('promogrind');
    expect(normalizeProjectSlug(' vaultspark-studio-ops ')).toBe('vaultspark-studio-ops');
  });

  it('derives the default from the current repository, never studio-ops', () => {
    expect(resolveProjectIdentity({ root: ROOT })).toMatchObject({
      ok: true,
      project: 'promogrind',
      rootProject: 'promogrind',
      source: 'repository-root',
    });
  });

  it('allows an explicit normalized project override while retaining root provenance', () => {
    expect(resolveProjectIdentity({ root: ROOT, explicitProject: 'PromoGrind-Canary' })).toMatchObject({
      project: 'promogrind-canary',
      rootProject: 'promogrind',
      source: 'explicit',
    });
  });

  it('emits the real project on the interactive CLI path', () => {
    const result = run(['--json']);
    expect(result.status).toBe(0);
    expect(result.body).toMatchObject({
      ok: true,
      decision: 'allow',
      project: 'promogrind',
      rootProject: 'promogrind',
      projectSource: 'repository-root',
      writeMode: 'telemetry',
    });
  });

  it('denies scheduled Git writes without a local allow policy before lease probing', () => {
    const result = run(['--scheduled', '--write-mode', 'git', '--json']);
    expect(result.status).toBe(2);
    expect(result.body).toMatchObject({
      ok: false,
      decision: 'deny',
      project: 'promogrind',
      writeMode: 'git',
    });
    expect(result.body.reason).toMatch(/forbids scheduled Git publication/);
  });
});
