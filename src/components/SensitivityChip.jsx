import React from "react";
import { K, font } from "../lib/shared.js";

/**
 * Render a compact inline chip next to a calculator result showing how much
 * the guaranteed profit moves if the hedge line shifts ±10%.
 *
 * Pass the sensitivity summary object from `sensitivityBonus/Boost/First` in
 * `src/lib/shared.js`. If `summary` is falsy the chip renders nothing, so
 * callers can safely pass-through null.
 */
export default function SensitivityChip({ summary, label = "±10% odds shift", compact = false }) {
  if (!summary) return null;
  const tone = summary.stable ? K.gn : K.yl;
  return (
    <div
      title="How much the guaranteed profit moves if the hedge line drifts 10% in either direction."
      aria-label={`Sensitivity band: $${summary.bandLow} to $${summary.bandHigh} with ±10% odds shift`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "3px 7px" : "4px 9px",
        marginTop: 6,
        borderRadius: 6,
        border: `1px solid ${tone}40`,
        background: `${tone}0d`,
        color: tone,
        fontSize: compact ? 10 : 11,
        fontFamily: font,
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden="true">{summary.stable ? "▬" : "↕"}</span>
      <span style={{ fontWeight: 600 }}>±${summary.deltaPer10pct}</span>
      <span style={{ color: K.mt }}>· {label}</span>
    </div>
  );
}
