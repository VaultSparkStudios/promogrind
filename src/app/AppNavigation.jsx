import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

export function QuickCalcPanel({ goTo }) {
  const [open, setOpen] = useState(false);
  const quickItems = [
    { n: "Bonus Bet", gi: 1, ti: 0 },
    { n: "Profit Boost", gi: 1, ti: 1 },
    { n: "No-Vig", gi: 2, ti: 0 },
    { n: "+EV", gi: 2, ti: 2 },
    { n: "2-Way Arb", gi: 2, ti: 4 },
  ];

  return (
    <div className="pg-quick-calc" style={{ position: "fixed", bottom: 84, left: 14, zIndex: 200 }}>
      <style>{`@media (min-width: 640px) { .pg-quick-calc { display: none !important; } }`}</style>
      {open && (
        <div style={{ background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 14, padding: 10, marginBottom: 8, boxShadow: "0 16px 36px rgba(0,0,0,0.38)", minWidth: 180 }}>
          {quickItems.map((item) => (
            <button key={item.n} onClick={() => { goTo(item.gi, item.ti); setOpen(false); }} style={{ display: "block", width: "100%", padding: "10px 12px", background: "transparent", border: "none", color: K.tx, cursor: "pointer", textAlign: "left", fontSize: 12, fontFamily: font, borderBottom: `1px solid ${K.bd}`, borderRadius: 0 }}>
              {item.n}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen((value) => !value)} style={{ padding: "10px 14px", background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 999, color: K.ac, fontSize: 11, cursor: "pointer", fontFamily: font, fontWeight: 700, boxShadow: "0 10px 24px rgba(0,0,0,0.3)" }}>
        {open ? "Close" : "Quick"}
      </button>
    </div>
  );
}

export function CalcSearch({ allCalcs, onNavigate, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = q.trim()
    ? allCalcs.filter((calc) => calc.n.toLowerCase().includes(q.toLowerCase()) || calc.group.toLowerCase().includes(q.toLowerCase()))
    : allCalcs;

  return (
    <div data-backdrop-dismiss onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, padding: "80px 16px 16px" }}>
      <div style={{ background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 12, padding: 20, width: "100%", maxWidth: 480, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <input ref={inputRef} value={q} onChange={(event) => setQ(event.target.value)} placeholder={SEARCH_UI.calculatorPlaceholder} style={{ ...S.input, fontSize: 14, marginBottom: 12 }} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.map((calc) => (
            <button key={calc.slug} onClick={() => { onNavigate(calc.slug); onClose(); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 12px", background: "transparent", border: "none", borderBottom: `1px solid ${K.bd}`, color: K.tx, cursor: "pointer", textAlign: "left", fontFamily: font }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{calc.n}</span>
              <span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>{calc.group}</span>
            </button>
          ))}
          {!filtered.length && <div style={{ textAlign: "center", padding: 24, color: K.mt, fontSize: 12 }}>No matches</div>}
        </div>
        <div style={{ fontSize: 10, color: K.mt, marginTop: 8, textAlign: "center" }}>Press Esc to close. Press ? anywhere to reopen.</div>
      </div>
    </div>
  );
}

const NAV_ICONS = ["⊟", "⇄", "∑", "◉", "⚡", "◎"];
const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];
const MOBILE_NAV_ANIMATION_CSS = `
  @keyframes pg-nav-active { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .pg-mobile-nav-btn { -webkit-tap-highlight-color: transparent; transition: color 0.18s ease, opacity 0.18s ease; }
  .pg-mobile-nav-btn:active { opacity: 0.6; }
  @media (prefers-reduced-motion: reduce) { .pg-mobile-nav-btn { transition: none; } }
`;

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <div className="pg-mobile-nav" role="tablist" aria-label="Primary navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS + MOBILE_NAV_ANIMATION_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        return (
          <button
            key={tab.group}
            className="pg-mobile-nav-btn"
            role="tab"
            aria-selected={isActive}
            onClick={() => goTo(index, 0)}
            style={{
              flex: 1,
              minHeight: 44,
              padding: "8px 4px",
              background: "none",
              border: "none",
              borderTop: isActive ? `2px solid ${K.gn}` : "2px solid transparent",
              color: isActive ? K.gn : K.mt,
              cursor: "pointer",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
              {NAV_ICONS[index] || tab.group[0]}
            </span>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: isActive ? 700 : 400 }}>
              {NAV_LABELS[index] || tab.group}
            </span>
          </button>
        );
      })}
    </div>
  );
}
