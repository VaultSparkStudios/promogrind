import { readProjectJson } from "./context-parsing.mjs";
import { evaluateProof, reconcileLaunchProofDocument } from './launch-proof-quorum.mjs';

export const DEFAULT_LAUNCH_PROOFS = {
  schemaVersion: "1.0",
  proofs: {
    affiliateLinks: {
      label: "Required sportsbook monetization links",
      status: "pending",
      blocking: true,
      requiredFor: ["full-launch", "marketing-push"],
      details: "Real operator-approved tracking or referral URLs are still missing for BetMGM, bet365, and BetRivers.",
      evidence: [],
    },
    stripeSmoke: {
      label: "Real Stripe smoke",
      status: "pending",
      blocking: true,
      requiredFor: ["full-launch", "marketing-push"],
      details: "A real checkout, webhook, and customer-portal lifecycle pass still needs to be completed against the deployed app.",
      evidence: [],
    },
    friendBeta: {
      label: "Friend-facing beta pass",
      status: "pending",
      blocking: true,
      requiredFor: ["soft-launch", "marketing-push", "full-launch"],
      details: "One friend-facing pass through auth, calculator, CTA, and pricing still needs to be completed.",
      evidence: [],
    },
  },
};

export function loadLaunchProofs(root) {
  const raw = readProjectJson(root, "context/LAUNCH_PROOFS.json", DEFAULT_LAUNCH_PROOFS);
  const proofs = { ...DEFAULT_LAUNCH_PROOFS.proofs, ...(raw?.proofs || {}) };
  return reconcileLaunchProofDocument({
    ...DEFAULT_LAUNCH_PROOFS,
    ...(raw || {}),
    proofs,
  });
}

export function getBlockingLaunchProofs(root) {
  const payload = loadLaunchProofs(root);
  const proofs = Object.entries(payload.proofs || {}).map(([key, value]) => ({ key, ...value }));
  return proofs.filter((proof) => proof.blocking && evaluateProof(proof).status !== "complete");
}
