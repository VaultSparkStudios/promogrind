import fs from 'node:fs';
import path from 'node:path';

const ARCHITECTURES = new Set(['internal', 'external', 'hybrid']);

function isStableStaging(status) {
  const url = typeof status?.stagingUrl === 'string' ? status.stagingUrl.trim() : '';
  const type = String(status?.stagingType || '').toLowerCase();
  return /^https:\/\//i.test(url) && !['', 'none', 'local'].includes(type);
}

function identityDelegated(status) {
  const architecture = String(status?.obeliskArchitecture || '').toLowerCase();
  if (architecture === 'internal') return true;
  const identity = status?.identityArchitecture || {};
  return identity.currentHumanAuthority === 'obelisk' || identity.obeliskDelegation === 'live';
}

export function evaluateReleaseArchitecture(status = {}, { canon = null } = {}) {
  const architecture = String(status.obeliskArchitecture || '').toLowerCase();
  const architectureDeclared = ARCHITECTURES.has(architecture);
  const stableStaging = isStableStaging(status);
  const delegated = architectureDeclared && identityDelegated(status);
  const identityPass = architectureDeclared && delegated;
  const stagingPass = stableStaging;
  const selectedPass = canon === '045'
    ? identityPass
    : canon === '007'
      ? stagingPass
      : identityPass && stagingPass;
  const checks = {
    architectureDeclared,
    obeliskDelegationLive: delegated,
    stableStaging,
    stagingUrlDeclared: typeof status.stagingUrl === 'string' && /^https:\/\//i.test(status.stagingUrl),
  };
  const gaps = [];
  if (!architectureDeclared) gaps.push('obeliskArchitecture must declare internal, external, or hybrid');
  if (architectureDeclared && !delegated) gaps.push('applicable account workflows are not yet delegated to Obelisk');
  if (!stableStaging) gaps.push('stable HTTPS staging origin is not configured');
  return {
    schemaVersion: 1,
    pass: selectedPass,
    canon: canon || '007+045',
    lifecycle: status.vaultStatus || status.lifecycle || 'unknown',
    architecture: architecture || null,
    checks,
    gaps,
    releaseReady: identityPass && stagingPass,
    posture: identityPass && stagingPass ? 'release-ready' : architectureDeclared ? 'forge-declared-not-ready' : 'undeclared',
  };
}

export function readProjectStatus(projectRoot = process.cwd()) {
  const target = path.join(projectRoot, 'context', 'PROJECT_STATUS.json');
  return JSON.parse(fs.readFileSync(target, 'utf8'));
}

