import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// ─── SVG Icon set for the 6 main navigation groups ───────────────────────────

function IconHome({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12L12 4l9 8"/>
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/>
    </svg>
  );
}

function IconConvert({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V5m0 0L4 8m3-3l3 3"/>
      <path d="M17 8v11m0 0l3-3m-3 3l-3-3"/>
    </svg>
  );
}

function IconCalc({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <circle cx="8.5" cy="12" r="1" fill={color} stroke="none"/>
      <circle cx="12" cy="12" r="1" fill={color} stroke="none"/>
      <circle cx="15.5" cy="12" r="1" fill={color} stroke="none"/>
      <circle cx="8.5" cy="16" r="1" fill={color} stroke="none"/>
      <circle cx="12" cy="16" r="1" fill={color} stroke="none"/>
      <circle cx="15.5" cy="16" r="1" fill={color} stroke="none"/>
    </svg>
  );
}

function IconTrack({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 20 9 4 6 12 2 12"/>
    </svg>
  );
}

function IconLive({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={`${color}22`}/>
    </svg>
  );
}

function IconLearn({ size = 22, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

const NAV_ICONS = [IconHome, IconConvert, IconCalc, IconTrack, IconLive, IconLearn];
const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

// ─── MobileNavDrawer — 100dvh slide-up full navigation overlay ───────────────

export function MobileNavDrawer({ open, onClose, tabs, gi, goTo }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleItemClick = (groupIndex, itemIndex) => {
    goTo(groupIndex, itemIndex);
    onClose();
  };

  return (
    <>
      <style>{`
        @keyframes pg-drawer-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes pg-drawer-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .pg-nav-drawer-open {
          animation: pg-drawer-slide-up 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        .pg-nav-drawer-backdrop {
          animation: pg-drawer-fade-in 0.2s ease forwards;
        }
        .pg-nav-drawer-item:active {
          background: ${K.bd}80 !important;
        }
      `}</style>

      {/* Backdrop */}
      {open && (
        <div
          className="pg-nav-drawer-backdrop"
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 900,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer panel */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All navigation"
          className="pg-nav-drawer-open"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 950,
            height: "90dvh",
            maxHeight: "90vh",
            background: K.s1,
            borderRadius: "20px 20px 0 0",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -16px 48px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Handle + header */}
          <div style={{
            flexShrink: 0,
            padding: "12px 20px 10px",
            borderBottom: `1px solid ${K.bd}`,
          }}>
            {/* Drag handle pill */}
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 99,
              background: K.bd2,
              margin: "0 auto 14px",
            }} aria-hidden="true" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                fontFamily: font,
                fontSize: 13,
                fontWeight: 700,
                color: K.tx,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}>
                All Navigation
              </span>
              <button
                onClick={onClose}
                aria-label="Close navigation drawer"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  border: `1px solid ${K.bd2}`,
                  background: "transparent",
                  color: K.mt,
                  cursor: "pointer",
                  fontFamily: font,
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable nav tree */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 0 calc(env(safe-area-inset-bottom, 0px) + 8px)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {tabs.map((tab, groupIndex) => {
              const Icon = NAV_ICONS[groupIndex];
              const isActive = gi === groupIndex;
              const activeColor = isActive ? K.gn : K.mt;
              return (
                <div key={tab.group} style={{ marginBottom: 4 }}>
                  {/* Group header row */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 20px 6px",
                  }}>
                    {Icon && <Icon size={16} color={activeColor} />}
                    <span style={{
                      fontFamily: font,
                      fontSize: 10,
                      fontWeight: 700,
                      color: activeColor,
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                    }}>
                      {tab.group}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: 9,
                        background: `${K.gn}20`,
                        color: K.gn,
                        padding: "1px 6px",
                        borderRadius: 99,
                        fontFamily: font,
                        letterSpacing: "0.5px",
                      }}>
                        active
                      </span>
                    )}
                  </div>

                  {/* Items grid — two columns on wide enough drawer */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                    padding: "0 12px",
                  }}>
                    {tab.items.map((item, itemIndex) => {
                      return (
                        <button
                          key={item.slug}
                          className="pg-nav-drawer-item"
                          onClick={() => handleItemClick(groupIndex, itemIndex)}
                          style={{
                            padding: "9px 10px",
                            background: "transparent",
                            border: "none",
                            borderRadius: 8,
                            color: K.dm,
                            cursor: "pointer",
                            fontFamily: font,
                            fontSize: 12,
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            minHeight: 40,
                            transition: "background 0.1s",
                          }}
                        >
                          {item.pro && (
                            <span style={{
                              fontSize: 7,
                              background: `${K.yl}20`,
                              color: K.yl,
                              padding: "1px 4px",
                              borderRadius: 3,
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                              flexShrink: 0,
                            }}>
                              PRO
                            </span>
                          )}
                          <span style={{ lineHeight: 1.3 }}>{item.n}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ height: 6, borderBottom: `1px solid ${K.bd}40`, margin: "0 20px" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ─── QuickCalcPanel — mobile floating calculator shortcut ─────────────────────

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

// ─── CalcSearch — keyboard-triggered calculator search modal ─────────────────

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

// ─── MobileBottomNav — upgraded with SVG icons, glassmorphism, drawer ────────

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTabPress = (index) => {
    if (gi === index) {
      // Tapping the already-active tab opens the sub-navigation drawer
      setDrawerOpen(true);
    } else {
      goTo(index, 0);
    }
  };

  return (
    <>
      <style>{`
        .pg-nav-tab-btn {
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.12s;
        }
        .pg-nav-tab-btn:active {
          opacity: 0.6;
        }
      `}</style>

      <div
        className="pg-mobile-nav"
        role="navigation"
        aria-label="Primary navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          /* Glassmorphism: semi-transparent bg + blur */
          background: `${K.bg}d8`,
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          borderTop: `1px solid ${K.bd}60`,
          boxShadow: "0 -1px 0 0 rgba(255,255,255,0.04), 0 -12px 32px rgba(0,0,0,0.28)",
          display: "flex",
          padding: `8px 0 env(safe-area-inset-bottom, 0px)`,
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const Icon = NAV_ICONS[index];
          const label = NAV_LABELS[index] || tab.group;
          const isActive = gi === index;
          const iconColor = isActive ? K.gn : K.mt;

          return (
            <button
              key={tab.group}
              className="pg-nav-tab-btn"
              onClick={() => handleTabPress(index)}
              aria-label={`${label}${isActive ? " — tap to open sub-navigation" : ""}`}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1,
                padding: "4px 2px 5px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: font,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {/* Active indicator bar — grows from center when active */}
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: isActive ? 20 : 0,
                height: 2,
                borderRadius: 99,
                background: K.gn,
                transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }} aria-hidden="true" />

              {/* Icon container with subtle active tint */}
              <div style={{
                width: 38,
                height: 32,
                borderRadius: 10,
                background: isActive ? `${K.gn}14` : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.18s",
              }}>
                {Icon && <Icon size={20} color={iconColor} />}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 9,
                fontWeight: isActive ? 700 : 400,
                color: iconColor,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                lineHeight: 1,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Drawer rendered after nav bar — z:950 paints above nav bar z:100 */}
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tabs={tabs}
        gi={gi}
        goTo={goTo}
      />
    </>
  );
}
