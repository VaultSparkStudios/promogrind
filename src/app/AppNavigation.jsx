import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// ─── SVG nav icons ─────────────────────────────────────────────────────────
function NavIconHome({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12L12 3l9 9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v10h5v-6h4v6h5V10" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function NavIconConvert({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 4l4 4-4 4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8h18" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 20l-4-4 4-4" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 16H3" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function NavIconCalc({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={c} strokeWidth="2" />
      <rect x="7" y="5" width="10" height="4" rx="1" fill={c} opacity="0.35" />
      <circle cx="8.5" cy="14" r="1.1" fill={c} />
      <circle cx="12" cy="14" r="1.1" fill={c} />
      <circle cx="15.5" cy="14" r="1.1" fill={c} />
      <circle cx="8.5" cy="18" r="1.1" fill={c} />
      <circle cx="12" cy="18" r="1.1" fill={c} />
      <circle cx="15.5" cy="18" r="1.1" fill={c} />
    </svg>
  );
}
function NavIconTrack({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function NavIconLive({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill={c} />
      <circle cx="12" cy="12" r="6.5" stroke={c} strokeWidth="1.5" opacity="0.55" />
      <circle cx="12" cy="12" r="10.5" stroke={c} strokeWidth="1.5" opacity="0.22" />
    </svg>
  );
}
function NavIconLearn({ c }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L2 8l10 5 10-5-10-5z" stroke={c} strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SVG_ICONS = [NavIconHome, NavIconConvert, NavIconCalc, NavIconTrack, NavIconLive, NavIconLearn];
const GROUP_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

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
  const drawerRef = useRef(null);
  const activeGroup = tabs[gi];

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {/* ── Drawer backdrop ── */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 299,
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      {/* ── Slide-up full-height drawer ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label={`${activeGroup?.group} navigation`}
        aria-modal="true"
        aria-hidden={!drawerOpen}
        {...(!drawerOpen ? { inert: "" } : {})}
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          height: "100dvh",
          background: `linear-gradient(180deg, ${K.s2} 0%, ${K.s1} 100%)`,
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
          overflowY: "hidden",
        }}
      >
        {/* Drawer header */}
        <div style={{
          flexShrink: 0,
          padding: "env(safe-area-inset-top,0px) 20px 0",
          background: `linear-gradient(180deg,${K.s1},transparent)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 12px" }}>
            <div>
              <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 3 }}>Navigate</div>
              <div style={{ fontFamily: fontD, fontSize: 22, fontWeight: 800, color: K.gn, letterSpacing: "-0.5px" }}>{activeGroup?.group}</div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              style={{
                width: 36, height: 36, borderRadius: 999,
                background: `${K.s2}cc`, border: `1px solid ${K.bd}`,
                color: K.mt, fontSize: 15, cursor: "pointer", fontFamily: font,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
          <div style={{ height: 1, background: `linear-gradient(to right, ${K.bd}, transparent)`, marginBottom: 8 }} />
        </div>

        {/* Scrollable item list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px", WebkitOverflowScrolling: "touch" }}>
          {activeGroup?.items.map((item, index) => {
            const isActive = ti === index;
            return (
              <button
                key={item.slug}
                onClick={() => handleItemSelect(index)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "14px 16px",
                  background: isActive ? `${K.gn}12` : "transparent",
                  border: `1px solid ${isActive ? K.gn + "40" : "transparent"}`,
                  borderRadius: 10, marginBottom: 4,
                  color: isActive ? K.gn : K.tx,
                  textAlign: "left", fontFamily: font,
                  fontSize: 15, fontWeight: isActive ? 700 : 400,
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s",
                  boxSizing: "border-box",
                }}
              >
                <span>{item.n}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {item.pro && (
                    <span style={{
                      fontSize: 9, color: K.pp,
                      border: `1px solid ${K.pp}60`, borderRadius: 4,
                      padding: "1px 5px", letterSpacing: "0.5px",
                      fontWeight: 700,
                    }}>PRO</span>
                  )}
                  {isActive && (
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: K.gn, display: "inline-block" }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Drawer bottom — secondary group switcher */}
        <div style={{
          flexShrink: 0,
          borderTop: `1px solid ${K.bd}`,
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          display: "flex",
          padding: "6px 0 env(safe-area-inset-bottom,0px)",
        }}>
          {tabs.map((tab, index) => {
            const NavIcon = SVG_ICONS[index];
            const isActive = gi === index;
            const iconColor = isActive ? K.gn : K.mt;
            return (
              <button
                key={tab.group}
                onClick={() => { goTo(index, 0); setDrawerOpen(false); }}
                aria-label={tab.group}
                aria-current={isActive ? "true" : undefined}
                style={{
                  flex: 1, padding: "7px 4px",
                  background: "none", border: "none",
                  color: iconColor,
                  cursor: "pointer", fontSize: 9,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  fontFamily: font,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                }}
              >
                {NavIcon ? <NavIcon c={iconColor} /> : <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>{tab.group[0]}</span>}
                <span style={{ fontWeight: isActive ? 700 : 400 }}>{GROUP_LABELS[index] || tab.group}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Persistent bottom bar ── */}
      <div className="pg-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(180deg,${K.s1},${K.s2})`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        padding: "6px 0 env(safe-area-inset-bottom,0px)",
        boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
      }}>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const iconColor = isActive ? K.gn : K.mt;
          const NavIcon = SVG_ICONS[index];
          return (
            <button
              key={tab.group}
              onClick={() => handleTabPress(index)}
              aria-label={tab.group}
              aria-expanded={isActive ? drawerOpen : undefined}
              aria-current={isActive ? "true" : undefined}
              style={{
                flex: 1, padding: "7px 4px",
                background: "none", border: "none",
                color: iconColor,
                cursor: "pointer", fontSize: 9,
                textTransform: "uppercase", letterSpacing: "0.5px",
                fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "color 0.15s",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  transform: isActive && drawerOpen ? "scale(1.18)" : "scale(1)",
                  transition: "transform 0.2s ease",
                }}
              >
                {NavIcon ? <NavIcon c={iconColor} /> : <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 700 }}>{tab.group[0]}</span>}
              </span>
              <span style={{ fontWeight: isActive ? 700 : 400 }}>{GROUP_LABELS[index] || tab.group}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
