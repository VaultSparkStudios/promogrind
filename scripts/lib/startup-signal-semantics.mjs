const DAY_MS = 86_400_000;

export function classifyQualifiedStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || /^(unknown|unmeasured|not[- ]tracked|n\/a)\b/.test(normalized)) {
    return { state: 'unknown', icon: '⚠', normalized };
  }
  if (/^(green|pass(?:ed|ing)?|healthy|clear|ready)(?:\b|[-_])/.test(normalized)) {
    return { state: 'green', icon: '✓', normalized };
  }
  if (/^(yellow|warn(?:ing)?|partial|review|stale)(?:\b|[-_])/.test(normalized)) {
    return { state: 'warning', icon: '⚠', normalized };
  }
  if (/^(red|fail(?:ed|ing)?|blocked|critical|error)(?:\b|[-_])/.test(normalized)) {
    return { state: 'failing', icon: '⛔', normalized };
  }
  return { state: 'unknown', icon: '⚠', normalized };
}

function validCompliance(snapshot) {
  return snapshot
    && Number.isFinite(Number(snapshot.total))
    && Number(snapshot.total) > 0
    && Number.isFinite(Number(snapshot.passed))
    && Number.isFinite(Number(snapshot.score))
    && /^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.date || ''));
}

export function selectComplianceEvidence(snapshots = [], { now = Date.now(), maxAgeDays = 14 } = {}) {
  const meaningful = (Array.isArray(snapshots) ? snapshots : [])
    .filter(validCompliance)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!meaningful.length) {
    return { current: null, previous: null, state: 'not-tracked', reason: 'no non-zero compliance run recorded' };
  }
  const current = meaningful[meaningful.length - 1];
  const previous = meaningful[meaningful.length - 2] || null;
  const ageDays = Math.max(0, Math.floor((now - Date.parse(`${current.date}T00:00:00Z`)) / DAY_MS));
  if (!Number.isFinite(ageDays) || ageDays > maxAgeDays) {
    return { current: null, previous, state: 'stale', ageDays, reason: `latest meaningful run is ${ageDays}d old` };
  }
  return { current, previous, state: 'current', ageDays };
}

export function resolveProjectProfile({ profile, status = {}, now = Date.now() } = {}) {
  const generatedAt = Date.parse(profile?.generatedAt || '');
  const ttlMs = Number(profile?.ttlMs);
  const cacheFresh = Number.isFinite(generatedAt)
    && Number.isFinite(ttlMs)
    && ttlMs > 0
    && now >= generatedAt
    && now - generatedAt <= ttlMs;
  return {
    medium: status.type || (cacheFresh ? profile?.medium : null) || '—',
    stage: status.developmentPhase || (cacheFresh ? profile?.stage : null) || '—',
    archetype: cacheFresh ? profile?.archetype || '—' : '—',
    topAxis: cacheFresh ? profile?.ignisTopAxes?.[0] || '—' : '—',
    cacheFresh,
    source: cacheFresh ? 'canonical-status+fresh-cache' : 'canonical-status',
  };
}

export function resolvePrimaryTestCommand(status = {}, packageJson = {}) {
  const surface = Array.isArray(status.testingSurfaces)
    ? status.testingSurfaces.find((entry) => entry?.type === 'tests' && typeof entry.command === 'string' && entry.command.trim())
    : null;
  if (surface) return surface.command.trim();
  if (packageJson?.scripts?.test) return 'npm test';
  return 'node scripts/run-tests.mjs';
}

export default { classifyQualifiedStatus, selectComplianceEvidence, resolveProjectProfile, resolvePrimaryTestCommand };
