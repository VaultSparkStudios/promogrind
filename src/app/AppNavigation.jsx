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

const NAV_ICONS = [
  // Home — house
  <svg key="home" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M5 21V10" /><path d="M19 21V10" />
  </svg>,
  // Convert — exchange arrows
  <svg key="convert" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>,
  // Calc — grid calculator
  <svg key="calc" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" strokeWidth="2.5" /><line x1="12" y1="10" x2="12" y2="10" strokeWidth="2.5" /><line x1="16" y1="10" x2="16" y2="10" strokeWidth="2.5" /><line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" /><line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" /><line x1="8" y1="18" x2="8" y2="18" strokeWidth="2.5" /><line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" /><line x1="16" y1="14" x2="16" y2="18" />
  </svg>,
  // Track — bar chart
  <svg key="track" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="3" y1="20" x2="21" y2="20" />
  </svg>,
  // Live — pulse/radar
  <svg key="live" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M8.5 8.5a5 5 0 0 0 0 7" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M5 5a10 10 0 0 0 0 14" /><path d="M19 5a10 10 0 0 1 0 14" />
  </svg>,
  // Learn — open book
  <svg key="learn" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>,
];

const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

const NAV_ACTIVE_CSS = `
  @keyframes pgNavPulse {
    0% { opacity: 0.6; transform: scaleX(0.7); }
    100% { opacity: 1; transform: scaleX(1); }
  }
`;

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <div
      className="pg-mobile-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: `linear-gradient(180deg,${K.s1}ee,${K.s2}f8)`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS}{NAV_ACTIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        const color = active ? K.gn : K.mt;
        return (
          <button
            key={tab.group}
            onClick={() => goTo(index, 0)}
            aria-label={NAV_LABELS[index] || tab.group}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              padding: "8px 2px 7px",
              background: "none",
              border: "none",
              color,
              cursor: "pointer",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              position: "relative",
              transition: "color 0.18s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {active && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 2.5,
                  borderRadius: "0 0 3px 3px",
                  background: K.gn,
                  boxShadow: `0 0 8px ${K.gn}88`,
                  animation: "pgNavPulse 0.22s ease-out both",
                }}
              />
            )}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: 8,
                background: active ? `${K.gn}14` : "transparent",
                transition: "background 0.18s ease",
              }}
            >
              {NAV_ICONS[index] || (
                <span style={{ fontSize: 13, fontWeight: 700 }}>{tab.group[0]}</span>
              )}
            </span>
            <span
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontWeight: active ? 700 : 400,
                lineHeight: 1,
              }}
            >
              {NAV_LABELS[index] || tab.group}
            </span>
          </button>
        );
      })}
    </div>
  );
}
