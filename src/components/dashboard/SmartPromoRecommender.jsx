import React, { useMemo } from "react";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { getDashboardSnapshot } from "../../dashboard/today.js";
import { K } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { buildDecayCurve, renderSparkline } from "../../lib/edgeDecay.js";

export default function SmartPromoRecommender({ data }) {
  const today = new Date();
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDay = DAY_NAMES[today.getDay()];
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const todayStr = today.toISOString().split("T")[0];
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const activeBooks = useMemo(() =>
    Object.entries(data.bookStatus || {})
      .filter(([, v]) => v === "active" || v === "Active")
      .map(([k]) => k),
    [data.bookStatus],
  );
  const limitedBooks = useMemo(() =>
    Object.entries(data.bookStatus || {})
      .filter(([, v]) => v === "limited" || v === "Limited" || v === "gubbed" || v === "Gubbed")
      .map(([k]) => k),
    [data.bookStatus],
  );
  const doneBooks = data.done || {};
  const openBets = useMemo(() => (data.bets || []).filter((b) => b.status === "open"), [data.bets]);
  const expiringSoon = useMemo(() => PROMO_SCHED.filter((p) => p.expires && p.expires >= todayStr && p.expires <= in3Days), [todayStr, in3Days]);
  const bankroll = (() => { try { return localStorage.getItem("pg_bankroll") || ""; } catch { return ""; } })();
  const snapshot = useMemo(() => getDashboardSnapshot(data || {}, PROMO_SCHED, today, bankroll), [data, today, bankroll]);
  const recs = useMemo(() => {
    const ranked = snapshot.adaptivePlan?.topPromos;
    if (Array.isArray(ranked) && ranked.length) return ranked;
    return PROMO_SCHED
      .filter((p) => {
        const dayMatch = p.day === "Daily" || p.day === todayDay || (p.day === "Weekend" && isWeekend);
        if (!dayMatch) return false;
        if (!activeBooks.length) return p.grade === "A";
        return activeBooks.includes(p.book) && !doneBooks[p.book];
      })
      .sort((a, b) => {
        const gradeScore = { A: 3, B: 2, C: 1 };
        const urgency = (x) => expiringSoon.find((e) => e.book === x.book && e.promo === x.promo) ? 2 : 0;
        return (gradeScore[b.grade] || 0) + urgency(b) - ((gradeScore[a.grade] || 0) + urgency(a));
      })
      .slice(0, 5);
  }, [activeBooks, doneBooks, todayDay, isWeekend, expiringSoon, snapshot.adaptivePlan?.topPromos]);

  if (!recs.length && !openBets.length && !limitedBooks.length) return null;
  return (
    <div style={{ ...S.card, border: `1px solid ${K.gn}30`, background: `${K.gn}05`, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: K.gn, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1.5px" }}>Today&apos;s Action Plan</div>
      {snapshot.adaptivePlan?.headline && (
        <div style={{ marginBottom: 8, padding: "8px 12px", background: `${K.ac}0a`, border: `1px solid ${K.ac}30`, borderRadius: 6, fontSize: 11, color: K.dm, lineHeight: 1.6 }}>
          <strong style={{ color: K.ac }}>{snapshot.adaptivePlan.headline}.</strong> {snapshot.adaptivePlan.detail}
        </div>
      )}
      {openBets.length > 0 && (
        <div style={{ marginBottom: 8, padding: "7px 12px", background: `${K.yl}0a`, border: `1px solid ${K.yl}30`, borderRadius: 6, fontSize: 11, color: K.yl }}>
          ⚡ You have <strong>{openBets.length}</strong> open bet{openBets.length > 1 ? "s" : ""} — check results before placing new hedges.
        </div>
      )}
      {limitedBooks.length > 0 && (
        <div style={{ marginBottom: 8, padding: "7px 12px", background: `${K.rd}0a`, border: `1px solid ${K.rd}30`, borderRadius: 6, fontSize: 11, color: K.rd }}>
          ⚠ {limitedBooks.join(", ")} {limitedBooks.length > 1 ? "are" : "is"} limited/gubbed — skip these promos today.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {recs.map((p, i) => {
          const isUrgent = expiringSoon.find((e) => e.book === p.book && e.promo === p.promo);
          const score = Number.isFinite(p.score) ? p.score : null;
          const reasons = Array.isArray(p.reasons) ? p.reasons : [];
          const memorySignal = p.memorySignal || null;
          const memoryColor = memorySignal?.direction === "up" ? K.gn : memorySignal?.direction === "down" ? K.yl : K.ac;
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 12px", background: K.s2, borderRadius: 6, border: `1px solid ${isUrgent ? K.rd + "60" : K.bd}` }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{p.book}</span>
                <span style={{ fontSize: 11, color: K.dm, marginLeft: 8 }}>{p.promo}</span>
                {p.complexity && <span style={{ ...S.tag(p.complexity === "Easy" ? K.gn : p.complexity === "Medium" ? K.yl : K.rd), marginLeft: 6, fontSize: 8 }}>{p.complexity}</span>}
                {p.timeMin && <span style={{ fontSize: 9, color: K.mt, marginLeft: 6 }}>~{p.timeMin}m</span>}
                {isUrgent && <span style={{ ...S.tag(K.rd), marginLeft: 6, fontSize: 8 }}>EXPIRES SOON</span>}
                {reasons.includes("hot lane") && <span style={{ ...S.tag(K.gn), marginLeft: 6, fontSize: 8 }}>HOT LANE</span>}
                {reasons.includes("cold lane") && <span style={{ ...S.tag(K.yl), marginLeft: 6, fontSize: 8 }}>COLD LANE</span>}
                {reasons.includes("backlog pressure") && <span style={{ ...S.tag(K.ac), marginLeft: 6, fontSize: 8 }}>CLEAR BACKLOG</span>}
                {reasons.includes("limit risk") && <span style={{ ...S.tag(K.rd), marginLeft: 6, fontSize: 8 }}>LIMIT RISK</span>}
                {memorySignal && (
                  <div style={{ fontSize: 9, color: memoryColor, marginTop: 4, lineHeight: 1.35 }}>
                    {memorySignal.label}: {memorySignal.detail}
                  </div>
                )}
                {(() => {
                  const curve = buildDecayCurve(p);
                  const spark = renderSparkline(curve.samples);
                  const tone = curve.expiresMs ? (curve.horizonHours < 24 ? K.rd : K.yl) : K.mt;
                  return (
                    <div style={{ fontSize: 9, color: tone, marginTop: 4, fontFamily: "monospace", letterSpacing: "1px" }}>
                      EV decay {spark} {curve.expiresMs ? `${curve.horizonHours}h left` : "no hard expiry"}
                    </div>
                  );
                })()}
                {Array.isArray(p.whyRanked) && p.whyRanked.length > 0 && (
                  <div style={{ fontSize: 9, color: K.mt, marginTop: 4, lineHeight: 1.4 }}>
                    Why #{p.baselineRank || i + 1}: {p.whyRanked.map((c) => {
                      const sign = c.delta >= 0 ? "+" : "";
                      const shift = c.rankShift ? ` (would drop ${c.rankShift > 0 ? "+" : ""}${c.rankShift})` : "";
                      return `${c.label} ${sign}${c.delta}${shift}`;
                    }).join(" · ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: K.gn }}>{p.value}</span>
                {score !== null && <span style={{ fontSize: 9, color: score >= 5 ? K.gn : score >= 3 ? K.ac : K.yl, fontWeight: 800 }}>S{score}</span>}
                <span style={S.tag(p.grade === "A" ? K.gn : p.grade === "B" ? K.ac : K.mt)}>{p.grade}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!activeBooks.length && <div style={{ fontSize: 10, color: K.mt, marginTop: 6 }}>Set book statuses in the Sportsbooks tracker to get personalized recommendations.</div>}
    </div>
  );
}
