import React, { useContext, useMemo } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { K } from "../lib/shared.js";
import { computeStreak } from "../lib/streaks.js";

/**
 * Compact, source-truth review-cadence chip used in desktop and mobile chrome.
 * Rendering this component has no write side effects: a visit is not evidence.
 */
export default function DailyStreak() {
  const { appData } = useContext(AppDataCtx) || {};
  const cadence = useMemo(() => computeStreak(appData || {}), [appData]);
  if (!cadence.current) return null;

  const evidenceCount = Object.values(cadence.evidence || {}).reduce((sum, value) => sum + value, 0);
  return (
    <div
      title={`${evidenceCount} reviewed outcome${evidenceCount === 1 ? "" : "s"}; losses and reasoned skips count equally.`}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: `${K.ac}12`, borderRadius: 50, border: `1px solid ${K.ac}30` }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: K.ac }}>{cadence.current}-day review cadence</span>
    </div>
  );
}
