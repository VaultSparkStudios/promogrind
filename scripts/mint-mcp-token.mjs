#!/usr/bin/env node
/**
 * scripts/mint-mcp-token.mjs — mint a bearer token for a given agent DNA.
 *
 * Reads agents/dna/<call_sign>.json + STUDIO_OPS_MCP_SIGNING_KEY secret.
 * Prints the signed token to stdout (REDACTED in logs).
 *
 * Usage:
 *   node scripts/mint-mcp-token.mjs --agent sentinel --ttl-days 30
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mintToken } from '../studio-ops-mcp/auth.mjs';
import { getSecret } from './lib/secrets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function main() {
  const argv = process.argv.slice(2);
  const agentIdx = argv.indexOf('--agent');
  if (agentIdx === -1) {
    console.error('usage: node scripts/mint-mcp-token.mjs --agent <call_sign> [--ttl-days 30]');
    process.exit(1);
  }
  const callSign = argv[agentIdx + 1];
  const ttlDays = Number(argv[argv.indexOf('--ttl-days') + 1] ?? 30);

  const dnaPath = path.join(REPO_ROOT, 'agents', 'dna', `${callSign}.json`);
  if (!fs.existsSync(dnaPath)) {
    console.error(`DNA not found: ${dnaPath}`);
    process.exit(1);
  }
  const dna = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));

  let signingKey;
  try {
    signingKey = getSecret('STUDIO_OPS_MCP_SIGNING_KEY', 'studio-ops.mcp.endpoint');
  } catch (e) {
    console.error(`[blocked] ${e.message}`);
    console.error('Fix: add STUDIO_OPS_MCP_SIGNING_KEY to secrets/studio-ops-mcp.env (generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")');
    process.exit(2);
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const payload = {
    call_sign: dna.identity.call_sign,
    trust_tier: dna.trust_tier,
    tools: dna.tools,
    budget_ceiling_usd_per_day: dna.guardrails.budget_ceiling_usd_per_day,
    issued_iso: now.toISOString(),
    expires_iso: expires.toISOString(),
  };

  const token = mintToken(payload, signingKey);
  console.log(token);
  console.error(`\n✓ minted token for ${dna.identity.name} (${callSign}) · tier=${dna.trust_tier} · expires=${expires.toISOString()}`);
}

main();
