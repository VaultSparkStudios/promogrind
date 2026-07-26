export const SIGNAL_STATE = Object.freeze({
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  EMPTY: 'empty',
  UNAVAILABLE: 'unavailable',
  SKIPPED: 'skipped',
  STALE: 'stale',
});

export function classifyRatioSnapshot(snapshot, { warnBelow = 100, failBelow = 95 } = {}) {
  if (!snapshot || typeof snapshot !== 'object') return SIGNAL_STATE.UNAVAILABLE;
  const total = Number(snapshot.total);
  if (!Number.isFinite(total) || total <= 0) return SIGNAL_STATE.UNAVAILABLE;
  if (snapshot.skipped === total) return SIGNAL_STATE.SKIPPED;
  const score = Number(snapshot.score);
  if (!Number.isFinite(score)) return SIGNAL_STATE.UNAVAILABLE;
  if (score < failBelow) return SIGNAL_STATE.FAIL;
  if (score < warnBelow) return SIGNAL_STATE.WARN;
  return SIGNAL_STATE.PASS;
}

export function resolveProjectProfile(status = {}, cachedProfile = {}) {
  const statusType = String(status.type || '').trim();
  const cachedMedium = String(cachedProfile.medium || '').trim();
  return {
    medium: statusType || cachedMedium || 'unknown',
    stage: String(status.developmentPhase || cachedProfile.stage || 'unknown'),
    archetype: cachedProfile.archetype || null,
    topAxis: Array.isArray(cachedProfile.ignisTopAxes) ? cachedProfile.ignisTopAxes[0] || null : null,
    source: statusType ? 'context/PROJECT_STATUS.json' : cachedMedium ? '.cache/project-profile.json' : 'unavailable',
  };
}

export function signalIcon(state) {
  if (state === SIGNAL_STATE.PASS) return '✓';
  if (state === SIGNAL_STATE.FAIL) return '⛔';
  return '⚠';
}
