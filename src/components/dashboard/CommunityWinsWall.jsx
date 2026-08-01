import React, { useState } from "react";
import { K, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";

const REVIEW_CARD_KEY = "pg_outcome_review_cards_v1";

export default function CommunityWinsWall() {
  const [entries] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(REVIEW_CARD_KEY) || "[]");
      return Array.isArray(value) ? value.filter((entry) => entry?.attestation === "self-reported-local") : [];
    } catch {
      return [];
    }
  });

  if (!entries.length) return null;

  return (
    <div style={{ ...S.card, marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: K.ac, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 4 }}>Outcome Review Board</div>
        <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx }}>Your local self-reported review cards</div>
        <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.5, marginTop: 4 }}>These cards never imply community consensus or independent verification. They stay on this device.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        {entries.slice(0, 6).map((entry) => {
          const total = Number(entry.realizedProfit) || 0;
          return (
            <div key={entry.id} style={{ padding: "12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px" }}>{entry.periodLabel}</span>
                <span style={{ fontSize: 8, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>self-report</span>
              </div>
              <div style={{ fontFamily: fontD, fontSize: 24, fontWeight: 800, color: total >= 0 ? K.ac : K.rd, marginBottom: 4 }}>{total >= 0 ? "+" : "-"}${Math.abs(total).toFixed(2)}</div>
              <div style={{ fontSize: 10, color: K.dm, lineHeight: 1.5 }}>{entry.reviewedRows} local ledger row{entry.reviewedRows === 1 ? "" : "s"} · {entry.books} book label{entry.books === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
