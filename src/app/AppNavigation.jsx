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

// Inline SVG tab icons — no external deps, stroke-based for theme compatibility
function IconHome({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L11 3.5L19 10.5V19H15V14H7V19H3V10.5Z" />
    </svg>
  );
}

function IconConvert({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8H16" />
      <path d="M12 4.5L16 8L12 11.5" />
      <path d="M19 14H6" />
      <path d="M10 10.5L6 14L10 17.5" />
    </svg>
  );
}

function IconCalc({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="14" height="18" rx="2.5" />
      <line x1="4" y1="8.5" x2="18" y2="8.5" />
      <line x1="10" y1="8.5" x2="10" y2="20" />
    </svg>
  );
}

function IconTrack({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 17L7 11L11 14L16 7L20 9" />
      <line x1="2" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function IconLive({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="2.5" fill="currentColor" stroke="none" />
      <path d="M7 15a5.7 5.7 0 0 1 0-8" />
      <path d="M15 15a5.7 5.7 0 0 0 0-8" />
      <path d="M4 18a10 10 0 0 1 0-14" />
      <path d="M18 18a10 10 0 0 0 0-14" />
    </svg>
  );
}

function IconLearn({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4C11 4 6.5 6 3 6V17C6.5 17 11 15 11 15S15.5 17 19 17V6C15.5 6 11 4 11 4Z" />
      <line x1="11" y1="4" x2="11" y2="15" />
    </svg>
  );
}

const NAV_ICONS = [IconHome, IconConvert, IconCalc, IconTrack, IconLive, IconLearn];
const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

export function MobileBottomNav({ gi, goTo, tabs }) {
  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: `6px 0 env(safe-area-inset-bottom, 4px)`, boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{`
        ${MOBILE_NAV_RESPONSIVE_CSS}
        .pg-nav-btn { -webkit-tap-highlight-color: transparent; transition: opacity 0.15s, transform 0.12s; }
        .pg-nav-btn:active { opacity: 0.65; transform: scale(0.92); }
      `}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        const Icon = NAV_ICONS[index] || NAV_ICONS[0];
        const label = NAV_LABELS[index] || tab.group;
        return (
          <button
            key={tab.group}
            className="pg-nav-btn"
            onClick={() => goTo(index, 0)}
            aria-label={label}
            aria-pressed={active}
            style={{
              flex: 1,
              padding: "6px 2px 8px",
              background: "none",
              border: "none",
              color: active ? K.gn : K.mt,
              cursor: "pointer",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              position: "relative",
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1 }}>
              {label}
            </span>
            {/* Active indicator pill */}
            <span
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: active ? 18 : 0,
                height: 2.5,
                borderRadius: 999,
                background: K.gn,
                transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
                opacity: active ? 1 : 0,
              }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
