/**
 * PromoGrind — Vault Member Auth Gate
 *
 * Connects to the shared VaultSpark Supabase project.
 * Any Vault-gated tool follows the same three-step pattern:
 *
 *   1. Copy this file into the tool's src/
 *   2. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env
 *   3. Call checkAuth() at app startup; redirect handled automatically
 *
 * ─── ENV SETUP ────────────────────────────────────────────────
 * Create a .env file in the project root (copy from .env.example):
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VAULT_MEMBER_LOGIN = 'https://vaultsparkstudios.com/vault-member/';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[VaultGate] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Call once on app startup.
 *
 * Handles two cases:
 *   A) Post-redirect from vault-member page: tokens are in the URL hash.
 *      We call setSession(), store them locally, strip the hash.
 *   B) Returning visit: session already in localStorage — nothing to do.
 *
 * Returns true if the user is authenticated.
 * Returns false (and redirects to vault-member) if not.
 */
export async function checkAuth() {
  // ── Case A: Incoming token redirect ──────────────────────────
  const hash = window.location.hash;
  if (hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.slice(1));
    const access_token  = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type          = params.get('type');

    if (access_token && refresh_token && type === 'vault_access') {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      // Strip tokens from URL regardless of outcome
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (error) {
        console.error('[VaultGate] setSession error:', error.message);
        redirectToLogin();
        return false;
      }
    }
  }

  // ── Case B: Check existing session ───────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirectToLogin();
    return false;
  }

  return true;
}

/**
 * Sign out and return to the vault-member page.
 */
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = VAULT_MEMBER_LOGIN;
}

/**
 * Returns the current session's user, or null.
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ── Internal ───────────────────────────────────────────────────

function redirectToLogin() {
  const next = encodeURIComponent(window.location.origin);
  window.location.href = `${VAULT_MEMBER_LOGIN}?next=${next}`;
}
