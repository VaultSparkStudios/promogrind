import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// Inline SVG icons for each primary nav group. Stroked, 24×24 viewBox, legible at 22px.
const NAV_ICON = {
  Home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v10a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" />
    </svg>
  ),
  Convert: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 7H19m0 0l-3-3m3 3l-3 3M16 17H5m0 0l3 3M5 17l3-3" />
    </svg>
  ),
  Calculate: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <rect x="7" y="6" width="10" height="4" rx="0.5" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx="9" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Track: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Live: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Learn: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
};

// Short display labels for compact mobile bar (Calculate → Calc, etc.)
const NAV_LABEL = {
  Home: "Home",
  Convert: "Convert",
  Calculate: "Calc",
  Track: "Track",
  Live: "Live",
  Learn: "Learn",
};

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
      aria-label="Main navigation"
      className="pg-mobile-nav"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `${K.s1}f0`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -6px 24px rgba(0,0,0,0.18)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        const icon = NAV_ICON[tab.group];
        const label = NAV_LABEL[tab.group] || tab.group.slice(0, 5);
        return (
          <button
            key={tab.group}
            onClick={() => goTo(index, 0)}
            aria-label={tab.group}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "8px 2px 9px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              position: "relative",
              color: isActive ? K.gn : K.mt,
              transition: "color 0.18s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Active top indicator bar */}
            <div style={{
              position: "absolute",
              top: 0, left: "22%", right: "22%",
              height: 2,
              borderRadius: "0 0 3px 3px",
              background: isActive ? K.gn : "transparent",
              transition: "background 0.18s ease",
            }} />
            {/* Active background pill */}
            <div style={{
              position: "absolute",
              top: 3, left: "10%", right: "10%", bottom: 5,
              borderRadius: 10,
              background: isActive ? `${K.gn}12` : "transparent",
              transition: "background 0.18s ease",
            }} />
            {/* Icon */}
            <span style={{ position: "relative", zIndex: 1, lineHeight: 1, display: "flex" }}>
              {icon ?? <span style={{ fontSize: 12, fontWeight: 700 }}>{tab.group.slice(0, 3).toUpperCase()}</span>}
            </span>
            {/* Label */}
            <span style={{
              position: "relative",
              zIndex: 1,
              fontSize: 9,
              fontWeight: isActive ? 700 : 400,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
