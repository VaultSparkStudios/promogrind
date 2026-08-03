const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const IDENTITY_ARCHITECTURE = Object.freeze({
  declaredArchitecture: 'hybrid',
  lifecycle: 'forge-compatibility',
  currentHumanAuthority: 'promogrind-supabase',
  targetStudioAuthority: 'obelisk',
  obeliskDelegation: 'not-live',
  agentIdentity: 'not-live',
  explanation: 'PromoGrind account auth remains a clearly labeled compatibility path while Obelisk verification, recovery, and session delegation are unproved.',
});

export const OBELISK_AUTH_ENABLED = /^(1|true|yes|on)$/i.test(String(env.VITE_OBELISK_AUTH_ENABLED || ''))
  && Boolean(env.VITE_OBELISK_VERIFY_ENDPOINT);

export const OBELISK_VERIFY_ENDPOINT = OBELISK_AUTH_ENABLED
  ? String(env.VITE_OBELISK_VERIFY_ENDPOINT)
  : null;

export function getIdentitySurfaceState() {
  return {
    ...IDENTITY_ARCHITECTURE,
    obeliskEnabled: OBELISK_AUTH_ENABLED,
    currentLabel: OBELISK_AUTH_ENABLED
      ? 'Obelisk studio identity with PromoGrind compatibility storage'
      : 'PromoGrind compatibility account — Obelisk sign-in is not live',
  };
}
