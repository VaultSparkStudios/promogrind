import { createHash } from 'node:crypto';

export const DOCUMENTED_LOCAL_OVERRIDES = Object.freeze([
  'scripts/check-secrets.mjs',
  'scripts/check-scheduled-write-admission.mjs',
  'scripts/context-meter.mjs',
  'scripts/lib/context-verdicts.mjs',
  'scripts/lib/secrets.mjs',
  'scripts/lib/sil-forecaster.mjs',
  'scripts/probe-capability.mjs',
  'scripts/render-startup-brief.mjs',
  'scripts/validate-brief-format.mjs',
]);

export function contentHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function classifyRuntimeOverlay({ file, current, upstream, committed }) {
  if (current == null) return { file, action: 'blocked', reason: 'working file missing' };
  if (upstream == null) return { file, action: 'blocked', reason: 'canonical upstream file missing' };
  if (committed == null) return { file, action: 'blocked', reason: 'committed local overlay unavailable' };

  const hashes = {
    current: contentHash(current),
    upstream: contentHash(upstream),
    committed: contentHash(committed),
  };
  if (hashes.current === hashes.committed) {
    return { file, action: 'preserve', reason: 'working copy matches committed consumer overlay', hashes };
  }
  if (hashes.committed === hashes.upstream) {
    return { file, action: 'preserve-upstream', reason: 'committed file is no longer a consumer override', hashes };
  }
  if (hashes.current === hashes.upstream) {
    return { file, action: 'restore-committed', reason: 'canonical propagation replaced a documented consumer overlay', hashes };
  }
  return {
    file,
    action: 'refuse-user-edit',
    reason: 'working copy differs from both canonical upstream and committed overlay; refusing to overwrite possible user work',
    hashes,
  };
}

export function summarizeRuntimeOverlayPlan(entries) {
  const counts = Object.fromEntries(
    ['preserve', 'preserve-upstream', 'restore-committed', 'refuse-user-edit', 'blocked']
      .map((action) => [action, entries.filter((entry) => entry.action === action).length])
  );
  return {
    ok: counts.blocked === 0 && counts['refuse-user-edit'] === 0,
    needsApply: counts['restore-committed'] > 0,
    counts,
  };
}
