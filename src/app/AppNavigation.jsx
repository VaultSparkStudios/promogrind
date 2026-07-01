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
    <div onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, padding: "80px 16px 16px" }}>
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

const NAV_ICONS = [
  // Home — house
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"/>
      <path d="M9 21V13h6v8"/>
    </svg>
  ),
  // Convert — exchange arrows
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  ),
  // Calc — calculator grid
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="10" y2="11"/>
      <line x1="14" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="10" y2="15"/>
      <line x1="14" y1="15" x2="16" y2="15"/>
      <line x1="8" y1="19" x2="10" y2="19"/>
      <line x1="14" y1="19" x2="16" y2="19"/>
    </svg>
  ),
  // Track — activity pulse
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  // Live — lightning bolt (filled when active)
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={color} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  // Learn — open book
  (active, color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
];

const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <div className="pg-mobile-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: `rgba(15,21,32,0.82)`,
      backdropFilter: "blur(18px) saturate(160%)",
      WebkitBackdropFilter: "blur(18px) saturate(160%)",
      borderTop: `1px solid rgba(96,165,250,0.10)`,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: "0 -1px 0 rgba(96,165,250,0.08), 0 -16px 40px rgba(0,0,0,0.36)",
    }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      <style>{`
        .pg-mobile-nav-btn { -webkit-tap-highlight-color: transparent; transition: opacity 0.12s; }
        .pg-mobile-nav-btn:active { opacity: 0.6; }
      `}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        const color = active ? K.gn : K.mt;
        const iconRenderer = NAV_ICONS[index];
        return (
          <button
            key={tab.group}
            className="pg-mobile-nav-btn"
            onClick={() => goTo(index, 0)}
            aria-label={NAV_LABELS[index] || tab.group}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1, minHeight: 54, padding: "8px 4px 6px",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              position: "relative",
            }}
          >
            {active && (
              <span style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 36, height: 2, borderRadius: 2,
                background: `linear-gradient(90deg, ${K.gn}88, ${K.gn}, ${K.gn}88)`,
                boxShadow: `0 0 8px ${K.gn}88`,
              }} />
            )}
            {iconRenderer ? iconRenderer(active, color) : null}
            <span style={{
              fontFamily: font, fontSize: 9, fontWeight: active ? 700 : 400,
              color, textTransform: "uppercase", letterSpacing: "0.6px", lineHeight: 1,
            }}>
              {NAV_LABELS[index] || tab.group}
            </span>
          </button>
        );
      })}
    </div>
  );
}
