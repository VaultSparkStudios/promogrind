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

// Compact 24×24 SVG icons for the 6 primary nav tabs.
// Fill=none on the parent; individual paths/shapes use stroke only unless noted.
function NavTabIcon({ index, active }) {
  const c = active ? K.gn : K.mt;
  const sw = "1.7";
  const base = { viewBox: "0 0 24 24", width: 22, height: 22, fill: "none", stroke: c, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  switch (index) {
    case 0: // Home – house
      return (
        <svg {...base}>
          <path d="M3 11.5L12 4L21 11.5V20H15V15H9V20H3V11.5Z"/>
        </svg>
      );
    case 1: // Convert – double swap arrow
      return (
        <svg {...base}>
          <path d="M7 10L3 6L7 2M3 6H18"/>
          <path d="M17 14L21 18L17 22M21 18H6"/>
        </svg>
      );
    case 2: // Calculate – calculator body + display + keypad dots
      return (
        <svg {...base}>
          <rect x="5" y="2" width="14" height="20" rx="2.5"/>
          <rect x="7.5" y="5" width="9" height="4" rx="1"/>
          {[[9,14],[12,14],[15,14],[9,18],[12,18],[15,18]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill={c} stroke="none"/>
          ))}
        </svg>
      );
    case 3: // Track – vertical bar chart
      return (
        <svg {...base}>
          <rect x="3" y="14" width="4" height="7" rx="1"/>
          <rect x="10" y="8" width="4" height="13" rx="1"/>
          <rect x="17" y="3" width="4" height="18" rx="1"/>
        </svg>
      );
    case 4: // Live – lightning bolt
      return (
        <svg {...base}>
          <path d="M13 2L5 13H11L10 22L19 11H13L13 2Z" fill={active ? `${K.gn}28` : "none"}/>
        </svg>
      );
    default: // Learn – open book
      return (
        <svg {...base}>
          <path d="M2 4C2 4 5.5 3 12 3C18.5 3 22 4 22 4V19C22 19 18.5 18 12 18C5.5 18 2 19 2 19V4Z"/>
          <line x1="12" y1="3" x2="12" y2="18"/>
        </svg>
      );
  }
}

const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

// CSS injected once per render; scoped to .pg-mobile-nav and .pg-nav-btn.
// Respects prefers-reduced-motion so animations don't run for users who opt out.
const NAV_EXTRA_CSS = `
  @media (prefers-reduced-motion: reduce) {
    .pg-mobile-nav .pg-nav-indicator { transition: none !important; }
    .pg-nav-btn { transition-duration: 0ms !important; }
  }
  .pg-nav-btn:focus-visible { outline: 2px solid var(--pg-nav-accent, #4ade80); outline-offset: -3px; border-radius: 8px; }
`;

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [pressed, setPressed] = useState(-1);
  const count = tabs.length;

  return (
    <nav
      className="pg-mobile-nav"
      aria-label="Primary navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        // Frosted-glass background: semi-opaque so backdropFilter shows through.
        background: `linear-gradient(180deg,${K.s1}ee,${K.s2}f8)`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
        boxShadow: "0 -6px 24px rgba(0,0,0,0.32), 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS + NAV_EXTRA_CSS}</style>

      {/* Sliding top-edge indicator — GPU-composited translateX, no layout thrash */}
      <div
        className="pg-nav-indicator"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${100 / count}%`,
          height: 2,
          display: "flex",
          justifyContent: "center",
          transform: `translateX(${gi * 100}%)`,
          transition: "transform 260ms cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "40%",
            height: 2,
            borderRadius: 99,
            background: K.gn,
            boxShadow: `0 0 8px ${K.gn}90`,
          }}
        />
      </div>

      {/* Tab row — safe-area padding lives here so the indicator stays flush */}
      <div
        role="tablist"
        style={{
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom,0px)",
        }}
      >
        {tabs.map((tab, index) => {
          const active = gi === index;
          const isPressed = pressed === index;
          return (
            <button
              key={tab.group}
              className="pg-nav-btn"
              role="tab"
              aria-selected={active}
              aria-label={NAV_LABELS[index] || tab.group}
              onClick={() => goTo(index, 0)}
              onPointerDown={() => setPressed(index)}
              onPointerUp={() => setPressed(-1)}
              onPointerCancel={() => setPressed(-1)}
              style={{
                flex: 1,
                // ≥44px tap target: 50px min-height satisfies CANON-041
                minHeight: 50,
                padding: "8px 2px 9px",
                background: "none",
                border: "none",
                color: active ? K.gn : K.mt,
                cursor: "pointer",
                fontFamily: font,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                // Smooth color + press-scale transitions
                transition: "color 180ms ease, transform 100ms ease",
                transform: isPressed ? "scale(0.86)" : "scale(1)",
                willChange: "transform",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <NavTabIcon index={index} active={active} />
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: active ? 700 : 400,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                {NAV_LABELS[index] || tab.group}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
