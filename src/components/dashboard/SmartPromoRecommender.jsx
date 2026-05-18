import React, { useMemo, useState } from "react";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { getDashboardSnapshot } from "../../dashboard/today.js";
import { K } from "../../lib/shared.js";
import { S } from "../../ui.jsx";
import { buildDecayCurve, computeExecutionDeadline, renderSparkline } from "../../lib/edgeDecay.js";
import { recordTermsSnapshot } from "../../lib/termsDrift.js";
import { summarizeNearestMistake } from "../../lib/mistakeMemory.js";

function ExplainerDrawer({ promo, terms, deadline, decayCurve, memorySignal }) {
  const rows = [
    {
      label: "Terms drift",
      value:
        terms?.status === "drift" ? "TERMS CHANGED — re-read before placing"
        : terms?.status === "stable" ? "stable since last snapshot"
        : "first time seen",
      tone:
        terms?.status === "drift" ? K.yl
        : terms?.status === "stable" ? K.gn
        : K.mt,
    },
    {
      label: "Edge decay",
      value:
        decayCurve?.expiresMs
          ? `${decayCurve.horizonHours}h to expiry · ${decayCurve.samples?.length || 0}-pt curve`
          : "no hard expiry · stable EV",
      tone: decayCurve?.expiresMs && decayCurve.horizonHours < 24 ? K.rd : K.mt,
    },
    {
      label: "Execution deadline",
      value:
        deadline?.expired ? "edge floor passed"
        : deadline ? `${Number.isFinite(deadline.hoursRemaining) ? deadline.hoursRemaining + "h" : "stable"} until edge floor`
        : "no floor set",
      tone:
        deadline?.expired ? K.rd
        : deadline && deadline.hoursRemaining <= 8 ? K.rd
        : K.mt,
    },
    {
      label: "Outcome memory",
      value:
        memorySignal
          ? `${memorySignal.label}: ${memorySignal.detail}`
          : "no settled-sample signal yet",
      tone:
        memorySignal?.direction === "up" ? K.gn
        : memorySignal?.direction === "down" ? K.yl
        : K.mt,
    },
    {
      label: "Rank weights",
      value:
        Array.isArray(promo.whyRanked) && promo.whyRanked.length
          ? promo.whyRanked.map((c) => `${c.label} ${c.delta >= 0 ? "+" : ""}${c.delta}`).join(" · ")
          : "no ablation weights computed",
      tone: K.mt,
    },
  ];
  return (
    <div
      data-explainer="open"
      style={{
        marginTop: 6,
        padding: "8px 10px",
        background: K.s1,
        border: `1px solid ${K.bd}`,
        borderRadius: 6,
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        columnGap: 10,
        rowGap: 4,
        fontSize: 10,
      }}
    >
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <div style={{ color: K.mt, textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 9 }}>
            {r.label}
          </div>
          <div style={{ color: r.tone, lineHeight: 1.4 }}>{r.value}</div>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SmartPromoRecommender({ data }) {
  const today = new Date();
  const [openExplainerIdx, setOpenExplainerIdx] = useState(null);
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
          const terms = (() => {
            try {
              const promoId = `${p.book || "book"}:${p.promo || "promo"}`;
              return recordTermsSnapshot({ promoId, termsText: p.terms || p.detail || p.promo, storage: window.localStorage });
            } catch {
              return { status: "new" };
            }
          })();
          const deadline = computeExecutionDeadline(p, 0.35);
          const decayCurve = buildDecayCurve(p);
          const mistakeSummary = (() => {
            try {
              const ledger = Array.isArray(data?.resultFeedback) ? data.resultFeedback : Array.isArray(data?.bets) ? data.bets : [];
              return summarizeNearestMistake(
                { book: p.book, promoType: p.promo, rollover: p.rollover, qualifier: p.qualifier, stake: p.suggestedStake },
                ledger,
              );
            } catch {
              return null;
            }
          })();
          const explainerOpen = openExplainerIdx === i;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", background: K.s2, borderRadius: 6, border: `1px solid ${isUrgent ? K.rd + "60" : K.bd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
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
                {terms.status === "drift" && <span style={{ ...S.tag(K.yl), marginLeft: 6, fontSize: 8 }}>TERMS CHANGED</span>}
                {mistakeSummary && (
                  <span data-testid="mistake-chip" title={mistakeSummary.chipDetail} style={{ ...S.tag(K.yl), marginLeft: 6, fontSize: 8 }}>
                    ⚠ similar prior loss
                  </span>
                )}
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
                {deadline && !deadline.expired && (
                  <div style={{ fontSize: 9, color: deadline.hoursRemaining <= 8 ? K.rd : K.yl, marginTop: 4, lineHeight: 1.4 }}>
                    Execute before edge floor: {Number.isFinite(deadline.hoursRemaining) ? `${deadline.hoursRemaining}h` : "stable"}
                  </div>
                )}
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
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  data-testid={`explainer-toggle-${i}`}
                  aria-expanded={explainerOpen}
                  onClick={() => setOpenExplainerIdx(explainerOpen ? null : i)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${K.bd}`,
                    color: K.mt,
                    fontSize: 9,
                    padding: "2px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {explainerOpen ? "Hide details ▴" : "Details ▾"}
                </button>
              </div>
              {explainerOpen && (
                <ExplainerDrawer
                  promo={p}
                  terms={terms}
                  deadline={deadline}
                  decayCurve={decayCurve}
                  memorySignal={memorySignal}
                />
              )}
            </div>
          );
        })}
      </div>
      {!activeBooks.length && <div style={{ fontSize: 10, color: K.mt, marginTop: 6 }}>Set book statuses in the Sportsbooks tracker to get personalized recommendations.</div>}
    </div>
  );
}
