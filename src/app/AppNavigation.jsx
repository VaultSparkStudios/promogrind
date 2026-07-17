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

// ── SVG Icon set for tab groups ──────────────────────────────────────────────

function IconHome({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={c} strokeWidth={active ? 1.8 : 1.4} strokeLinejoin="round" fill={active ? `${K.gn}18` : "none"} />
      <rect x="7.5" y="12" width="5" height="6" rx="0.5" stroke={c} strokeWidth={active ? 1.8 : 1.4} fill={active ? `${K.gn}12` : "none"} />
    </svg>
  );
}

function IconConvert({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 7h12M13 4l3 3-3 3" stroke={c} strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H4M7 10l-3 3 3 3" stroke={c} strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalc({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="2.5" width="13" height="15" rx="2" stroke={c} strokeWidth={active ? 1.8 : 1.4} fill={active ? `${K.gn}10` : "none"} />
      <rect x="6" y="5" width="8" height="3" rx="0.75" stroke={c} strokeWidth={1.2} fill={active ? `${K.gn}20` : "none"} />
      <circle cx="7" cy="11.5" r="0.9" fill={c} />
      <circle cx="10" cy="11.5" r="0.9" fill={c} />
      <circle cx="13" cy="11.5" r="0.9" fill={c} />
      <circle cx="7" cy="14.5" r="0.9" fill={c} />
      <circle cx="10" cy="14.5" r="0.9" fill={c} />
      <circle cx="13" cy="14.5" r="0.9" fill={active ? K.gn : c} />
    </svg>
  );
}

function IconTrack({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 15l4-5 3 3 3-5 4 3" stroke={c} strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="17" x2="17" y2="17" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
      <line x1="3" y1="3" x2="3" y2="17" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

function IconLive({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v5l3 2-3 2v5" stroke={c} strokeWidth={active ? 2 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth={active ? 1.8 : 1.4} strokeDasharray={active ? "none" : "3 2"} fill={active ? `${K.gn}10` : "none"} />
      {active && <circle cx="10" cy="10" r="2.5" fill={K.gn} opacity="0.35" />}
    </svg>
  );
}

function IconLearn({ active, size = 20 }) {
  const c = active ? K.gn : K.mt;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H15a1 1 0 011 1v10.5a1 1 0 01-1 1H5.5A1.5 1.5 0 014 15V5.5z" stroke={c} strokeWidth={active ? 1.8 : 1.4} fill={active ? `${K.gn}10` : "none"} />
      <line x1="4" y1="15" x2="16" y2="15" stroke={c} strokeWidth={1.2} />
      <line x1="7" y1="8" x2="13" y2="8" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
      <line x1="7" y1="11" x2="11" y2="11" stroke={c} strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

const GROUP_ICONS = {
  Home: IconHome,
  Convert: IconConvert,
  Calculate: IconCalc,
  Track: IconTrack,
  Live: IconLive,
  Learn: IconLearn,
};

// ── Mobile nav drawer — 100dvh scrollable item sheet ─────────────────────────

function MobileNavDrawer({ tabs, groupIndex, activeGi, activeTi, goTo, onClose }) {
  const group = tabs[groupIndex];
  const drawerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Mount → animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 240);
  };

  const handleItemClick = (gi, ti) => {
    setVisible(false);
    goTo(gi, ti);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${group.group} navigation`}
      style={{ position: "fixed", inset: 0, zIndex: 500 }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          transition: "opacity 0.24s",
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "100dvh",
          background: `linear-gradient(160deg, ${K.s1} 0%, ${K.bg} 100%)`,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${K.bd2}`,
          borderBottom: "none",
          boxShadow: "0 -24px 60px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px 14px",
          borderBottom: `1px solid ${K.bd}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {React.createElement(GROUP_ICONS[group.group] || IconHome, { active: true, size: 22 })}
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: K.gn, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              {group.group}
            </span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close navigation"
            style={{
              padding: "6px 10px", background: `${K.bd}60`, border: `1px solid ${K.bd2}`,
              borderRadius: 8, color: K.dm, fontSize: 14, cursor: "pointer", fontFamily: font,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable item list */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
          <style>{`
            .pg-drawer-item { transition: background 0.12s, border-color 0.12s; }
            .pg-drawer-item:active { background: ${K.gn}12 !important; }
          `}</style>
          {group.items.map((item, ti) => {
            const isActive = activeGi === groupIndex && activeTi === ti;
            return (
              <button
                key={item.slug}
                className="pg-drawer-item"
                onClick={() => handleItemClick(groupIndex, ti)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "15px 20px",
                  background: isActive ? `${K.gn}10` : "transparent",
                  border: "none",
                  borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                  borderBottom: `1px solid ${K.bd}40`,
                  color: isActive ? K.gn : K.tx,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: font,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 400, lineHeight: 1.2 }}>
                  {item.n}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {item.pro && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.8px",
                      textTransform: "uppercase", padding: "2px 6px",
                      background: `${K.pp}20`, color: K.pp,
                      borderRadius: 4, border: `1px solid ${K.pp}40`,
                    }}>Pro</span>
                  )}
                  {isActive && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: K.gn }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MobileBottomNav ─────────────────────────────────────────────────────────

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [drawerGroupIndex, setDrawerGroupIndex] = useState(null);

  const handleTabPress = (index) => {
    if (index === gi) {
      // Active tab: open/close the drawer
      setDrawerGroupIndex((current) => (current === index ? null : index));
    } else {
      // Different tab: close any drawer and navigate
      setDrawerGroupIndex(null);
      goTo(index, 0);
    }
  };

  const handleDrawerNavigate = (newGi, newTi) => {
    setDrawerGroupIndex(null);
    goTo(newGi, newTi);
  };

  return (
    <>
      {/* 100dvh nav drawer */}
      {drawerGroupIndex !== null && (
        <MobileNavDrawer
          tabs={tabs}
          groupIndex={drawerGroupIndex}
          activeGi={gi}
          activeTi={ti}
          goTo={handleDrawerNavigate}
          onClose={() => setDrawerGroupIndex(null)}
        />
      )}

      {/* Bottom navigation bar */}
      <nav
        className="pg-mobile-nav"
        aria-label="Primary navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg, ${K.s1}ee, ${K.bg}f8)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: `1px solid ${K.bd}`,
          display: "flex",
          zIndex: 100,
          padding: `6px 0 env(safe-area-inset-bottom, 0px)`,
          boxShadow: "0 -10px 32px rgba(0,0,0,0.28)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        <style>{`
          .pg-mobile-nav-btn { -webkit-tap-highlight-color: transparent; transition: opacity 0.12s; }
          .pg-mobile-nav-btn:active { opacity: 0.65; }
          @keyframes pg-nav-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } 50% { box-shadow: 0 0 12px 2px rgba(74,222,128,0.25); } }
        `}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const isDrawerOpen = drawerGroupIndex === index;
          const IconComp = GROUP_ICONS[tab.group] || IconHome;
          return (
            <button
              key={tab.group}
              className="pg-mobile-nav-btn"
              onClick={() => handleTabPress(index)}
              aria-label={tab.group}
              aria-pressed={isActive}
              aria-expanded={isDrawerOpen}
              style={{
                flex: 1,
                padding: "7px 2px 5px",
                background: "transparent",
                border: "none",
                color: isActive ? K.gn : K.mt,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {/* Active indicator line at top of button */}
              <div style={{
                position: "absolute", top: 0, left: "25%", right: "25%",
                height: 2, borderRadius: 1,
                background: isActive ? K.gn : "transparent",
                boxShadow: isActive ? `0 0 8px ${K.gn}` : "none",
                transition: "background 0.2s, box-shadow 0.2s",
              }} />

              {/* Icon with glow halo on active */}
              <div style={{
                position: "relative",
                padding: "3px 6px",
                borderRadius: 8,
                background: isActive ? `${K.gn}12` : "transparent",
                transition: "background 0.18s",
              }}>
                <IconComp active={isActive} size={isDrawerOpen ? 22 : 20} />
                {isDrawerOpen && (
                  <div style={{
                    position: "absolute", inset: -2,
                    borderRadius: 10,
                    border: `1px solid ${K.gn}40`,
                    pointerEvents: "none",
                  }} />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9,
                fontFamily: font,
                fontWeight: isActive ? 700 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                lineHeight: 1,
                color: isActive ? K.gn : K.mt,
                transition: "color 0.15s",
              }}>
                {tab.group === "Calculate" ? "Calc" : tab.group}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
