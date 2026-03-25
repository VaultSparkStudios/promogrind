#!/usr/bin/env node
/**
 * PromoGrind / VaultSpark — Invite Code Generator
 *
 * Generates invite codes and inserts them into Supabase.
 * Uses the SERVICE ROLE key (admin access) — never expose this key in a browser.
 *
 * Usage:
 *   node scripts/generate-invite-codes.js [count] [notes]
 *
 * Examples:
 *   node scripts/generate-invite-codes.js 5
 *   node scripts/generate-invite-codes.js 3 "for poker night crew"
 *   node scripts/generate-invite-codes.js 1 "for John Smith"
 *
 * Setup:
 *   1. Create .env.admin in the project root (git-ignored):
 *      SUPABASE_URL=https://xxxx.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 *   2. npm install @supabase/supabase-js (already installed)
 *   3. Run the script
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { resolve } from 'path';

// ── Load .env.admin ─────────────────────────────────────────────
function loadEnv(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    raw.split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length && !k.trim().startsWith('#')) {
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  } catch {
    // file may not exist — rely on process.env
  }
}

loadEnv(resolve(process.cwd(), '.env.admin'));

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Create .env.admin in the project root with those values.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Code generation ─────────────────────────────────────────────
function generateCode() {
  // Format: VAULT-XXXX where XXXX is 4 uppercase alphanumeric chars
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (ambiguous)
  let suffix = '';
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    suffix += chars[bytes[i] % chars.length];
  }
  return `VAULT-${suffix}`;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const count = parseInt(process.argv[2]) || 1;
  const notes = process.argv.slice(3).join(' ') || null;

  if (count < 1 || count > 50) {
    console.error('Count must be between 1 and 50.');
    process.exit(1);
  }

  const codes = Array.from({ length: count }, generateCode);

  // Deduplicate (extremely unlikely but safe)
  const uniqueCodes = [...new Set(codes)];

  const rows = uniqueCodes.map(code => ({ code, notes }));

  const { data, error } = await supabase
    .from('invite_codes')
    .insert(rows)
    .select('code');

  if (error) {
    console.error('\nERROR inserting codes:', error.message);
    process.exit(1);
  }

  console.log('\n── Generated Invite Codes ──────────────────────────────');
  if (notes) console.log(`Notes: ${notes}`);
  console.log('');
  data.forEach(row => console.log(`  ${row.code}`));
  console.log('');
  console.log(`${data.length} code(s) created. Share them one per person.`);
  console.log('────────────────────────────────────────────────────────\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
