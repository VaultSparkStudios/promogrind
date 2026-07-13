import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// ─── Inline SVG nav icons ─────────────────────────────────────────────────────

function IconHome({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function IconConvert({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  );
}

function IconCalculate({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="11" x2="11" y2="11"/>
      <line x1="8" y1="16" x2="11" y2="16"/>
      <line x1="14" y1="11" x2="16" y2="11"/>
      <line x1="14" y1="16" x2="16" y2="16"/>
    </svg>
  );
}

function IconTrack({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function IconLive({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function IconLearn({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  );
}

function IconGrid({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconClose({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

const GROUP_ICON_MAP = {
  Home: IconHome,
  Convert: IconConvert,
  Calculate: IconCalculate,
  Track: IconTrack,
  Live: IconLive,
  Learn: IconLearn,
};

function GroupIcon({ group, color, size }) {
  const Icon = GROUP_ICON_MAP[group] || IconGrid;
  return <Icon color={color} size={size} />;
}

// ─── NavDrawer — 100dvh scrollable full-navigation overlay ───────────────────

export function NavDrawer({ open, onClose, tabs, gi, goTo }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
      aria-modal="true"
      role="dialog"
      aria-label="All navigation sections"
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        style={{
          height: "100dvh",
          background: `linear-gradient(180deg, ${K.s2} 0%, ${K.s1} 100%)`,
          borderTop: `1px solid ${K.bd2}`,
          display: "flex", flexDirection: "column",
          overflowY: "auto",
          outline: "none",
        }}
        className="pg-nav-drawer"
      >
        {/* Drawer header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: `linear-gradient(180deg, ${K.s2}f0 0%, ${K.s2}80 100%)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${K.bd}`,
          padding: "16px 20px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: fontD, fontWeight: 800, fontSize: 18, color: K.tx, letterSpacing: "-0.5px" }}>
              All Sections
            </div>
            <div style={{ fontSize: 10, color: K.mt, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>
              {tabs.reduce((n, g) => n + g.items.length, 0)} tools
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: `${K.bd2}40`, border: `1px solid ${K.bd2}`,
              borderRadius: 999, padding: "8px",
              cursor: "pointer", display: "flex", alignItems: "center",
              color: K.mt, transition: "background 0.15s",
            }}
          >
            <IconClose color={K.tx} size={16} />
          </button>
        </div>

        {/* Drawer body — all groups + sub-items */}
        <div style={{ padding: "8px 0 max(env(safe-area-inset-bottom, 0px), 80px) 0", flex: 1 }}>
          {tabs.map((tab, groupIndex) => {
            const isActive = gi === groupIndex;
            return (
              <div key={tab.group} style={{ marginBottom: 4 }}>
                {/* Group header row */}
                <button
                  onClick={() => { goTo(groupIndex, 0); onClose(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "12px 20px",
                    background: isActive ? `${K.gn}10` : "transparent",
                    border: "none", cursor: "pointer",
                    borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isActive ? `${K.gn}18` : `${K.bd2}30`,
                    border: `1px solid ${isActive ? K.gn + "40" : K.bd}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 12px ${K.gn}30` : "none",
                  }}>
                    <GroupIcon group={tab.group} color={isActive ? K.gn : K.dm} size={18} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: fontD, fontWeight: 700, fontSize: 15,
                      color: isActive ? K.gn : K.tx, display: "block",
                    }}>
                      {tab.group}
                    </span>
                    <span style={{ fontSize: 10, color: K.mt }}>
                      {tab.items.length} {tab.items.length === 1 ? "tool" : "tools"}
                    </span>
                  </span>
                  {isActive && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "1px",
                      textTransform: "uppercase", color: K.gn,
                      background: `${K.gn}18`, padding: "2px 8px", borderRadius: 4,
                    }}>
                      Active
                    </span>
                  )}
                </button>

                {/* Sub-items grid */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 6,
                  padding: "4px 20px 8px 68px",
                }}>
                  {tab.items.map((item, itemIndex) => (
                    <button
                      key={item.slug}
                      onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                      style={{
                        padding: "6px 12px",
                        background: (isActive && gi === groupIndex) ? `${K.ac}10` : `${K.bd}40`,
                        border: `1px solid ${K.bd}`,
                        borderRadius: 8, cursor: "pointer", fontFamily: font,
                        fontSize: 11, color: K.dm, fontWeight: 500,
                        transition: "background 0.1s, color 0.1s",
                      }}
                    >
                      {item.n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── QuickCalcPanel ───────────────────────────────────────────────────────────

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

// ─── CalcSearch ───────────────────────────────────────────────────────────────

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

// ─── MobileBottomNav ─────────────────────────────────────────────────────────

// Primary groups shown as tabs; the rest are accessible via the drawer.
const PRIMARY_COUNT = 5;

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const primaryTabs = tabs.slice(0, PRIMARY_COUNT);
  // "All" button is active when a non-primary group is selected
  const allActive = gi >= PRIMARY_COUNT;

  return (
    <>
      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tabs={tabs}
        gi={gi}
        goTo={goTo}
      />
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          display: "flex",
          background: `linear-gradient(180deg, ${K.s1}e8 0%, ${K.s2}f5 100%)`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${K.bd}`,
          padding: `4px 0 env(safe-area-inset-bottom, 0px)`,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.28)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>

        {primaryTabs.map((tab, index) => {
          const isActive = gi === index;
          return (
            <button
              key={tab.group}
              onClick={() => goTo(index, 0)}
              aria-label={tab.group}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1, padding: "8px 4px 6px",
                background: "none", border: "none",
                cursor: "pointer", fontFamily: font,
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3,
                position: "relative",
                transition: "opacity 0.1s",
              }}
            >
              {/* Glow aura on active */}
              {isActive && (
                <span style={{
                  position: "absolute",
                  top: 6, left: "50%", transform: "translateX(-50%)",
                  width: 32, height: 32, borderRadius: "50%",
                  background: `radial-gradient(circle, ${K.gn}30 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
              )}
              <span style={{
                position: "relative", zIndex: 1,
                filter: isActive ? `drop-shadow(0 0 6px ${K.gn}90)` : "none",
                transition: "filter 0.2s",
              }}>
                <GroupIcon group={tab.group} color={isActive ? K.gn : K.mt} size={20} />
              </span>
              <span style={{
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.6px",
                fontWeight: isActive ? 700 : 400,
                color: isActive ? K.gn : K.mt,
                transition: "color 0.15s",
              }}>
                {tab.group}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span style={{
                  position: "absolute", bottom: 2, left: "50%",
                  transform: "translateX(-50%)",
                  width: 3, height: 3, borderRadius: "50%",
                  background: K.gn,
                  boxShadow: `0 0 6px ${K.gn}`,
                }} />
              )}
            </button>
          );
        })}

        {/* "All" button — opens 100dvh NavDrawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="All sections"
          aria-expanded={drawerOpen}
          style={{
            flex: 1, padding: "8px 4px 6px",
            background: "none", border: "none",
            cursor: "pointer", fontFamily: font,
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
            position: "relative",
          }}
        >
          {allActive && (
            <span style={{
              position: "absolute",
              top: 6, left: "50%", transform: "translateX(-50%)",
              width: 32, height: 32, borderRadius: "50%",
              background: `radial-gradient(circle, ${K.pp}30 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
          )}
          <span style={{
            position: "relative", zIndex: 1,
            filter: (allActive || drawerOpen) ? `drop-shadow(0 0 6px ${K.pp}90)` : "none",
            transition: "filter 0.2s",
          }}>
            <IconGrid color={(allActive || drawerOpen) ? K.pp : K.mt} size={20} />
          </span>
          <span style={{
            fontSize: 9, textTransform: "uppercase", letterSpacing: "0.6px",
            fontWeight: (allActive || drawerOpen) ? 700 : 400,
            color: (allActive || drawerOpen) ? K.pp : K.mt,
            transition: "color 0.15s",
          }}>
            All
          </span>
          {allActive && (
            <span style={{
              position: "absolute", bottom: 2, left: "50%",
              transform: "translateX(-50%)",
              width: 3, height: 3, borderRadius: "50%",
              background: K.pp,
              boxShadow: `0 0 6px ${K.pp}`,
            }} />
          )}
        </button>
      </div>
    </>
  );
}
