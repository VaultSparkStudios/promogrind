import fs from 'node:fs';
import { appendReceipts, criteriaForProof } from './lib/launch-proof-quorum.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

if (args.includes('--help')) {
  console.log(`Usage: node scripts/update-launch-proof.mjs [--list [--guide]]
       node scripts/update-launch-proof.mjs --proof <key> --criterion <id> --source <type> --target <target> --verifier <id> --evidence <redacted detail>

Options:
  --list                 List proofs and derived criterion coverage
  --guide                Include criterion IDs and next steps with --list
  --proof <key>          Canonical proof key
  --criterion <id>       Stable criterion ID from --list --guide
  --source <type>        provider-api|deployment|automated-smoke|human-observation
  --target <target>      Exact domain, URL, or provider target (defaults to proof target)
  --verifier <id>        Non-secret verifier/runner identifier
  --evidence <detail>    Redacted observation; secrets and tokens are rejected
  --observed-at <iso>    Observation timestamp (defaults to now)
  --help                 Show this help

Example:
  node scripts/update-launch-proof.mjs --proof authEmailSmoke --criterion confirmation-email-delivered --source human-observation --target https://promogrind.bet --verifier operator --evidence "Confirmation delivered"`);
  process.exit(0);
}

const proofPath = 'context/LAUNCH_PROOFS.json';
const payload = JSON.parse(fs.readFileSync(proofPath, 'utf8'));

if (args.includes('--list')) {
  for (const [key, proof] of Object.entries(payload?.proofs || {})) {
    const criteria = criteriaForProof(proof);
    const covered = new Set((proof.receipts || []).map((receipt) => receipt.criterionId));
    console.log(`${key}: ${proof.status || 'pending'} · ${criteria.filter((criterion) => covered.has(criterion.id)).length}/${criteria.length} criteria · target=${proof.target || 'unset'}`);
    if (args.includes('--guide')) {
      for (const criterion of criteria) console.log(`  ${covered.has(criterion.id) ? '✓' : '·'} ${criterion.id}: ${criterion.label}`);
      if (proof.nextStep) console.log(`  next: ${proof.nextStep}`);
    }
  }
  process.exit(0);
}

if (flag('--status')) {
  console.error('Direct status writes are forbidden. Record criterion-level receipts; status is derived.');
  process.exit(1);
}

const proofKey = flag('--proof');
const criterionId = flag('--criterion');
const proof = payload?.proofs?.[proofKey];
if (!proof || !criterionId || !flag('--verifier') || !flag('--evidence')) {
  console.error('Missing required receipt fields. Run with --help or --list --guide.');
  process.exit(1);
}

const receipt = {
  criterionId,
  source: flag('--source') || 'human-observation',
  target: flag('--target') || proof.target,
  observedAt: flag('--observed-at') || new Date().toISOString(),
  verifier: flag('--verifier'),
  detail: flag('--evidence'),
};

const result = appendReceipts(payload, proofKey, [receipt]);
fs.writeFileSync(proofPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`launch proof receipt: ${proofKey}.${criterionId} recorded · ${result.coveredCount}/${result.requiredCount} · status=${result.status}`);
