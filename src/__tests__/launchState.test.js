import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getLaunchCommandCenter, getLaunchProofCommandItems, getLaunchProofSummary, getValidationSignal, parseValidationSignal, resolveLaunchValidation } from "../launchState.js";

describe("launch truth source", () => {
  it("derives blocker state only from the generated proof ledger", () => {
    const source = fs.readFileSync(path.resolve("src/launchState.js"), "utf8");
    expect(source).not.toMatch(/LAUNCH_BLOCKERS/);
    expect(source).toContain('from "./data/launchProofs.generated.js"');
    expect(source).toContain("getLaunchProofCommandItems");
  });
});

describe("launch state helpers", () => {
  it("classifies validation strings into signals", () => {
    expect(getValidationSignal("passing")).toBe("passing");
    expect(getValidationSignal("153/153 passing")).toBe("passing");
    expect(getValidationSignal("blocked by deploy")).toBe("failing");
    expect(getValidationSignal("stale")).toBe("warning");
  });

  it("fails counted evidence closed unless a positive suite is complete", () => {
    expect(parseValidationSignal("0/597 passing")).toMatchObject({
      signal: "failing", observedCount: 0, expectedCount: 597,
    });
    expect(parseValidationSignal("3/5 pass")).toMatchObject({
      signal: "failing", observedCount: 3, expectedCount: 5,
    });
    expect(parseValidationSignal("0/0 passing")).toMatchObject({
      signal: "warning", observedCount: 0, expectedCount: 0,
    });
    expect(parseValidationSignal("598/597 passing")).toMatchObject({
      signal: "failing", observedCount: 598, expectedCount: 597,
    });
    expect(parseValidationSignal("597/597 passing but deploy failed")).toMatchObject({
      signal: "failing", reason: "explicit failure marker",
    });
    expect(parseValidationSignal("597/597")).toMatchObject({
      signal: "passing", reason: "complete positive count",
    });
    expect(parseValidationSignal("597/597 passing — stale")).toMatchObject({
      signal: "warning", reason: "non-terminal or unavailable evidence",
    });
    expect(parseValidationSignal("611/611; production pending")).toMatchObject({
      signal: "warning", reason: "non-terminal or unavailable evidence",
    });
  });

  it("resolves validation rows with merged signals", () => {
    const validation = resolveLaunchValidation({
      tests: { lastKnown: "153/153 passing" },
      browserSmoke: { lastKnown: "blocked by environment" },
    });

    expect(validation.tests.signal).toBe("passing");
    expect(validation.tests.evidence).toMatchObject({ observedCount: 153, expectedCount: 153, reason: "complete positive count" });
    expect(validation.browserSmoke.signal).toBe("failing");
  });

  it("derives a launch command-center score and next actions", () => {
    const center = getLaunchCommandCenter({
      configuredAffiliateCount: 3,
      configuredMonetizationCount: 6,
      totalBooks: 12,
      validation: resolveLaunchValidation({
        tests: { lastKnown: "153/153 passing" },
        build: { lastKnown: "passing" },
        smokeCommand: { lastKnown: "passing" },
        browserSmoke: { lastKnown: "passing" },
      }),
    });

    expect(center.validationPassingCount).toBe(4);
    expect(center.readinessScore).toBeGreaterThan(40);
    expect(center.nextActions.length).toBeGreaterThan(0);
  });

  it("normalizes canonical launch proofs into command-center blockers", () => {
    const proofs = {
      schemaVersion: "1.0",
      lastUpdated: "2026-05-14",
      proofs: {
        affiliateLinks: {
          label: "Affiliate links",
          status: "pending",
          blocking: true,
          details: "Tracked links are missing.",
          nextStep: "Add approved tracking URLs.",
          evidenceRequired: ["approved URL", "production verification"],
          evidence: [{ type: "operator-note" }],
        },
        friendBeta: {
          label: "Friend beta",
          status: "complete",
          blocking: true,
          details: "Tester completed the flow.",
          evidenceRequired: ["tester pass"],
          evidence: [{ type: "friend-beta" }],
        },
      },
    };

    const summary = getLaunchProofSummary(proofs);
    const items = getLaunchProofCommandItems(proofs);
    const center = getLaunchCommandCenter({
      configuredAffiliateCount: 0,
      configuredMonetizationCount: 0,
      totalBooks: 12,
      blockers: items,
      validation: resolveLaunchValidation(),
    });

    expect(summary.total).toBe(2);
    expect(summary.complete).toBe(1);
    expect(summary.blocking).toBe(1);
    expect(summary.evidenceCount).toBe(2);
    expect(items[0]).toMatchObject({
      key: "affiliateLinks",
      status: "manual",
      nextStep: "Add approved tracking URLs.",
      evidenceCount: 1,
      requiredEvidenceCount: 2,
    });
    expect(center.unresolvedBlockerCount).toBe(1);
    expect(center.nextActions[0].key).toBe("affiliateLinks");
  });

  it("prioritizes auth email proof before other manual launch blockers", () => {
    const proofs = {
      schemaVersion: "1.0",
      proofs: {
        affiliateLinks: {
          label: "Affiliate links",
          status: "partial",
          blocking: false,
          evidenceRequired: ["verified links"],
          evidence: [],
        },
        authEmailSmoke: {
          label: "Production auth email smoke",
          status: "pending",
          blocking: true,
          details: "Production email delivery is unproven.",
          nextStep: "Run the auth email smoke runner.",
          evidenceRequired: ["confirmation delivered", "reset delivered", "new password sign-in"],
          evidence: [],
        },
        stripeSmoke: {
          label: "Stripe smoke",
          status: "pending",
          blocking: true,
          details: "Checkout proof is pending.",
          evidenceRequired: ["checkout", "portal"],
          evidence: [],
        },
      },
    };

    const items = getLaunchProofCommandItems(proofs);
    const center = getLaunchCommandCenter({
      blockers: items,
      validation: resolveLaunchValidation(),
    });

    expect(items.find((item) => item.key === "affiliateLinks")?.status).toBe("advisory");
    expect(center.nextActions.map((item) => item.key).slice(0, 2)).toEqual(["authEmailSmoke", "stripeSmoke"]);
  });

  it("fails a typed proof closed when persisted status contradicts its receipt quorum", () => {
    const summary = getLaunchProofSummary({ proofs: { unsafe: {
      label: "Unsafe persisted completion", status: "complete", blocking: true,
      criteria: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      receipts: [{ criterionId: "a" }],
    } } });
    expect(summary.complete).toBe(0);
    expect(summary.blocking).toBe(1);
    expect(summary.proofs[0].status).toBe("partial");
    expect(summary.proofs[0].missingEvidence).toEqual(["B"]);
  });
});

