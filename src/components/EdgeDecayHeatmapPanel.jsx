import React, { useMemo } from "react";
import { K, font } from "../lib/shared.js";
import { buildEdgeDecayHeatmap, buildHeatmapPromoRows } from "../lib/edgeDecayHeatmap.js";

export { buildHeatmapPromoRows };

const TONE_META = {
  stable: { label: "Stable", color: () => K.gn },
  fresh: { label: "Fresh", color: () => K.ac },
  warm: { label: "Warm", color: () => K.yl },
  critical: { label: "Critical", color: () => K.rd },
  expired: { label: "Expired", color: () => K.mt },
};

const TONE_ORDER = ["critical", "warm", "fresh", "stable", "expired"];

function horizonLabel(cell) {
  if (cell.expired) return "expired";
  if (!Number.isFinite(cell.horizonHours)) return "no hard expiry";
  if (cell.horizonHours >= 48) return `${Math.round(cell.horizonHours / 24)}d left`;
  return `${Math.round(cell.horizonHours)}h left`;
}

export default function EdgeDecayHeatmapPanel({ appData, now }) {
  const heatmap = useMemo(
    () => buildEdgeDecayHeatmap(buildHeatmapPromoRows(appData || {}), now ? { now } : {}),
    [appData, now],
  );

  const grouped = useMemo(() => {
    const byBook = new Map();
    for (const cell of heatmap.cells) {
      if (!byBook.has(cell.book)) byBook.set(cell.book, []);
      byBook.get(cell.book).push(cell);
    }
    return [...byBook.entries()];
  }, [heatmap]);

  return (
    <div
      role="region"
      aria-label="Edge decay heatmap"
      style={{ padding: 12, background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 10, marginBottom: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: K.tx }}>Illustrative time-decay model</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-hidden="true">
          {TONE_ORDER.map((tone) => {
            const count = heatmap.summary[tone] || 0;
            if (!count) return null;
            const meta = TONE_META[tone];
            const color = meta.color();
            return (
              <span key={tone} style={{ padding: "3px 8px", background: `${color}14`, border: `1px solid ${color}30`, borderRadius: 999, fontSize: 12, fontWeight: 700, color }}>
                {count} {meta.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.6, marginBottom: 10 }}>
        An illustrative curve based on dates you enter for active books. Percentages describe the model, not measured expected value or verified current offers. Check operator terms separately.
      </div>

      {heatmap.cells.length === 0 && (
        <div style={{ fontSize: 12, color: K.mt }}>
          Mark books active in the Sportsbooks tracker and enter an expiry date to build a model. No current offer or deadline is inferred from an empty workspace.
        </div>
      )}

      {heatmap.movers.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {heatmap.movers.map((cell) => {
            const color = TONE_META[cell.tone].color();
            return (
              <div
                key={`mover-${cell.book}-${cell.label}`}
                aria-label={`Top mover: ${cell.book} ${cell.label}, ${horizonLabel(cell)}`}
                style={{ padding: "6px 10px", background: `${color}0c`, border: `1px solid ${color}30`, borderRadius: 8, fontSize: 12, fontFamily: font }}
              >
                <span style={{ color, fontWeight: 800 }}>{cell.book}</span>
                <span style={{ color: K.dm }}> · {cell.label} · {horizonLabel(cell)}</span>
              </div>
            );
          })}
        </div>
      )}

      {grouped.length > 0 && (
        <div role="list" aria-label="Decay grid by sportsbook" style={{ display: "grid", gap: 6 }}>
          {grouped.map(([book, cells]) => (
            <div key={book} role="listitem" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: K.dm, minWidth: 86 }}>{book}</div>
              {cells.map((cell) => {
                const color = TONE_META[cell.tone].color();
                const intensity = cell.expired ? "10" : cell.tone === "critical" ? "2e" : cell.tone === "warm" ? "22" : "16";
                return (
                  <div
                    key={`${cell.book}-${cell.label}`}
                    aria-label={`${cell.book} ${cell.label}: ${TONE_META[cell.tone].label}, ${cell.remainingPct}% edge remaining, ${horizonLabel(cell)}`}
                    title={`${cell.label} · ${cell.remainingPct}% edge · ${horizonLabel(cell)}`}
                    style={{
                      padding: "5px 8px",
                      background: `${color}${intensity}`,
                      border: `1px solid ${color}40`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: cell.expired ? K.mt : K.tx,
                      textDecoration: cell.expired ? "line-through" : "none",
                    }}
                  >
                    {cell.label} <span style={{ color, fontWeight: 800 }}>{cell.remainingPct}%</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
