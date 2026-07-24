import { describe, expect, it } from "vitest";
import { buildExternalLaunchProofLedger } from "../../scripts/render-external-launch-proof-ledger.mjs";

const proof = (label) => ({ label, status: "pending", blocking: true, requiredFor: ["launch"], evidenceRequired: [], evidence: [] });

describe("external launch-proof ledger", () => {
  it("reports complete typed coverage for every supported external blocker", () => {
    const ledger = buildExternalLaunchProofLedger({
      status: { name: "PromoGrind", blockers: [
        "Brevo delivery proof pending for contact@promogrind.bet.",
        "Run real production auth email smoke.",
        "Run one real Stripe smoke purchase.",
        "Complete one friend-facing beta pass.",
        "Supabase capability follow-up remains pending.",
        "Wire the production capture public-key config.",
      ] },
      launchProofs: { proofs: {
        brevoDelivery: proof("Brevo delivery"), authEmailSmoke: proof("Auth email"),
        stripeSmoke: proof("Stripe smoke"), friendBeta: proof("Friend beta"),
        supabaseDeployment: proof("Supabase deployment"), captureConfig: proof("Capture config"),
      } },
    });
    expect(ledger.blockersOpen).toBe(6);
    expect(ledger.blockersMirrored).toBe(6);
    expect(ledger.unmirroredBlockers).toBe(0);
  });

  it("makes an unknown proof category visible instead of silently passing", () => {
    const ledger = buildExternalLaunchProofLedger({ status: { blockers: ["Production email vendor proof pending."] }, launchProofs: { proofs: {} } });
    expect(ledger.unmirroredBlockers).toBe(1);
  });
});
