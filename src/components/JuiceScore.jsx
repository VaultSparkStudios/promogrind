import React from "react";
import { buildModelSignal, juiceColor } from "../lib/juiceScore.js";
import { fontD } from "../lib/shared.js";

export default function JuiceScore({ score, basis, assumption }) {
  if (score == null || isNaN(score)) return null;
  const color = juiceColor(score);
  const receipt = buildModelSignal({ score, basis, assumption });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 8, marginTop: 10 }}>
      <div style={{ textAlign: "center", minWidth: 52 }}>
        <div style={{ fontFamily: fontD, fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 8, color, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 1 }}>MODEL</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{receipt.label}</div>
        <div style={{ height: 4, background: "#1c2536", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: 4, background: color, width: `${score}%`, transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)", borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: "#7a8fa8", marginTop: 3 }}>{receipt.basis} · {receipt.confidence}</div>
        <div style={{ fontSize: 9, color: "#7a8fa8", marginTop: 2 }}>{receipt.assumption} {receipt.interpretation}</div>
      </div>
    </div>
  );
}
