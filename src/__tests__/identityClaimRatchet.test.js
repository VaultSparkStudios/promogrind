import { describe, expect, it } from 'vitest';
import { evaluateIdentityClaimRatchet } from '../../scripts/lib/identity-claim-ratchet.mjs';

const contract = {
  declaredArchitecture: 'hybrid', lifecycle: 'forge-compatibility', currentHumanAuthority: 'promogrind-supabase',
  targetStudioAuthority: 'obelisk', obeliskDelegation: 'not-live', agentIdentity: 'not-live',
};
const projectStatus = { vaultStatus: 'FORGE', obeliskArchitecture: 'hybrid', identityArchitecture: { ...contract } };
delete projectStatus.identityArchitecture.declaredArchitecture;
const studioManifest = { identityArchitecture: { obeliskArchitecture: 'hybrid', ...projectStatus.identityArchitecture } };
const agents = { identity_architecture: { declared: 'hybrid', lifecycle: 'forge-compatibility', obelisk_delegation: 'not-live', agent_identity: 'not-live' } };
const surfaces = { dialog: 'getIdentitySurfaceState(); Obelisk sign-in is not live.' };

describe('identity claim ratchet', () => {
  it('accepts a coherent FORGE compatibility posture', () => {
    const result = evaluateIdentityClaimRatchet({ contract, projectStatus, studioManifest, agents, surfaces });
    expect(result.ok).toBe(true);
    expect(result.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('prevents both status drift and premature SPARKED identity claims', () => {
    const drifted = structuredClone(projectStatus);
    drifted.identityArchitecture.obeliskDelegation = 'live';
    drifted.vaultStatus = 'SPARKED';
    const result = evaluateIdentityClaimRatchet({
      contract,
      projectStatus: drifted,
      studioManifest,
      agents,
      surfaces: { dialog: 'getIdentitySurfaceState(); Obelisk sign-in is live.' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/obeliskDelegation/),
      expect.stringMatching(/SPARKED is forbidden/),
      expect.stringMatching(/claims live Obelisk identity/),
    ]));
  });
});
