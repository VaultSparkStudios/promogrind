import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppDataCtx } from "../contexts.jsx";
import { K, font } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";
import { buildCommandDeck } from "../lib/commandDeck.js";
import { flagVisit } from "../lib/missions.js";
import { useViewport } from "../app/responsive.js";

const STATE_META = {
  act: { label: "Review needed", color: () => K.yl },
  live: { label: "Summary available", color: () => K.gn },
  idle: { label: "Waiting on data", color: () => K.mt },
};

export default function CommandDeck() {
  useEffect(() => { flagVisit('command-deck'); }, []);
  const { appData } = React.useContext(AppDataCtx) || {};
  const navigate = useNavigate();
  const viewport = useViewport();
  const columns = viewport.isDesktop ? "repeat(3, minmax(0, 1fr))" : viewport.isTablet ? "repeat(2, minmax(0, 1fr))" : "1fr";
  const deck = useMemo(() => buildCommandDeck(appData || {}), [appData]);

  return (
    <div style={S.card}>
      <Tl t="Workspace review" badge="YOUR RECORDS" bc={K.ac} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: K.mt, lineHeight: 1.7, maxWidth: 560 }}>
          Review your recorded activity and open the tools that explain it. These summaries use your saved data; they do not monitor live sportsbook offers.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="Deck summary">
          {["act", "live", "idle"].map((state) => {
            const count = deck.summary[state];
            if (!count) return null;
            const meta = STATE_META[state];
            const color = meta.color();
            return (
              <span key={state} style={{ padding: "4px 10px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 999, fontSize: 12, fontWeight: 700, color }}>
                {count} {meta.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      <div role="list" aria-label="Workspace review tools" style={{ display: "grid", gridTemplateColumns: columns, gap: 10 }}>
        {deck.modules.map((module) => {
          const meta = STATE_META[module.state];
          const color = meta.color();
          return (
            <div
              key={module.key}
              role="listitem"
              style={{
                padding: 12,
                background: module.state === "act" ? `${color}08` : K.s2,
                border: `1px solid ${module.state === "act" ? `${color}40` : K.bd}`,
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: K.tx }}>{module.name}</div>
                <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ fontSize: 14, color: K.mt, lineHeight: 1.6 }}>{module.decision}</div>
              <div style={{ fontSize: 14, color: module.line ? K.dm : K.mt, lineHeight: 1.6, flex: 1 }}>
                {module.line || module.coach || "No signal yet."}
              </div>
              <button
                onClick={() => navigate(`/${module.slug}`)}
                aria-label={`Open ${module.name}`}
                style={{
                  alignSelf: "flex-start",
                  padding: "5px 12px",
                  minHeight: 44,
                  background: "transparent",
                  border: `1px solid ${K.bd2}`,
                  borderRadius: 999,
                  color: K.ac,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                Open tool →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
