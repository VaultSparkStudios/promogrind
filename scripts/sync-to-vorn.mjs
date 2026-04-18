#!/usr/bin/env node
/**
 * scripts/sync-to-vorn.mjs — register/update Studio Ops agents on Vorn
 *
 * For every agents/dna/*.json with vorn_public=true, register the sanitized
 * public profile on joinvorn.com via POST /agents/register (or update by
 * handle if already registered). Uses VORN_OPERATOR_KEY (capability
 * `vorn.operator`).
 *
 * Sanitization rules (enforced before payload construction):
 *   - Drop: role.scope_statement, guardrails, trust_tier, tools, telemetry
 *   - Keep: identity (sanitized), vorn_profile.*, personality.tone
 *   - bio_public is re-scanned for strategy keywords — abort on hit.
 *
 * Dry-run default — pass --apply to actually POST.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecret } from './lib/secrets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DNA_DIR = path.join(REPO_ROOT, 'agents', 'dna');
const VORN_API = process.env.VORN_API_BASE || 'https://joinvorn.com/api';

const STRATEGY_KEYWORDS = ['guardrail', 'trust_tier', 'scope_statement', 'budget_ceiling', 'studio-internal', 'confidential', 'proprietary'];

function buildPublicPayload(dna) {
  const bio = (dna.vorn_profile?.bio_public || '').trim();
  for (const kw of STRATEGY_KEYWORDS) {
    if (bio.toLowerCase().includes(kw)) {
      throw new Error(`${dna.identity.call_sign}: bio_public contains strategy keyword '${kw}' — sanitize before sync`);
    }
  }
  return {
    handle: dna.vorn_profile.handle,
    display_name: dna.identity.name,
    bio,
    avatar_url: dna.identity.avatar_url || null,
    agent_framework: 'Claude Managed Agent',
    capabilities: dna.tools.length ? ['post_creation', 'platform_read'] : ['platform_read'],
    autonomy_level: dna.vorn_profile.autonomy_level,
    subtype: dna.vorn_profile.subtype,
    operator_handle: 'carter',
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const json = process.argv.includes('--json');

  const dnas = fs.readdirSync(DNA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(DNA_DIR, f), 'utf8')))
    .filter(d => d.vorn_public === true);

  let operatorKey = null;
  try { operatorKey = getSecret('VORN_OPERATOR_KEY', 'vorn.operator'); }
  catch (e) {
    if (apply) {
      console.error(`[blocked] ${e.message}`);
      console.error('Add VORN_OPERATOR_KEY to secrets/vorn.env before --apply.');
      process.exit(2);
    }
  }

  const results = [];
  for (const dna of dnas) {
    try {
      const payload = buildPublicPayload(dna);
      const action = apply ? 'POST' : 'DRY-RUN';
      if (apply) {
        const r = await fetch(`${VORN_API}/agents/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${operatorKey}`,
          },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        results.push({ call_sign: dna.identity.call_sign, status: r.status, ok: r.ok, action, profile_url: body.profile_url });
      } else {
        results.push({ call_sign: dna.identity.call_sign, status: 0, ok: true, action, payload });
      }
    } catch (e) {
      results.push({ call_sign: dna.identity.call_sign, status: -1, ok: false, error: e.message });
    }
  }

  if (json) {
    console.log(JSON.stringify({ results, apply, dnas: dnas.length }, null, 2));
  } else {
    console.log(`Vorn Sync · apply=${apply} · ${dnas.length} public agent(s)`);
    for (const r of results) {
      const icon = r.ok ? '✓' : '✗';
      console.log(`  ${icon} ${r.call_sign.padEnd(20)} ${r.action}  ${r.error || r.profile_url || 'payload built'}`);
    }
  }

  const failed = results.filter(r => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

main();
