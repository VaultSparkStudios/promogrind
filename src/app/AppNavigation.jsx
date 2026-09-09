import React, { useEffect, useRef, useState } from "react";
import { K, KD, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

const GROUP_META = {
  "Home":      { icon: "⌂", color: KD.gn },
  "Convert":   { icon: "⇄", color: KD.ac },
  "Calculate": { icon: "⊞", color: KD.pp },
  "Track":     { icon: "◈", color: KD.yl },
  "Live":      { icon: "⚡", color: KD.rd },
  "Learn":     { icon: "◉", color: KD.mt },
};

const DRAWER_CSS = `
  @keyframes pgNavSlideUp {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .pg-nav-drawer { animation: pgNavSlideUp 0.26s cubic-bezier(0.32,0.72,0,1) both; }
  .pg-nav-drawer-backdrop { animation: pgNavFadeIn 0.2s ease both; }
  @keyframes pgNavFadeIn { from { opacity: 0; } to { opacity: 1; } }
  .pg-nav-drawer-item:active { opacity: 0.65; }
  .pg-nav-drawer-group-btn:active { opacity: 0.8; }
`;

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

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on back gesture (popstate)
  useEffect(() => {
    if (!drawerOpen) return;
    const onPop = () => setDrawerOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [drawerOpen]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleGroupNav = (tabIndex, itemIndex = 0) => {
    goTo(tabIndex, itemIndex);
    setDrawerOpen(false);
  };

  // Quick bar shows first 5 groups; 6th ("Learn") lives behind More
  const quickTabs = tabs.slice(0, 5);
  const learnGroupIndex = tabs.findIndex((t) => t.group === "Learn");
  const drawerActive = drawerOpen || (gi >= 5);

  return (
    <>
      <style>{MOBILE_NAV_RESPONSIVE_CSS + DRAWER_CSS}</style>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="pg-nav-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
            zIndex: 498,
          }}
        />
      )}

      {/* ── Full-height nav drawer ───────────────────────────────── */}
      {drawerOpen && (
        <div
          className="pg-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            height: "calc(100dvh - 0px)",
            background: `linear-gradient(160deg, ${KD.s1} 0%, ${KD.s2} 55%, ${KD.bg} 100%)`,
            zIndex: 499,
            display: "flex", flexDirection: "column",
            borderTop: `2px solid ${KD.gn}30`,
            boxShadow: "0 -32px 80px rgba(0,0,0,0.65)",
          }}
        >
          {/* Drawer header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 20px 14px",
            borderBottom: `1px solid ${KD.bd}50`,
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: fontD, fontSize: 18, fontWeight: 800, color: KD.gn, letterSpacing: "-0.5px", lineHeight: 1 }}>
                PROMOGRIND
              </div>
              <div style={{ fontSize: 9, color: KD.mt, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>
                All Sections
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              style={{
                width: 38, height: 38, borderRadius: 10,
                border: `1px solid ${KD.bd2}`,
                background: "transparent", color: KD.mt,
                cursor: "pointer", fontFamily: font, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Scrollable group + item list */}
          <div
            style={{
              overflowY: "auto", flex: 1,
              padding: "10px 14px calc(env(safe-area-inset-bottom, 0px) + 16px)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {tabs.map((tab, tabIndex) => {
              const meta = GROUP_META[tab.group] || { icon: "•", color: KD.mt };
              const isActive = gi === tabIndex;

              return (
                <div key={tab.group} style={{ marginBottom: 6 }}>
                  {/* Group button */}
                  <button
                    className="pg-nav-drawer-group-btn"
                    onClick={() => handleGroupNav(tabIndex, 0)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 14px", borderRadius: 12,
                      background: isActive ? `${meta.color}18` : "transparent",
                      border: `1px solid ${isActive ? meta.color + "45" : "transparent"}`,
                      cursor: "pointer", textAlign: "left", marginBottom: 5,
                      transition: "background 0.15s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontSize: 20, lineHeight: 1,
                        color: meta.color,
                        width: 26, textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </span>
                    <span style={{
                      fontFamily: fontD, fontSize: 14, fontWeight: 700,
                      color: isActive ? meta.color : KD.tx, letterSpacing: "-0.2px",
                    }}>
                      {tab.group}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: 9, color: KD.mt,
                      textTransform: "uppercase", letterSpacing: "1px",
                    }}>
                      {tab.items.length} tools
                    </span>
                    {isActive && (
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: meta.color, flexShrink: 0,
                        boxShadow: `0 0 8px ${meta.color}`,
                      }} />
                    )}
                  </button>

                  {/* Sub-item chips */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: 5,
                    padding: "0 6px 6px 52px",
                  }}>
                    {tab.items.map((item, itemIndex) => (
                      <button
                        key={item.slug}
                        className="pg-nav-drawer-item"
                        onClick={() => handleGroupNav(tabIndex, itemIndex)}
                        style={{
                          padding: "5px 9px", borderRadius: 6,
                          background: isActive ? `${meta.color}10` : "transparent",
                          border: `1px solid ${isActive ? KD.bd2 : KD.bd}`,
                          color: isActive ? KD.tx : KD.mt,
                          fontSize: 10, cursor: "pointer", fontFamily: font,
                          whiteSpace: "nowrap", lineHeight: 1.3,
                        }}
                      >
                        {item.n}
                        {item.pro && (
                          <span style={{ marginLeft: 4, color: KD.yl, fontSize: 8, fontWeight: 700 }}>
                            PRO
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom quick-tab bar ─────────────────────────────────── */}
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg, ${KD.s1}, ${KD.s2})`,
          borderTop: `1px solid ${KD.bd}`,
          display: "flex", zIndex: 100,
          padding: `6px 0 env(safe-area-inset-bottom, 0px)`,
          boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
        }}
      >
        {quickTabs.map((tab, index) => {
          const meta = GROUP_META[tab.group] || { icon: "•", color: KD.mt };
          const isActive = gi === index && !drawerOpen;
          return (
            <button
              key={tab.group}
              onClick={() => handleGroupNav(index, 0)}
              style={{
                flex: 1, padding: "7px 2px", background: "none", border: "none",
                color: isActive ? meta.color : KD.mt,
                cursor: "pointer", fontSize: 8, textTransform: "uppercase",
                letterSpacing: "0.5px", fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>{meta.icon}</span>
              <span style={{ fontWeight: isActive ? 700 : 400 }}>
                {tab.group === "Calculate" ? "Calc" : tab.group}
              </span>
              {isActive && (
                <span style={{
                  position: "absolute", bottom: "calc(env(safe-area-inset-bottom,0px) + 2px)",
                  width: 4, height: 4, borderRadius: "50%",
                  background: meta.color,
                }} />
              )}
            </button>
          );
        })}

        {/* More button → opens drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open full navigation menu"
          aria-expanded={drawerOpen}
          style={{
            flex: 1, padding: "7px 2px", background: "none", border: "none",
            color: drawerActive ? KD.gn : KD.mt,
            cursor: "pointer", fontSize: 8, textTransform: "uppercase",
            letterSpacing: "0.5px", fontFamily: font,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>☰</span>
          <span style={{ fontWeight: drawerActive ? 700 : 400 }}>More</span>
        </button>
      </div>
    </>
  );
}
