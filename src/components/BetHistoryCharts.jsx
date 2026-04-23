import React, { useMemo, useContext } from "react";
import { AppDataCtx } from "../contexts.jsx";
import { K, f, font, fontD } from "../lib/shared.js";

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekStart(iso) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

function HBar({ label, value, maxVal, color }) {
  const pct = maxVal > 0 ? Math.min(100, Math.max(2, Math.abs(value / maxVal) * 100)) : 0;
  const positive = value >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 90, fontSize: 10, color: K.mt, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 16, background: K.s3, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || (positive ? K.gn : K.rd), borderRadius: 3, transition: "width 0.4s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      <div style={{ width: 56, fontSize: 10, fontWeight: 700, color: positive ? K.gn : K.rd, textAlign: "right", flexShrink: 0 }}>
        {positive ? "+" : "-"}${f(Math.abs(value), 0)}
      </div>
    </div>
  );
}

function WeekBar({ week, value, maxAbs, label }) {
  const positive = value >= 0;
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
      <div style={{ fontSize: 9, color: positive ? K.gn : K.rd, fontWeight: 700 }}>{value !== 0 ? `${positive ? "+" : "-"}$${f(Math.abs(value), 0)}` : ""}</div>
      <div style={{ width: "100%", height: 60, background: K.s3, borderRadius: 3, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ width: "100%", height: `${Math.max(4, pct)}%`, background: positive ? `${K.gn}90` : `${K.rd}90`, borderRadius: "3px 3px 0 0", transition: "height 0.4s" }} />
      </div>
      <div style={{ fontSize: 8, color: K.mt, textAlign: "center" }}>{label}</div>
    </div>
  );
}

function computeCharts(ledger) {
  const byBook = {};
  const byType = {};
  const byWeek = {};

  for (const e of ledger) {
    const profit = parseFloat(e.profit) || 0;
    const book = e.book || "Unknown";
    const type = e.type || "Other";
    const ws = e.date ? weekStart(e.date) : null;

    byBook[book] = (byBook[book] || 0) + profit;
    byType[type] = (byType[type] || 0) + profit;
    if (ws) byWeek[ws] = (byWeek[ws] || 0) + profit;
  }

  const bookEntries = Object.entries(byBook).sort(([, a], [, b]) => b - a).slice(0, 8);
  const typeEntries = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 8);

  // Last 8 weeks
  const today = new Date().toISOString().slice(0, 10);
  const weeks = [];
  let cursor = weekStart(today);
  for (let i = 0; i < 8; i++) {
    const ws = cursor;
    const label = ws.slice(5).replace("-", "/");
    weeks.unshift({ ws, label, value: byWeek[ws] || 0 });
    cursor = weekStart(addDays(ws, -1));
  }

  return { bookEntries, typeEntries, weeks };
}

export default function BetHistoryCharts() {
  const { appData } = useContext(AppDataCtx) || {};
  const ledger = useMemo(() => Array.isArray(appData?.ledger) ? appData.ledger.filter(e => (parseFloat(e.profit) || 0) !== 0) : [], [appData?.ledger]);

  const { bookEntries, typeEntries, weeks } = useMemo(() => computeCharts(ledger), [ledger]);

  if (ledger.length < 2) {
    return (
      <div style={{ padding: "12px 14px", background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: font, marginBottom: 4 }}>Performance Charts</div>
        <div style={{ fontSize: 11, color: K.mt }}>Log at least 2 plays in the Ledger to see your performance breakdown.</div>
      </div>
    );
  }

  const maxBook = Math.max(...bookEntries.map(([, v]) => Math.abs(v)), 1);
  const maxType = Math.max(...typeEntries.map(([, v]) => Math.abs(v)), 1);
  const maxWeek = Math.max(...weeks.map(w => Math.abs(w.value)), 1);
  const totalProfit = bookEntries.reduce((s, [, v]) => s + v, 0);
  const bestBook = bookEntries[0];
  const bestType = typeEntries[0];

  return (
    <div style={{ background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: font, marginBottom: 12 }}>Performance Breakdown</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ padding: "10px 14px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 9, color: K.mt, marginBottom: 2 }}>All-Time Profit</div>
          <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: totalProfit >= 0 ? K.gn : K.rd }}>{totalProfit >= 0 ? "+" : "-"}${f(Math.abs(totalProfit), 0)}</div>
        </div>
        {bestBook && (
          <div style={{ padding: "10px 14px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 9, color: K.mt, marginBottom: 2 }}>Best Book</div>
            <div style={{ fontFamily: fontD, fontSize: 13, fontWeight: 800, color: K.gn }}>{bestBook[0]}</div>
            <div style={{ fontSize: 10, color: K.gn }}>+${f(bestBook[1], 0)}</div>
          </div>
        )}
        {bestType && (
          <div style={{ padding: "10px 14px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8, flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 9, color: K.mt, marginBottom: 2 }}>Best Promo Type</div>
            <div style={{ fontFamily: fontD, fontSize: 13, fontWeight: 800, color: K.ac }}>{bestType[0]}</div>
            <div style={{ fontSize: 10, color: K.ac }}>+${f(bestType[1], 0)}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Profit by Sportsbook</div>
          {bookEntries.map(([book, val]) => (
            <HBar key={book} label={book} value={val} maxVal={maxBook} />
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Profit by Promo Type</div>
          {typeEntries.map(([type, val]) => (
            <HBar key={type} label={type} value={val} maxVal={maxType} color={K.pp} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Weekly Profit Trend (last 8 weeks)</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          {weeks.map(w => <WeekBar key={w.ws} week={w.ws} value={w.value} maxAbs={maxWeek} label={w.label} />)}
        </div>
      </div>
    </div>
  );
}
