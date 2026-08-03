import { describe, expect, it } from 'vitest';
import { getIdentitySurfaceState, IDENTITY_ARCHITECTURE, OBELISK_AUTH_ENABLED } from '../data/identityArchitecture.js';

describe('identity architecture truth', () => {
  it('declares hybrid target without claiming an unproved Obelisk delegation', () => {
    expect(IDENTITY_ARCHITECTURE.declaredArchitecture).toBe('hybrid');
    expect(IDENTITY_ARCHITECTURE.obeliskDelegation).toBe('not-live');
    expect(OBELISK_AUTH_ENABLED).toBe(false);
    expect(getIdentitySurfaceState().currentLabel).toMatch(/not live/i);
  });
});
