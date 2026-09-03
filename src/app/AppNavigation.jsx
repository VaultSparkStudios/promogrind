import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// Minimal SVG icons for the mobile bottom nav — 20×20 viewBox, stroke-based
const NavIconHome = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"
      fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
    <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"
      fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} />
  </svg>
);
const NavIconConvert = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 7h14M14 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 13H3M6 10l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const NavIconCalculate = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 7h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7.5" cy="11" r="1" fill="currentColor" />
    <circle cx="10" cy="11" r="1" fill="currentColor" />
    <circle cx="12.5" cy="11" r="1" fill="currentColor" />
    <circle cx="7.5" cy="14.5" r="1" fill="currentColor" />
    <circle cx="10" cy="14.5" r="1" fill="currentColor" />
    <circle cx="12.5" cy="14.5" r="1" fill="currentColor" />
  </svg>
);
const NavIconTrack = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <polyline points="3,14 7,9 10,11.5 14,5.5 17,8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="17" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const NavIconLive = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="2.5" fill="currentColor" />
    <path d="M5.86 5.86a6 6 0 0 0 0 8.49" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14.14 5.86a6 6 0 0 1 0 8.49" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const NavIconLearn = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 3L2 8l8 5 8-5-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M5.5 10.5V14a4.5 3 0 0 0 9 0v-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GROUP_ICONS = {
  Home: NavIconHome,
  Convert: NavIconConvert,
  Calculate: NavIconCalculate,
  Track: NavIconTrack,
  Live: NavIconLive,
  Learn: NavIconLearn,
};

export const MOBILE_NAV_ICON_CSS = `
  .pg-mobile-nav-btn { transition: color 0.15s, opacity 0.15s; }
  @media (prefers-reduced-motion: reduce) { .pg-mobile-nav-btn { transition: none !important; } }
  .pg-mobile-nav-btn:active { opacity: 0.65; }
  .pg-mobile-nav-indicator {
    position: absolute; top: 0; left: 20%; right: 20%;
    height: 2px; border-radius: 0 0 2px 2px;
    transition: opacity 0.15s;
  }
  @media (prefers-reduced-motion: reduce) { .pg-mobile-nav-indicator { transition: none !important; } }
`;

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

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <nav
      className="pg-mobile-nav"
      aria-label="Main navigation"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(180deg,${K.s1} 0%,${K.s2} 100%)`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -10px 28px rgba(0,0,0,0.26)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS + MOBILE_NAV_ICON_CSS}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        const Icon = GROUP_ICONS[tab.group] || NavIconHome;
        const shortLabel = tab.group === "Calculate" ? "Calc" : tab.group;
        return (
          <button
            key={tab.group}
            className="pg-mobile-nav-btn"
            onClick={() => goTo(index, 0)}
            aria-label={tab.group}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              minHeight: 52,
              padding: "7px 4px 6px",
              background: "none",
              border: "none",
              color: active ? K.gn : K.mt,
              cursor: "pointer",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              position: "relative",
            }}
          >
            <span
              className="pg-mobile-nav-indicator"
              aria-hidden="true"
              style={{ background: K.gn, opacity: active ? 1 : 0 }}
            />
            <Icon active={active} />
            <span style={{ fontWeight: active ? 700 : 400, lineHeight: 1 }}>{shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
