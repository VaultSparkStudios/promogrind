import React, { useContext, useMemo } from "react";
import { K, font } from "../lib/shared.js";
import { AppDataCtx } from "../contexts.jsx";
import { calculatorAccuracy } from "../track/insights.js";

/**
 * Render a small trust badge beside calculator results showing how accurate
 * this exact calculator (optionally scoped by promo type or book) has been
 * for this user based on their own settlement feedback.
 *
 * Renders nothing when there is no settled data — avoids empty-state noise on
 * first use. Once sample size ≥ MIN_TRUST_SAMPLES it surfaces a medium/high
 * confidence readout; below that it shows a "Building confidence" label.
 *
 * Props:
 *   calculatorKey — required; matches feedback entry.calculatorKey
 *   promoType     — optional; scope the aggregate to a promo type
 *   book          — optional; scope the aggregate to a book name
 *   compact       — inline 12px vs default 13px
 */
export default function CalculatorTrustBadge({ calculatorKey, promoType = null, book = null, compact = false }) {
  const ctx = useContext(AppDataCtx);
  const feedback = ctx?.appData?.resultFeedback;
  const summary = useMemo(
    () => calculatorAccuracy({ feedback, calculatorKey, promoType, book }),
    [feedback, calculatorKey, promoType, book],
  );

  if (!summary.sampleSize) return null;

  const tone =
    summary.confidence === "high"
      ? K.gn
      : summary.confidence === "medium"
      ? K.ac
      : K.mt;

  const driftNote = (() => {
    if (summary.averageDrift === null || summary.averageDrift === undefined) return null;
    const sign = summary.averageDrift >= 0 ? "+" : "−";
    const abs = Math.abs(summary.averageDrift);
    if (abs < 0.5) return "drift ±0";
    return `drift ${sign}$${abs.toFixed(2)}/entry`;
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: compact ? "4px 8px" : "6px 10px",
        marginTop: 8,
        borderRadius: 999,
        border: `1px solid ${tone}40`,
        background: `${tone}0d`,
        color: tone,
        fontSize: compact ? 10 : 11,
        fontFamily: font,
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700 }}>
        {summary.confidence === "low" ? "🌱" : summary.confidence === "medium" ? "✓" : "★"}
      </span>
      <span>{summary.label}</span>
      {driftNote && (
        <span style={{ color: K.mt, fontWeight: 500, marginLeft: 4 }}>· {driftNote}</span>
      )}
    </div>
  );
}
