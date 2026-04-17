import React from "react";
import { BOOKS } from "../../books.js";
import { f, K, font, fontD } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { streakEmoji, streakLabel, streakMilestone } from "../../lib/streaks.js";

export default function DashboardHero({ totalProfit, openBetsCount, booksComplete, navigate, streak = 0 }) {
  const percent = Math.min(100, Math.round((booksComplete / BOOKS.length) * 100));
  const stage = booksComplete === 0 ? "Get Started" : booksComplete < 5 ? "Beginner" : booksComplete < 12 ? "Intermediate" : booksComplete < 20 ? "Advanced" : "Pro Grinder";
  const emoji = streakEmoji(streak);
  const label = streakLabel(streak);
  const milestone = streakMilestone(streak);
  return (
    <div style={{ ...S.card, background: `linear-gradient(135deg,${K.s1},${K.s2})`, border: `1px solid ${K.bd2}`, marginBottom: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontFamily: fontD, fontSize: 11, fontWeight: 700, color: K.ac, textTransform: "uppercase", letterSpacing: "2px" }}>Grinder Level: {stage}</div>
            {label && (
              <div style={{ padding: "2px 8px", background: streak >= 3 ? `${K.yl}20` : `${K.mt}15`, border: `1px solid ${streak >= 3 ? K.yl : K.mt}40`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: streak >= 3 ? K.yl : K.mt, whiteSpace: "nowrap" }}>
                {emoji ? `${emoji} ` : ""}{label}
              </div>
            )}
          </div>
          {milestone && (
            <div style={{ fontSize: 10, color: K.yl, fontWeight: 700, marginBottom: 4 }}>🎉 {milestone}-day milestone reached!</div>
          )}
          <div style={{ fontFamily: fontD, fontSize: 26, fontWeight: 800, color: totalProfit >= 0 ? K.gn : K.rd, marginBottom: 4 }}>
            {totalProfit >= 0 ? "+" : "-"}${f(Math.abs(totalProfit))}
          </div>
          <div style={{ fontSize: 11, color: K.mt }}>Total profit extracted · {booksComplete}/{BOOKS.length} books done</div>
          <div style={{ height: 4, background: K.s3, borderRadius: 2, marginTop: 8, width: 220 }}>
            <div style={{ height: 4, borderRadius: 2, background: K.gn, width: `${percent}%`, transition: "width 0.4s" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {openBetsCount > 0 && <div style={{ padding: "10px 16px", background: `${K.yl}10`, border: `1px solid ${K.yl}30`, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: K.yl }}>{openBetsCount}</div>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>Open Bets</div>
          </div>}
          {streak > 0 && <div style={{ padding: "10px 16px", background: streak >= 3 ? `${K.yl}10` : `${K.mt}10`, border: `1px solid ${streak >= 3 ? K.yl : K.mt}30`, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: streak >= 3 ? K.yl : K.mt }}>{streak}</div>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>Day Streak</div>
          </div>}
          <button onClick={() => navigate("/ledger")} style={{ padding: "10px 16px", background: `${K.ac}15`, border: `1px solid ${K.ac}30`, borderRadius: 8, color: K.ac, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font, whiteSpace: "nowrap" }}>
            Log Profit →
          </button>
        </div>
      </div>
    </div>
  );
}
