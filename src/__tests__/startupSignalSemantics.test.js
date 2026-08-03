import { describe, expect, it } from 'vitest';
import {
  classifyQualifiedStatus,
  resolvePrimaryTestCommand,
  resolveProjectProfile,
  selectComplianceEvidence,
} from '../../scripts/lib/startup-signal-semantics.mjs';

describe('startup signal semantics', () => {
  it('preserves qualified green and yellow states', () => {
    expect(classifyQualifiedStatus('green-repo-owned-with-follow-ups')).toMatchObject({ state: 'green', icon: '✓' });
    expect(classifyQualifiedStatus('yellow-external-proof')).toMatchObject({ state: 'warning', icon: '⚠' });
    expect(classifyQualifiedStatus('unknown')).toMatchObject({ state: 'unknown', icon: '⚠' });
  });

  it('never turns a zero-denominator snapshot into a compliance failure', () => {
    expect(selectComplianceEvidence([{ date: '2026-08-02', passed: 0, total: 0, score: 0 }], {
      now: Date.parse('2026-08-02T12:00:00Z'),
    })).toMatchObject({ current: null, state: 'not-tracked' });
  });

  it('selects the newest meaningful compliance evidence by date', () => {
    const evidence = selectComplianceEvidence([
      { date: '2026-08-01', passed: 9, total: 10, score: 90 },
      { date: '2026-07-31', passed: 10, total: 10, score: 100 },
    ], { now: Date.parse('2026-08-02T12:00:00Z') });
    expect(evidence.current).toMatchObject({ date: '2026-08-01', score: 90 });
    expect(evidence.previous).toMatchObject({ date: '2026-07-31', score: 100 });
  });

  it('rejects expired profile cache claims in favor of canonical status', () => {
    const lens = resolveProjectProfile({
      profile: { medium: 'tool', stage: 'old', generatedAt: '2026-07-01T00:00:00Z', ttlMs: 1_800_000 },
      status: { type: 'app', developmentPhase: 'launch-hardening' },
      now: Date.parse('2026-08-02T00:00:00Z'),
    });
    expect(lens).toMatchObject({ medium: 'app', stage: 'launch-hardening', cacheFresh: false, source: 'canonical-status' });
  });

  it('derives stale-test remediation from the project testing surface', () => {
    expect(resolvePrimaryTestCommand({
      testingSurfaces: [{ type: 'tests', command: 'npm test' }],
    }, { scripts: { test: 'vitest run' } })).toBe('npm test');
  });
});
