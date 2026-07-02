#!/usr/bin/env node
/**
 * Renders the external launch-proof ledger.
 *
 * This does not complete any proof. It keeps the remaining real-world proof
 * gates visible and mechanically checkable from the canonical repo surfaces.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLaunchProofs } from './lib/launch-proofs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'EXTERNAL_LAUNCH_PROOF_LEDGER.md');
const CHECK = process.argv.includes('--check');
const JSON_MODE = process.argv.includes('--json');
const RUN_AS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function readJson(rel, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function classifyBlocker(text) {
  const value = text.toLowerCase();
  if (value.includes('stripe')) return 'stripe';
  if (value.includes('friend') || value.includes('beta')) return 'friend-beta';
  if (value.includes('brevo') || value.includes('contact@')) return 'brevo';
  if (value.includes('capture') || value.includes('anon key') || value.includes('public-key')) return 'capture-config';
  if (value.includes('supabase') || value.includes('capability')) return 'supabase-capability';
  if (value.includes('auth') || value.includes('email')) return 'auth-email';
  return 'external-proof';
}

function statusLabel(proof) {
  if (!proof) return 'pending';
  if (proof.status === 'complete') return 'complete';
  if (proof.blocking === false) return `${proof.status || 'partial'} / advisory`;
  return proof.status || 'pending';
}

function proofMirrorsCategory(proof, category) {
  const haystack = `${proof.key} ${proof.label}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  const needle = category.replace(/[^a-z0-9]/g, '');
  return haystack.includes(needle) ||
    (category === 'auth-email' && haystack.includes('auth')) ||
    (category === 'friend-beta' && haystack.includes('friend')) ||
    (category === 'supabase-capability' && haystack.includes('supabase'));
}

export function buildExternalLaunchProofLedger({ status, launchProofs }) {
  const blockers = Array.isArray(status.blockers) ? status.blockers : [];
  const proofs = launchProofs.proofs || {};
  const proofRows = Object.entries(proofs).map(([key, proof]) => ({
    key,
    label: proof.label || key,
    status: statusLabel(proof),
    blocking: proof.blocking !== false,
    requiredFor: Array.isArray(proof.requiredFor) ? proof.requiredFor.join(', ') : '',
    nextStep: normalize(proof.nextStep || proof.details || ''),
    evidenceRequired: Array.isArray(proof.evidenceRequired) ? proof.evidenceRequired : [],
    evidenceCount: Array.isArray(proof.evidence) ? proof.evidence.length : 0,
  }));

  const blockerRows = blockers
    .filter((entry) => /proof|smoke|friend|brevo|capture|capability|stripe|email|supabase/i.test(entry))
    .map((entry) => {
      const category = classifyBlocker(entry);
      return {
        category,
        blocker: normalize(entry),
        mirroredInLaunchProofs: proofRows.some((proof) => proofMirrorsCategory(proof, category)),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    project: status.name || status.slug || 'PromoGrind',
    session: Number(status.currentSession) || 0,
    liveUrl: status.liveUrl || '',
    blockersOpen: blockerRows.length,
    launchProofsBlocking: proofRows.filter((proof) => proof.blocking && proof.status !== 'complete').length,
    proofRows,
    blockerRows,
  };
}

export function renderLedgerMd(ledger) {
  const lines = [
    '# External Launch Proof Ledger',
    '',
    `> Generated: ${ledger.generatedAt.slice(0, 10)} | Project: ${ledger.project} | Session: ${ledger.session}`,
    '',
    'This ledger is an honesty surface. It records proof gates that require real-world evidence and must not be marked complete from local code alone.',
    '',
    '## Summary',
    '',
    `- Live URL: ${ledger.liveUrl || 'not set'}`,
    `- Project-status external blockers: ${ledger.blockersOpen}`,
    `- Blocking canonical launch proofs: ${ledger.launchProofsBlocking}`,
    '',
    '## Canonical Launch Proofs',
    '',
    '| Proof | Status | Blocking | Required For | Evidence Items | Next Step |',
    '|---|---|---:|---|---:|---|',
    ...ledger.proofRows.map((proof) =>
      `| ${proof.label} | ${proof.status} | ${proof.blocking ? 'yes' : 'no'} | ${proof.requiredFor || '-'} | ${proof.evidenceCount}/${proof.evidenceRequired.length} | ${proof.nextStep || '-'} |`
    ),
    '',
    '## Project Status Blockers',
    '',
    '| Category | Mirrored In Launch Proofs | Blocker |',
    '|---|---:|---|',
    ...ledger.blockerRows.map((row) =>
      `| ${row.category} | ${row.mirroredInLaunchProofs ? 'yes' : 'no'} | ${row.blocker} |`
    ),
    '',
    '## Completion Rule',
    '',
    'Only record completion through the existing proof-specific runners or `scripts/update-launch-proof.mjs` with redacted evidence. Do not paste secrets, tokens, passwords, full email bodies, or full auth links into this repo.',
    '',
    '*Generated by `scripts/render-external-launch-proof-ledger.mjs`.*',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const status = readJson('context/PROJECT_STATUS.json', {});
  const launchProofs = loadLaunchProofs(ROOT);
  const ledger = buildExternalLaunchProofLedger({ status, launchProofs });
  const rendered = renderLedgerMd(ledger);

  if (JSON_MODE) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }

  if (CHECK) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== rendered) {
      console.error('external-launch-proof-ledger: docs/EXTERNAL_LAUNCH_PROOF_LEDGER.md is stale. Run node scripts/render-external-launch-proof-ledger.mjs');
      process.exit(1);
    }
    console.log('external-launch-proof-ledger: fresh');
    return;
  }

  fs.writeFileSync(OUT, rendered);
  console.log(`external-launch-proof-ledger: wrote ${path.relative(ROOT, OUT).replace(/\\/g, '/')}`);
}

if (RUN_AS_MAIN) main();
