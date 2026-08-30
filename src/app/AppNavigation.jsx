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

// Inline SVG icons for each tab group
const TAB_ICONS = [
  // Home
  <svg key="home" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>,
  // Convert
  <svg key="convert" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 014-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 01-4 4H3"/>
  </svg>,
  // Calculate
  <svg key="calc" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="8" y1="17" x2="12" y2="17"/>
  </svg>,
  // Track
  <svg key="track" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <rect x="2" y="20" width="20" height="2" rx="1"/>
  </svg>,
  // Live
  <svg key="live" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>,
  // Learn
  <svg key="learn" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>,
];

const GRID_ICON = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const CLOSE_ICON = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// 100dvh scrollable full-screen mobile nav drawer (CANON-041)
function MobileNavDrawer({ open, onClose, gi, ti, tabs, goTo }) {
  const drawerRef = useRef(null);

  // Trap focus and close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Scroll active item into view when drawer opens
  useEffect(() => {
    if (!open || !drawerRef.current) return;
    const active = drawerRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      {/* Drawer — slides up from bottom, full 100dvh */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="All tools navigation"
        aria-modal="true"
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          height: "100dvh",
          zIndex: 1200,
          background: `linear-gradient(180deg, ${K.s1} 0%, ${K.s2} 100%)`,
          borderTop: `1px solid ${K.bd2}`,
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          willChange: "transform",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px 12px", flexShrink: 0,
          borderBottom: `1px solid ${K.bd}40`,
        }}>
          <div>
            <div style={{ fontFamily: "var(--pg-font-display, monospace)", fontSize: 15, fontWeight: 800, color: K.gn, letterSpacing: "-0.3px" }}>
              All Tools
            </div>
            <div style={{ fontSize: 10, color: K.mt, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>
              {tabs.reduce((n, g) => n + g.items.length, 0)} tools across {tabs.length} categories
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${K.bd}40`, border: `1px solid ${K.bd2}`,
              color: K.dm, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {CLOSE_ICON}
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0 env(safe-area-inset-bottom,16px)" }}>
          {tabs.map((group, groupIndex) => (
            <div key={group.group}>
              {/* Group header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 20px 6px",
                position: "sticky", top: 0,
                background: `${K.s1}f0`,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderBottom: `1px solid ${K.bd}30`,
                zIndex: 1,
              }}>
                <span style={{ color: gi === groupIndex ? K.gn : K.mt, transition: "color 0.15s" }}>
                  {TAB_ICONS[groupIndex]}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: gi === groupIndex ? K.gn : K.mt,
                  transition: "color 0.15s",
                }}>
                  {group.group}
                </span>
                <span style={{
                  marginLeft: "auto", fontSize: 9, color: K.dm,
                  background: K.s2, borderRadius: 4, padding: "1px 5px",
                }}>
                  {group.items.length}
                </span>
              </div>

              {/* Sub-items */}
              {group.items.map((item, itemIndex) => {
                const isActive = gi === groupIndex && ti === itemIndex;
                return (
                  <button
                    key={item.slug}
                    data-active={isActive ? "true" : undefined}
                    onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "11px 20px 11px 36px",
                      background: isActive ? `${K.gn}12` : "transparent",
                      border: "none",
                      borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                      color: isActive ? K.gn : K.tx,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: font, fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    <span>{item.n}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {item.pro && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: "1px",
                          textTransform: "uppercase", padding: "2px 5px",
                          background: `${K.pp}20`, border: `1px solid ${K.pp}40`,
                          borderRadius: 3, color: K.pp,
                        }}>
                          PRO
                        </span>
                      )}
                      {isActive && (
                        <span style={{ fontSize: 10, color: K.gn }}>●</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, ti = 0, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const labels = tabs.map((t) => t.group);

  const handleGoTo = (groupIndex, itemIndex) => {
    goTo(groupIndex, itemIndex);
    setDrawerOpen(false);
  };

  return (
    <>
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        gi={gi}
        ti={ti}
        tabs={tabs}
        goTo={handleGoTo}
      />
      <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 1050, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>

        {/* Group tabs */}
        {tabs.map((tab, index) => (
          <button
            key={tab.group}
            onClick={() => goTo(index, 0)}
            aria-label={labels[index]}
            aria-current={gi === index ? "page" : undefined}
            style={{
              flex: 1, padding: "7px 2px 5px", background: "none", border: "none",
              color: gi === index ? K.gn : K.mt,
              cursor: "pointer", fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "color 0.15s",
            }}
          >
            <span style={{ lineHeight: 1 }}>{TAB_ICONS[index]}</span>
            <span style={{
              fontSize: 8, textTransform: "uppercase", letterSpacing: "0.4px",
              fontWeight: gi === index ? 700 : 400,
            }}>
              {labels[index]}
            </span>
          </button>
        ))}

        {/* All Tools trigger — opens 100dvh drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="All tools"
          aria-expanded={drawerOpen}
          style={{
            flex: 1, padding: "7px 2px 5px", background: "none",
            border: "none", borderLeft: `1px solid ${K.bd}40`,
            color: drawerOpen ? K.ac : K.mt,
            cursor: "pointer", fontFamily: font,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            transition: "color 0.15s",
          }}
        >
          <span style={{ lineHeight: 1 }}>{GRID_ICON}</span>
          <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: drawerOpen ? 700 : 400 }}>
            All
          </span>
        </button>
      </div>
    </>
  );
}
