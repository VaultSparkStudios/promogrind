import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// SVG icons keyed by tab group name — 20×20 viewport, currentColor
const NAV_ICONS = {
  Home: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0}
      />
      <rect x="7.5" y="12" width="5" height="6" rx="0.75" stroke="currentColor" strokeWidth={active ? 1.6 : 1.4} />
    </svg>
  ),
  Convert: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 7h12M13 4l3 3-3 3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H4M7 10l-3 3 3 3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Calculate: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth={active ? 1.8 : 1.5} />
      <path d="M7 7h2M11 7h2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M7 10h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M7 13h2M11 13h2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  ),
  Track: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polyline points="3,14 7,9 11,12 17,5" stroke="currentColor" strokeWidth={active ? 1.9 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="5" r="1.8" fill="currentColor" />
    </svg>
  ),
  Live: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l1.8 5.5H17l-4.6 3.35 1.75 5.4L10 14.1l-4.15 3.15 1.75-5.4L3 8.5h5.2L10 3z"
        stroke="currentColor" strokeWidth={active ? 1.7 : 1.4} strokeLinejoin="round"
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0}
      />
    </svg>
  ),
  Learn: ({ active }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 5a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
        stroke="currentColor" strokeWidth={active ? 1.8 : 1.5}
        fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}
      />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  ),
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

const NAV_LABELS = { Calculate: "Calc" };

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <div
      className="pg-mobile-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: `linear-gradient(180deg, ${K.s1} 0%, ${K.s2} 100%)`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        padding: "6px 0 env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28)",
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        const Icon = NAV_ICONS[tab.group];
        const label = NAV_LABELS[tab.group] || tab.group;
        return (
          <button
            key={tab.group}
            onClick={() => goTo(index, 0)}
            aria-label={tab.group}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              padding: "6px 2px 4px",
              background: "none",
              border: "none",
              color: active ? K.gn : K.mt,
              cursor: "pointer",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontFamily: font,
              fontWeight: active ? 700 : 400,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              position: "relative",
              transition: "color 0.15s ease",
            }}
          >
            {active && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 2,
                  background: K.gn,
                  borderRadius: "0 0 2px 2px",
                  boxShadow: `0 1px 8px ${K.gn}80`,
                }}
              />
            )}
            {Icon ? <Icon active={active} /> : <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.group[0]}</span>}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
