#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { reconcileLaunchProofDocument } from './lib/launch-proof-quorum.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`Usage: node scripts/migrate-launch-proof-quorum.mjs [--check|--apply] [--rebuild-criteria]

Options:
  --check  Exit non-zero when LAUNCH_PROOFS.json is not schema v2/quorum-derived
  --apply  Migrate evidenceRequired to stable criteria and derive proof statuses
  --rebuild-criteria  Recompute IDs from criterion labels (safe only before receipts exist)
  --help   Show this help

Example:
  node scripts/migrate-launch-proof-quorum.mjs --apply --rebuild-criteria`);
  process.exit(0);
}

const file = path.resolve('context/LAUNCH_PROOFS.json');
const original = JSON.parse(fs.readFileSync(file, 'utf8'));
if (args.includes('--rebuild-criteria')) {
  for (const proof of Object.values(original.proofs || {})) {
    if ((proof.receipts || []).length) throw new Error('cannot rebuild criteria after receipts exist');
    proof.evidenceRequired = (proof.criteria || []).map((criterion) => criterion.label);
    delete proof.criteria;
  }
}
const migrated = reconcileLaunchProofDocument(original);
const targets = {
  affiliateLinks: 'https://promogrind.bet',
  authEmailSmoke: 'https://promogrind.bet',
  stripeSmoke: 'https://promogrind.bet',
  friendBeta: 'https://promogrind.bet',
  brevoDelivery: 'contact@promogrind.bet',
  supabaseDeployment: 'supabase:fjnpzjjyhnpmunfoycrp',
  captureConfig: 'https://promogrind.bet/the-grind/',
};
for (const [key, proof] of Object.entries(migrated.proofs || {})) {
  proof.target ||= targets[key] || null;
}
const output = `${JSON.stringify(migrated, null, 2)}\n`;
const current = fs.readFileSync(file, 'utf8');

if (args.includes('--apply')) {
  fs.writeFileSync(file, output);
  console.log(`launch proof quorum: migrated ${Object.keys(migrated.proofs || {}).length} proofs to schema v2`);
} else if (current !== output) {
  console.error('launch proof quorum: migration required — run with --apply');
  process.exit(1);
} else {
  console.log('launch proof quorum: current');
}
