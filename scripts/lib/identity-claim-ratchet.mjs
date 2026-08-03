import crypto from 'node:crypto';

const canonicalFields = ['lifecycle', 'currentHumanAuthority', 'targetStudioAuthority', 'obeliskDelegation', 'agentIdentity'];

export function evaluateIdentityClaimRatchet({ contract, projectStatus, studioManifest, agents, surfaces = {} }) {
  const errors = [];
  const comparisons = [];
  const compare = (label, actual, expected) => {
    const ok = actual === expected;
    comparisons.push({ label, actual, expected, ok });
    if (!ok) errors.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  };

  compare('projectStatus.obeliskArchitecture', projectStatus?.obeliskArchitecture, contract.declaredArchitecture);
  compare('studioManifest.identityArchitecture.obeliskArchitecture', studioManifest?.identityArchitecture?.obeliskArchitecture, contract.declaredArchitecture);
  compare('agents.identity_architecture.declared', agents?.identity_architecture?.declared, contract.declaredArchitecture);
  for (const field of canonicalFields) {
    compare(`projectStatus.identityArchitecture.${field}`, projectStatus?.identityArchitecture?.[field], contract[field]);
    compare(`studioManifest.identityArchitecture.${field}`, studioManifest?.identityArchitecture?.[field], contract[field]);
  }
  compare('agents.identity_architecture.lifecycle', agents?.identity_architecture?.lifecycle, contract.lifecycle);
  compare('agents.identity_architecture.obelisk_delegation', agents?.identity_architecture?.obelisk_delegation, contract.obeliskDelegation);
  compare('agents.identity_architecture.agent_identity', agents?.identity_architecture?.agent_identity, contract.agentIdentity);

  if (String(projectStatus?.vaultStatus || '').toUpperCase() === 'SPARKED' && contract.obeliskDelegation !== 'live') {
    errors.push('SPARKED is forbidden while Obelisk delegation is not live');
  }

  const surfaceEntries = Object.entries(surfaces);
  for (const [name, text] of surfaceEntries) {
    if (!/getIdentitySurfaceState|IDENTITY_ARCHITECTURE|OBELISK_AUTH_ENABLED/.test(text)) errors.push(`${name}: identity contract import/use is missing`);
    if (contract.obeliskDelegation !== 'live' && /obelisk\s+(?:sign[- ]?in|auth(?:entication)?)\s+is\s+(?:live|available|enabled)/i.test(text)) {
      errors.push(`${name}: claims live Obelisk identity while the contract is not-live`);
    }
  }

  const sourceDigest = crypto.createHash('sha256')
    .update(JSON.stringify({ contract, projectStatus: projectStatus?.identityArchitecture, studioManifest: studioManifest?.identityArchitecture, agents: agents?.identity_architecture, surfaces }))
    .digest('hex');
  return { ok: errors.length === 0, errors, comparisons, sourceDigest };
}
