import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

const NAV_DRAWER_CSS = `
@keyframes pg-drawer-in {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.pg-nav-drawer {
  animation: pg-drawer-in 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
}
.pg-nav-drawer-item:active { opacity: 0.7; }
@keyframes pg-nav-dot-pulse {
  0%,100% { transform: scaleX(1); }
  50% { transform: scaleX(1.4); }
}
.pg-nav-active-bar {
  animation: pg-nav-dot-pulse 0.35s ease both;
}
`;

function IconHome({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  );
}

function IconConvert({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L4 7m3-3l3 3" />
      <path d="M17 8v12m0 0l3-3m-3 3l-3-3" />
    </svg>
  );
}

function IconCalculate({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconTrack({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 20h18" />
      <path d="M7 20v-8" />
      <path d="M12 20V8" />
      <path d="M17 20v-5" />
      <path d="M7 9l3-4 4 4 4-6" />
    </svg>
  );
}

function IconLive({ color, active }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2.5" fill={active ? color : "none"} stroke={color} />
      <path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7" />
      <path d="M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13" />
    </svg>
  );
}

function IconLearn({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z" />
      <path d="M4 15.5A2.5 2.5 0 016.5 13H20" />
    </svg>
  );
}

const GROUP_ICON_COMPONENTS = [IconHome, IconConvert, IconCalculate, IconTrack, IconLive, IconLearn];

function NavIcon({ index, active, color }) {
  const Cmp = GROUP_ICON_COMPONENTS[index];
  if (!Cmp) return null;
  return <Cmp color={color} active={active} />;
}

function MobileNavDrawer({ tabs, gi, ti, goTo, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 490,
        background: "rgba(5,8,18,0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <style>{NAV_DRAWER_CSS}</style>
      <div
        className="pg-nav-drawer"
        style={{
          background: `linear-gradient(175deg, ${K.s1} 0%, ${K.s2} 100%)`,
          border: `1px solid ${K.bd}`,
          borderBottom: "none",
          borderRadius: "20px 20px 0 0",
          height: "100dvh",
          maxHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -32px 80px rgba(0,0,0,0.72)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 20px 14px",
          borderBottom: `1px solid ${K.bd}40`,
          flexShrink: 0,
          background: `linear-gradient(180deg, ${K.s1}, transparent)`,
        }}>
          <div>
            <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 800, color: K.gn, letterSpacing: "-0.5px", lineHeight: 1 }}>
              PROMOGRIND
            </div>
            <div style={{ fontSize: 9, color: K.mt, letterSpacing: "1.8px", textTransform: "uppercase", marginTop: 4 }}>
              All Tools
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `${K.bd}50`, border: `1px solid ${K.bd2}`,
              color: K.dm, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{
          overflowY: "auto", flex: 1,
          padding: "6px 0 env(safe-area-inset-bottom, 24px)",
          WebkitOverflowScrolling: "touch",
        }}>
          {tabs.map((tab, groupIndex) => {
            const isActiveGroup = groupIndex === gi;
            const IconCmp = GROUP_ICON_COMPONENTS[groupIndex];
            return (
              <div key={tab.group} style={{ marginBottom: 2 }}>
                <div style={{
                  padding: "12px 20px 5px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {IconCmp && (
                    <IconCmp
                      color={isActiveGroup ? K.gn : K.mt}
                      active={isActiveGroup}
                    />
                  )}
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: isActiveGroup ? K.gn : K.mt,
                    textTransform: "uppercase", letterSpacing: "1.6px",
                  }}>
                    {tab.group}
                  </span>
                  {isActiveGroup && (
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: K.gn, display: "inline-block", flexShrink: 0 }} />
                  )}
                </div>
                <div>
                  {tab.items.map((item, itemIndex) => {
                    const isActive = isActiveGroup && itemIndex === ti;
                    return (
                      <button
                        key={item.slug}
                        className="pg-nav-drawer-item"
                        onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "10px 20px 10px 48px",
                          background: isActive ? `${K.gn}10` : "transparent",
                          border: "none",
                          borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                          color: isActive ? K.gn : K.dm,
                          cursor: "pointer", textAlign: "left",
                          fontSize: 13, fontFamily: font,
                          fontWeight: isActive ? 600 : 400,
                          boxSizing: "border-box",
                          transition: "background 0.1s",
                        }}
                      >
                        <span>{item.n}</span>
                        {item.pro && (
                          <span style={{
                            fontSize: 8, color: K.pp, fontWeight: 700,
                            letterSpacing: "1px", background: `${K.pp}15`,
                            padding: "2px 6px", borderRadius: 4,
                            border: `1px solid ${K.pp}30`,
                          }}>
                            PRO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const labels = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

  const handleTabPress = (index) => {
    if (index === gi) {
      setDrawerOpen((v) => !v);
    } else {
      goTo(index, 0);
      setDrawerOpen(false);
    }
  };

  return (
    <>
      {drawerOpen && (
        <MobileNavDrawer
          tabs={tabs}
          gi={gi}
          ti={ti != null ? ti : 0}
          goTo={goTo}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      <div
        className="pg-mobile-nav"
        role="navigation"
        aria-label="Primary mobile navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg,${K.s1},${K.s2})`,
          borderTop: `1px solid ${K.bd}`,
          display: "flex", zIndex: 100,
          padding: "4px 0 env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -10px 32px rgba(0,0,0,0.28)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const iconColor = isActive ? K.gn : K.mt;
          const label = labels[index] || tab.group;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabPress(index)}
              aria-label={label}
              aria-pressed={isActive}
              style={{
                flex: 1, padding: "7px 2px 6px",
                background: "none", border: "none",
                color: isActive ? K.gn : K.mt,
                cursor: "pointer",
                fontFamily: font,
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3,
                position: "relative",
                WebkitTapHighlightColor: "transparent",
                transition: "color 0.15s",
                minHeight: 52,
              }}
            >
              <NavIcon index={index} active={isActive} color={iconColor} />
              <span style={{ fontSize: 8, fontWeight: isActive ? 700 : 400, textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1 }}>
                {label}
              </span>
              {isActive && (
                <span
                  className="pg-nav-active-bar"
                  style={{
                    position: "absolute", bottom: 0, left: "50%",
                    transform: "translateX(-50%)",
                    width: 24, height: 2,
                    borderRadius: 1,
                    background: K.gn,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
