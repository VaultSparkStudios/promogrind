import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// Inline SVG icons for each navigation group — stroke-based, 16×16 viewBox
function NavIcon({ name, color = "currentColor", size = 20 }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "Home":
      return (
        <svg {...p}>
          <path d="M1 7.5L8 1l7 6.5V15H5v-4.5H3V15H1z" />
          <rect x="6.5" y="10" width="3" height="5" rx="0.5" />
        </svg>
      );
    case "Convert":
      return (
        <svg {...p}>
          <path d="M2 5h10M9 2l3 3-3 3" />
          <path d="M14 11H4M7 8l-3 3 3 3" />
        </svg>
      );
    case "Calculate":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M8 5v6M5 8h6" />
        </svg>
      );
    case "Track":
      return (
        <svg {...p}>
          <path d="M2 13h3V7H2zM6.5 13h3V4h-3zM11 13h3V9h-3z" />
          <path d="M1 13h14" />
        </svg>
      );
    case "Live":
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="2" />
          <path d="M4.5 4.5A4.9 4.9 0 0 0 3 8a4.9 4.9 0 0 0 1.5 3.5" />
          <path d="M11.5 4.5A4.9 4.9 0 0 1 13 8a4.9 4.9 0 0 1-1.5 3.5" />
        </svg>
      );
    case "Learn":
      return (
        <svg {...p}>
          <path d="M8 1L1 5l7 4 7-4-7-4z" />
          <path d="M4 7.5V12l4 2.5 4-2.5V7.5" />
        </svg>
      );
    default:
      return <span style={{ fontSize: 14, lineHeight: 1, color }}>{name[0]}</span>;
  }
}

// Short labels for bottom nav tabs (abbreviated to fit small buttons)
const TAB_LABELS = {
  Home: "Home",
  Convert: "Convert",
  Calculate: "Calc",
  Track: "Track",
  Live: "Live",
  Learn: "Learn",
};

// Slide-up 100dvh group drawer — shows all items in the current group
function MobileGroupDrawer({ group, ti, onSelect, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${group.group} navigation`}
      style={{ position: "fixed", inset: 0, zIndex: 300 }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />
      {/* Drawer panel — fills from 10dvh down to just above the nav bar */}
      <div
        className="pg-group-drawer"
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          top: "max(10dvh, 60px)",
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          borderRadius: "20px 20px 0 0",
          borderTop: `1px solid ${K.bd2}`,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px 12px",
            borderBottom: `1px solid ${K.bd}`,
            flexShrink: 0,
            background: `linear-gradient(90deg, ${K.gn}08, transparent)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NavIcon name={group.group} color={K.gn} size={18} />
            <span
              style={{
                fontFamily: fontD,
                fontSize: 15,
                fontWeight: 800,
                color: K.tx,
                letterSpacing: "-0.3px",
              }}
            >
              {group.group}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: K.s3,
              border: `1px solid ${K.bd2}`,
              color: K.dm,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: font,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        {/* Scrollable item list */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            WebkitOverflowScrolling: "touch",
            padding: "6px 0 max(env(safe-area-inset-bottom, 0px), 16px)",
          }}
        >
          {group.items.map((item, i) => {
            const isActive = ti === i;
            return (
              <button
                key={item.slug}
                onClick={() => onSelect(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "15px 18px",
                  background: isActive ? `${K.gn}12` : "transparent",
                  border: "none",
                  borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                  borderBottom: `1px solid ${K.bd}30`,
                  color: isActive ? K.gn : K.tx,
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: font,
                  boxSizing: "border-box",
                  transition: "background 0.1s",
                }}
              >
                <span>{item.n}</span>
                {item.pro && (
                  <span
                    style={{
                      fontSize: 9,
                      color: K.pp,
                      border: `1px solid ${K.pp}50`,
                      borderRadius: 4,
                      padding: "2px 6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes pg-drawer-slide-up {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pg-group-drawer {
          animation: pg-drawer-slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  );
}

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

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when the active group changes (e.g., programmatic navigation)
  useEffect(() => { setDrawerOpen(false); }, [gi]);

  const handleTabPress = (index) => {
    if (index === gi) {
      setDrawerOpen((v) => !v);
    } else {
      goTo(index, 0);
      setDrawerOpen(false);
    }
  };

  const handleItemSelect = (itemIndex) => {
    goTo(gi, itemIndex);
    setDrawerOpen(false);
  };

  return (
    <>
      {drawerOpen && (
        <MobileGroupDrawer
          group={tabs[gi]}
          ti={ti ?? 0}
          onSelect={handleItemSelect}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: `linear-gradient(180deg,${K.s1},${K.s2})`,
          borderTop: `1px solid ${K.bd}`,
          display: "flex",
          zIndex: 100,
          padding: "6px 0 env(safe-area-inset-bottom,0px)",
          boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const color = isActive ? K.gn : K.mt;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabPress(index)}
              aria-label={tab.group}
              aria-pressed={isActive && drawerOpen}
              style={{
                flex: 1,
                padding: "6px 4px 4px",
                background: "none",
                border: "none",
                color,
                cursor: "pointer",
                fontFamily: font,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                transition: "opacity 0.1s",
              }}
            >
              {/* Active indicator bar at top */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "25%",
                  right: "25%",
                  height: 2,
                  borderRadius: "0 0 2px 2px",
                  background: isActive ? K.gn : "transparent",
                  transition: "background 0.15s",
                }}
              />
              <NavIcon name={tab.group} color={color} size={20} />
              <span
                style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontWeight: isActive ? 700 : 400,
                  lineHeight: 1,
                }}
              >
                {TAB_LABELS[tab.group] || tab.group}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
