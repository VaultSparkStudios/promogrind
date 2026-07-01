import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppDataCtx } from "../contexts.jsx";
import { K, font } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";
import { buildCommandDeck } from "../lib/commandDeck.js";
import { flagVisit } from "../lib/missions.js";
import { useViewport } from "../app/responsive.js";

const STATE_META = {
  act: { label: "Needs your eyes", color: () => K.yl },
  live: { label: "Live signal", color: () => K.gn },
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
      <Tl t="Operator Command Deck" badge="INTELLIGENCE" bc={K.ac} />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: K.mt, lineHeight: 1.7, maxWidth: 560 }}>
          Every intelligence module watching your operation, ranked by what needs your eyes. Each card states the decision it helps you make and what it currently knows.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="Deck summary">
          {["act", "live", "idle"].map((state) => {
            const count = deck.summary[state];
            if (!count) return null;
            const meta = STATE_META[state];
            const color = meta.color();
            return (
              <span key={state} style={{ padding: "4px 10px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 999, fontSize: 10, fontWeight: 700, color }}>
                {count} {meta.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      <div role="list" aria-label="Intelligence modules" style={{ display: "grid", gridTemplateColumns: columns, gap: 10 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: K.tx }}>{module.name}</div>
                <span style={{ fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ fontSize: 10, color: K.mt, lineHeight: 1.6, fontStyle: "italic" }}>{module.decision}</div>
              <div style={{ fontSize: 11, color: module.line ? K.dm : K.mt, lineHeight: 1.6, flex: 1 }}>
                {module.line || module.coach || "No signal yet."}
              </div>
              <button
                onClick={() => navigate(`/${module.slug}`)}
                aria-label={`Open ${module.name}`}
                style={{
                  alignSelf: "flex-start",
                  padding: "5px 12px",
                  background: "transparent",
                  border: `1px solid ${K.bd2}`,
                  borderRadius: 999,
                  color: K.ac,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                {module.line ? "Act on it →" : "Feed it →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
