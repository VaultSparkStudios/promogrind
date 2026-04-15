import React, { useMemo, useState } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { K, f, font, fontD } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";
import { buildTrackInsights, formatPromoTypeLabel, updateResultFeedback } from "../track/insights.js";

function metricCard(label, value, sub, color = K.tx) {
  return (
    <div style={{ padding: 14, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 10 }}>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fontD, fontSize: 25, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: K.mt }}>{sub}</div>
    </div>
  );
}

export default function TrackInsights() {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const insights = useMemo(() => buildTrackInsights(appData || {}, new Date()), [appData]);
  const [drafts, setDrafts] = useState({});

  const saveDraft = (id, key, value) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), [key]: value } }));
  };

  const settle = (entry) => {
    const draft = drafts[entry.id] || {};
    if (!syncAppData || !String(draft.actualProfit || "").trim()) return;
    const nextEntries = updateResultFeedback(appData?.resultFeedback || [], entry.id, {
      status: "settled",
      actualProfit: draft.actualProfit,
      calculatorAccurate: draft.calculatorAccurate || "yes",
      book: draft.book ?? entry.book,
    });
    syncAppData({ ...appData, resultFeedback: nextEntries });
    setDrafts((current) => ({ ...current, [entry.id]: { actualProfit: "", calculatorAccurate: "yes", book: draft.book ?? entry.book } }));
  };

  return (
    <div style={S.card}>
      <Tl t="Track Edge Dashboard" badge="ANALYTICS" bc={K.ac} />

      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, marginBottom: 14 }}>
        Aggregate realized P/L, promo hit rate, calculator accuracy, and the books actually producing profit.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
        {metricCard("Realized P/L", `${insights.totalProfit >= 0 ? "+" : "-"}$${f(Math.abs(insights.totalProfit))}`, `Last 7d: ${insights.recent7Profit >= 0 ? "+" : "-"}$${f(Math.abs(insights.recent7Profit))}`, insights.totalProfit >= 0 ? K.gn : K.rd)}
        {metricCard("Month Profit", `${insights.monthProfit >= 0 ? "+" : "-"}$${f(Math.abs(insights.monthProfit))}`, `${insights.settledCount} settled workflow${insights.settledCount === 1 ? "" : "s"}`, insights.monthProfit >= 0 ? K.ac : K.rd)}
        {metricCard("Promo Hit Rate", insights.hitRate === null ? "—" : `${f(insights.hitRate, 0)}%`, insights.hitRate === null ? "Needs settled workflow data" : `${insights.settledCount} settled`, insights.hitRate !== null && insights.hitRate >= 70 ? K.gn : K.yl)}
        {metricCard("Calc Accuracy", insights.accuracyRate === null ? "—" : `${f(insights.accuracyRate, 0)}%`, insights.accuracyRate === null ? "Mark settled outcomes first" : "Yes + close responses", insights.accuracyRate !== null && insights.accuracyRate >= 75 ? K.gn : K.yl)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, alignItems: "start", marginBottom: 14 }}>
        <div style={{ padding: 12, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 10 }}>Hit Rate By Promo Type</div>
          {insights.promoTypeRows.length === 0 && <div style={{ fontSize: 11, color: K.mt }}>No result feedback yet. Mark placed or skipped workflows from the conversion calculators.</div>}
          {insights.promoTypeRows.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {insights.promoTypeRows.map((row) => (
                <div key={row.key} style={{ padding: 10, background: K.s3, borderRadius: 8, border: `1px solid ${K.bd}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{row.label}</div>
                    <div style={{ fontSize: 11, color: row.actualProfit >= 0 ? K.gn : K.rd, fontWeight: 700 }}>
                      {row.settled ? `${row.actualProfit >= 0 ? "+" : "-"}$${f(Math.abs(row.actualProfit))}` : `${row.placed} placed`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: K.mt }}>
                    <span>Placed: <strong style={{ color: K.tx }}>{row.placed}</strong></span>
                    <span>Skipped: <strong style={{ color: K.tx }}>{row.skipped}</strong></span>
                    <span>Settled: <strong style={{ color: K.tx }}>{row.settled}</strong></span>
                    <span>Hit rate: <strong style={{ color: row.hitRate !== null && row.hitRate >= 70 ? K.gn : K.tx }}>{row.hitRate === null ? "—" : `${f(row.hitRate, 0)}%`}</strong></span>
                    <span>Accuracy: <strong style={{ color: row.accuracyRate !== null && row.accuracyRate >= 75 ? K.gn : K.tx }}>{row.accuracyRate === null ? "—" : `${f(row.accuracyRate, 0)}%`}</strong></span>
                    <span>Avg drift: <strong style={{ color: row.averageDrift !== null && row.averageDrift >= 0 ? K.gn : K.rd }}>{row.averageDrift === null ? "—" : `${row.averageDrift >= 0 ? "+" : "-"}$${f(Math.abs(row.averageDrift))}`}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 12, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: K.tx, marginBottom: 10 }}>Best Books</div>
          {insights.bookRows.length === 0 && <div style={{ fontSize: 11, color: K.mt }}>No book-level data yet. Log ledger entries or feedback with sportsbook names.</div>}
          {insights.bookRows.length > 0 && insights.bookRows.slice(0, 6).map((row) => (
            <div key={row.book} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${K.bd}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{row.book}</div>
                <div style={{ fontSize: 10, color: K.mt }}>
                  {row.ledgerEntries} ledger entr{row.ledgerEntries === 1 ? "y" : "ies"}
                  {row.hitRate !== null ? ` · ${f(row.hitRate, 0)}% settled hit rate` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: row.realizedProfit >= 0 ? K.gn : K.rd }}>
                {row.realizedProfit >= 0 ? "+" : "-"}${f(Math.abs(row.realizedProfit))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 12, background: `${K.yl}06`, border: `1px solid ${K.yl}25`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: K.yl, marginBottom: 10 }}>Unsettled Workflow Queue</div>
        {insights.openFeedback.length === 0 && <div style={{ fontSize: 11, color: K.mt }}>No open feedback entries. Once you mark a workflow as placed, it will appear here until you settle it.</div>}
        {insights.openFeedback.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {insights.openFeedback.map((entry) => {
              const draft = drafts[entry.id] || { actualProfit: "", calculatorAccurate: "yes", book: entry.book };
              return (
                <div key={entry.id} style={{ padding: 12, background: K.s3, borderRadius: 8, border: `1px solid ${K.bd}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{entry.calculatorLabel}</div>
                      <div style={{ fontSize: 10, color: K.mt }}>
                        {formatPromoTypeLabel(entry.promoType)} · expected {entry.expectedProfit === null ? "—" : `$${f(entry.expectedProfit)}`} · {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: K.yl, fontWeight: 700 }}>Waiting to settle</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(120px, 1fr) auto", gap: 10, alignItems: "end" }}>
                    <div>
                      <div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Book</div>
                      <input value={draft.book || ""} onChange={(event) => saveDraft(entry.id, "book", event.target.value)} style={{ width: "100%", padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontFamily: font, fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Actual profit</div>
                      <input value={draft.actualProfit || ""} onChange={(event) => saveDraft(entry.id, "actualProfit", event.target.value)} placeholder="$11.25" style={{ width: "100%", padding: "8px 10px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, color: K.tx, fontFamily: font, fontSize: 12 }} />
                    </div>
                    <button onClick={() => settle(entry)} style={{ padding: "9px 14px", background: K.ac, border: "none", borderRadius: 8, color: K.bg, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: font }}>
                      Settle
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {[
                      ["yes", "Accurate"],
                      ["close", "Close"],
                      ["no", "Off"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => saveDraft(entry.id, "calculatorAccurate", value)}
                        style={{
                          padding: "5px 10px",
                          background: (draft.calculatorAccurate || "yes") === value ? `${K.ac}18` : "transparent",
                          border: `1px solid ${(draft.calculatorAccurate || "yes") === value ? K.ac : K.bd2}`,
                          borderRadius: 999,
                          color: (draft.calculatorAccurate || "yes") === value ? K.ac : K.dm,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: font,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
