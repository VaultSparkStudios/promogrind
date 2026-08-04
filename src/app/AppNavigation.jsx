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

// Inline SVG icons for each tab group — no external deps
const NAV_ICONS = {
  Home: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        fill={active ? color : "none"} stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 21V12h6v9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Convert: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 16V8m0 0L4 11m3-3l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 8v8m0 0l3-3m-3 3l-3-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="4" width="20" height="16" rx="3" stroke={color} strokeWidth="1.8" fill={active ? `${color}18` : "none"}/>
    </svg>
  ),
  Calculate: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={color} strokeWidth="1.8" fill={active ? `${color}18` : "none"}/>
      <path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  Track: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? `${color}10` : "none"}/>
    </svg>
  ),
  Live: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill={color}/>
      <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M3.5 3.5a15 15 0 0 0 0 17M20.5 3.5a15 15 0 0 1 0 17" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>
    </svg>
  ),
  Learn: (active, color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 10h16M4 14h10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="18" cy="17" r="4" stroke={color} strokeWidth="1.8" fill={active ? `${color}18` : "none"}/>
      <path d="M18 15.5v2l1 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function getNavIcon(group, active, color) {
  const fn = NAV_ICONS[group];
  if (!fn) return null;
  return fn(active, color);
}

// Sub-navigation drawer that slides up when user taps the active tab a second time
function SubNavDrawer({ tab, ti, onNavigate, onClose }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    drawerRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.54)",
          zIndex: 299,
          touchAction: "none",
        }}
      />
      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${tab.group} navigation`}
        tabIndex={-1}
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          zIndex: 300,
          background: K.s1,
          borderTop: `1px solid ${K.bd2}`,
          borderRadius: "18px 18px 0 0",
          maxHeight: "calc(100dvh - 60px - env(safe-area-inset-bottom, 0px) - 48px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.38)",
          outline: "none",
          animation: "pg-drawer-up 0.22s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        <style>{`
          @keyframes pg-drawer-up {
            from { transform: translateY(60px); opacity: 0.6; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: K.bd2 }} />
        </div>
        {/* Header */}
        <div style={{ padding: "6px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${K.bd}` }}>
          <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: K.mt, textTransform: "uppercase", letterSpacing: "1.4px" }}>
            {tab.group}
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{ background: "none", border: "none", color: K.mt, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px", fontFamily: font }}
          >
            ×
          </button>
        </div>
        {/* Scrollable item list */}
        <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {tab.items.map((item, index) => {
            const isActive = index === ti;
            return (
              <button
                key={item.slug}
                onClick={() => { onNavigate(index); onClose(); }}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "13px 18px",
                  background: isActive ? `${K.gn}0f` : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${K.bd}`,
                  color: isActive ? K.gn : K.tx,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <span>{item.n}</span>
                {item.pro && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: K.pp, background: `${K.pp}18`, borderRadius: 4, padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    Pro
                  </span>
                )}
                {isActive && !item.pro && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: K.gn, display: "inline-block" }} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [drawerGroup, setDrawerGroup] = useState(null);

  const handleTabPress = (index) => {
    if (index === gi) {
      // Already on this tab — open the sub-nav drawer
      setDrawerGroup(index);
    } else {
      goTo(index, 0);
    }
  };

  const activeTab = drawerGroup !== null ? tabs[drawerGroup] : null;

  return (
    <>
      <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: `8px 0 env(safe-area-inset-bottom,0px)`, boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const color = isActive ? K.gn : K.mt;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabPress(index)}
              aria-label={tab.group}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1,
                padding: "4px 2px 6px",
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
                transition: "opacity 0.15s",
              }}
            >
              {getNavIcon(tab.group, isActive, color)}
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>
                {tab.group}
              </span>
              {/* Active indicator dot */}
              <span
                aria-hidden="true"
                style={{
                  width: isActive ? 4 : 0,
                  height: 4,
                  borderRadius: "50%",
                  background: K.gn,
                  transition: "width 0.18s ease",
                  flexShrink: 0,
                }}
              />
            </button>
          );
        })}
      </div>

      {activeTab && (
        <SubNavDrawer
          tab={activeTab}
          ti={drawerGroup === gi ? (ti ?? 0) : 0}
          onNavigate={(itemIndex) => goTo(drawerGroup, itemIndex)}
          onClose={() => setDrawerGroup(null)}
        />
      )}
    </>
  );
}
