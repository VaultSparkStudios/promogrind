const CONFIDENCE = new Set(["high", "medium", "low"]);
const EVIDENCE = new Set(["complete", "partial", "estimate"]);
const SOURCES = new Set(["model", "ai", "rule_engine"]);

function member(value, allowed, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
}

function cleanMissing(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : [];
}

function normalizeCalibration(summary) {
  const sample = Number.parseInt(summary?.sample, 10);
  const calibration = Number.parseFloat(summary?.calibration);
  return {
    source: String(summary?.source || "promo-advisor"),
    sample: Number.isFinite(sample) ? Math.max(0, sample) : 0,
    calibration: Number.isFinite(calibration) ? Math.max(0, Math.min(100, calibration)) : null,
    showable: summary?.showable === true && Number.isFinite(calibration),
  };
}

export function governAdvisorConfidence(input = {}) {
  const rawConfidence = member(input.confidence, CONFIDENCE, "low");
  const evidenceGrade = member(input.evidenceGrade, EVIDENCE, "estimate");
  const analysisSource = member(input.analysisSource, SOURCES, "unknown");
  const missingInputs = cleanMissing(input.missingInputs);
  const calibration = normalizeCalibration(input.calibration);
  const reasons = [];

  if (rawConfidence === "low") reasons.push("raw-confidence-low");
  if (evidenceGrade === "estimate") reasons.push("evidence-estimate");
  else if (evidenceGrade === "partial") reasons.push("evidence-partial");
  if (missingInputs.length) reasons.push(missingInputs.length >= 2 ? "multiple-missing-inputs" : "missing-input");
  if (analysisSource === "unknown") reasons.push("unknown-analysis-source");
  else reasons.push(analysisSource === "rule_engine" ? "rule-engine-provenance" : "model-provenance");
  if (!calibration.showable) reasons.push("calibration-cold-start");
  else if (calibration.calibration < 60) reasons.push("calibration-degraded");
  else if (calibration.calibration < 75) reasons.push("calibration-watch");
  else reasons.push("calibration-supportive");

  const mustAbstain = rawConfidence === "low"
    || evidenceGrade === "estimate"
    || missingInputs.length >= 2
    || analysisSource === "unknown"
    || (calibration.showable && calibration.calibration < 60);
  const mayAct = rawConfidence === "high"
    && evidenceGrade === "complete"
    && missingInputs.length === 0
    && analysisSource !== "unknown"
    && calibration.showable
    && calibration.calibration >= 75;
  const posture = mustAbstain ? "abstain" : mayAct ? "act" : "verify";
  const copy = posture === "act"
    ? {
        label: "Act with bounds",
        summary: "The current evidence is complete and the resolved Advisor history supports this confidence band.",
        instruction: "Verify live terms and calculator inputs, then use the bounded workflow.",
      }
    : posture === "verify"
      ? {
          label: "Verify first",
          summary: calibration.showable
            ? "The analysis is usable as a review lead, but its evidence or calibration does not support direct action."
            : "Resolved Advisor history is still below the ten-outcome reveal threshold.",
          instruction: "Fill the missing facts and verify live terms before treating the suggestion as actionable.",
        }
      : {
          label: "Abstain",
          summary: "The present evidence boundary is too weak for PromoGrind to endorse an action posture.",
          instruction: "Do not act from this verdict; collect the missing facts or use a deterministic calculator instead.",
        };

  return {
    posture,
    actionabilityCap: posture === "act" ? 100 : posture === "verify" ? 35 : 0,
    ...copy,
    rawConfidence,
    evidenceGrade,
    analysisSource,
    missingInputs,
    calibration,
    reasonCodes: reasons,
    receipt: {
      contractVersion: 1,
      posture,
      actionabilityCap: posture === "act" ? 100 : posture === "verify" ? 35 : 0,
      rawConfidence,
      evidenceGrade,
      missingInputCount: missingInputs.length,
      analysisSource,
      calibration,
      reasonCodes: reasons,
      outcomeProbabilityClaimed: false,
    },
  };
}
