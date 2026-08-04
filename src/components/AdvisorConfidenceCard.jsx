import React from "react";
import { K } from "../lib/shared.js";

export default function AdvisorConfidenceCard({ governor }) {
  if (!governor) return null;
  const tone = governor.posture === "act" ? K.gn : governor.posture === "verify" ? K.yl : K.rd;
  const calibration = governor.calibration?.showable
    ? `${governor.calibration.calibration}% calibration · n=${governor.calibration.sample}`
    : `Calibration cold start · n=${governor.calibration?.sample || 0}/10`;
  return (
    <div role="status" aria-label={`Advisor posture: ${governor.label}`} style={{ padding: 10, borderRadius: 8, background: `${tone}0C`, border: `1px solid ${tone}45` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
        <div style={{ color: tone, fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>{governor.label}</div>
        <div style={{ color: K.mt, fontSize: 9 }}>Raw {governor.rawConfidence} · {governor.evidenceGrade} evidence</div>
      </div>
      <div style={{ color: K.dm, fontSize: 10, lineHeight: 1.55, marginBottom: 4 }}>{governor.summary}</div>
      <div style={{ color: K.tx, fontSize: 10, lineHeight: 1.55, fontWeight: 700 }}>{governor.instruction}</div>
      <div style={{ color: K.mt, fontSize: 9, marginTop: 5 }}>{calibration} · {governor.analysisSource.replace(/_/g, " ")} source · no outcome probability inferred</div>
    </div>
  );
}
