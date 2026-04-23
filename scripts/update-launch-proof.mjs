import fs from "node:fs";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const proofKey = readFlag("--proof");
const status = readFlag("--status");
const evidence = readFlag("--evidence");

if (!proofKey || !status) {
  console.error("Usage: node scripts/update-launch-proof.mjs --proof <key> --status <pending|complete> [--evidence \"note\"]");
  process.exit(1);
}

const proofPath = "context/LAUNCH_PROOFS.json";
const payload = JSON.parse(fs.readFileSync(proofPath, "utf8"));
const proof = payload?.proofs?.[proofKey];

if (!proof) {
  console.error(`Unknown proof key: ${proofKey}`);
  process.exit(1);
}

proof.status = status;
proof.lastUpdated = new Date().toISOString().slice(0, 10);
if (evidence) {
  proof.evidence = Array.isArray(proof.evidence) ? proof.evidence : [];
  proof.evidence.unshift({
    notedAt: new Date().toISOString(),
    note: evidence,
  });
}

payload.lastUpdated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(proofPath, JSON.stringify(payload, null, 2) + "\n");
console.log(`Updated ${proofKey} -> ${status}`);
