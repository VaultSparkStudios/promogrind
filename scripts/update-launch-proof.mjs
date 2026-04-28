import fs from "node:fs";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const proofKey = readFlag("--proof");
const status = readFlag("--status");
const evidence = readFlag("--evidence");
const list = process.argv.includes("--list");
const guide = process.argv.includes("--guide");

const proofPath = "context/LAUNCH_PROOFS.json";
const payload = JSON.parse(fs.readFileSync(proofPath, "utf8"));

if (list) {
  for (const [key, proof] of Object.entries(payload?.proofs || {})) {
    const marker = proof.status === "complete" ? "complete" : proof.blocking ? "blocking" : "pending";
    console.log(`${key}: ${marker} - ${proof.label}`);
    if (guide) {
      if (proof.details) console.log(`  details: ${proof.details}`);
      if (proof.nextStep) console.log(`  next: ${proof.nextStep}`);
      if (Array.isArray(proof.evidenceRequired) && proof.evidenceRequired.length) {
        console.log("  evidence:");
        for (const item of proof.evidenceRequired) console.log(`    - ${item}`);
      }
    }
  }
  process.exit(0);
}

if (!proofKey || !status) {
  console.error("Usage: node scripts/update-launch-proof.mjs --proof <key> --status <pending|complete> --evidence \"note\"");
  console.error("       node scripts/update-launch-proof.mjs --list [--guide]");
  process.exit(1);
}

const proof = payload?.proofs?.[proofKey];

if (!proof) {
  console.error(`Unknown proof key: ${proofKey}`);
  process.exit(1);
}

if (!["pending", "complete"].includes(status)) {
  console.error(`Unsupported proof status: ${status}`);
  process.exit(1);
}

if (status === "complete" && !evidence?.trim()) {
  console.error(`Evidence is required before marking ${proofKey} complete.`);
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
