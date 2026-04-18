#!/usr/bin/env node
/**
 * generate-supabase-keys.mjs
 * Generates Supabase ANON_KEY and SERVICE_ROLE_KEY JWTs from a JWT_SECRET.
 *
 * Usage:
 *   node scripts/generate-supabase-keys.mjs <JWT_SECRET>
 *
 * Output:
 *   ANON_KEY=eyJ...
 *   SERVICE_ROLE_KEY=eyJ...
 */

import { createHmac } from 'crypto';

const secret = process.argv[2];

if (!secret) {
  console.error('Usage: node generate-supabase-keys.mjs <JWT_SECRET>');
  process.exit(1);
}

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function makeJWT(payload, secret) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 3153600000; // ~100 years

const anonKey = makeJWT({ role: 'anon', iss: 'supabase', iat, exp }, secret);
const serviceKey = makeJWT({ role: 'service_role', iss: 'supabase', iat, exp }, secret);

console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
