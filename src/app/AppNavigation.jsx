import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
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

// ─── Nav icons ────────────────────────────────────────────────────────────────

const NavIcon = ({ name, color }) => {
  const props = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "Home")
    return <svg {...props}><path d="M2 9L10 2l8 7v9a1 1 0 01-1 1H13v-5H7v5H3a1 1 0 01-1-1V9z"/></svg>;
  if (name === "Convert")
    return <svg {...props}><path d="M3 7h14M14 4l3 3-3 3"/><path d="M17 13H3M6 10l-3 3 3 3"/></svg>;
  if (name === "Calc")
    return <svg {...props}><rect x="4" y="2" width="12" height="16" rx="2"/><path d="M7 6h6M7 10h6M7 14h3"/></svg>;
  if (name === "Track")
    return <svg {...props}><path d="M2 16l4-5 4 2 5-7"/><circle cx="15" cy="6" r="1.5" fill={color} stroke="none"/></svg>;
  if (name === "Live")
    return <svg {...props}><circle cx="10" cy="10" r="2.5" fill={color} stroke="none"/><path d="M6 10a4 4 0 014-4M14 10a4 4 0 01-4 4"/><path d="M3 10a7 7 0 017-7M17 10a7 7 0 01-7 7"/></svg>;
  if (name === "Learn")
    return <svg {...props}><path d="M3 5l7-3 7 3v9l-7 3-7-3V5z"/><path d="M10 2v15M3 5l7 3 7-3"/></svg>;
  return <svg {...props}><circle cx="10" cy="10" r="7"/></svg>;
};

const DRAWER_ANIMATION_CSS = `
  @keyframes pg-drawer-in { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pg-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
  .pg-drawer-sheet { animation: pg-drawer-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) both; }
  .pg-drawer-backdrop { animation: pg-backdrop-in 0.22s ease both; }
  @media (min-width: 769px) { .pg-mobile-nav, .pg-quick-calc, .pg-drawer-backdrop { display: none !important; } }
  @media (max-width: 768px) { .pg-main-content { padding-bottom: 88px !important; } }
`;

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Close drawer when viewport crosses into desktop range
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mql = window.matchMedia("(min-width: 769px)");
    const onChange = (event) => {
      if (event.matches) setDrawerOpen(false);
    };
    if (mql.matches && drawerOpen) setDrawerOpen(false);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [drawerOpen]);

  // Escape closes; also push a history entry on open so Back / swipe dismisses
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);

    // Push a synthetic history entry so browser Back closes the drawer
    // instead of navigating away. We tag it so popstate only closes on
    // *our* entry.
    let pushed = false;
    try {
      window.history.pushState({ pgMobileDrawer: true }, "");
      pushed = true;
    } catch {}
    const onPop = () => { setDrawerOpen(false); };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      // If our entry is still on top when we tear down (drawer closed
      // programmatically rather than via Back), pop it back off.
      if (pushed && window.history.state && window.history.state.pgMobileDrawer) {
        try { window.history.back(); } catch {}
      }
    };
  }, [drawerOpen]);

  // Body-scroll lock while open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Focus management: move focus into the sheet on open, trap Tab within,
  // restore to the triggering control on close.
  useEffect(() => {
    if (!drawerOpen) {
      const restoreTo = previousFocusRef.current;
      if (restoreTo && typeof restoreTo.focus === "function") {
        try { restoreTo.focus(); } catch {}
      }
      previousFocusRef.current = null;
      return undefined;
    }
    previousFocusRef.current = document.activeElement;
    // Defer focus so the drawer is in the DOM.
    const focusFirst = () => {
      const sheet = drawerRef.current;
      if (!sheet) return;
      const focusable = sheet.querySelector(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || sheet).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const trap = (event) => {
      if (event.key !== "Tab") return;
      const sheet = drawerRef.current;
      if (!sheet) return;
      const focusables = sheet.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) { event.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", trap);
    };
  }, [drawerOpen]);

  const handleTabClick = (index) => {
    if (gi === index) {
      // Tap active group → toggle sub-nav drawer
      setDrawerOpen((v) => !v);
    } else {
      goTo(index, 0);
      setDrawerOpen(false);
    }
  };

  const handleSubItem = (groupIndex, itemIndex) => {
    goTo(groupIndex, itemIndex);
    setDrawerOpen(false);
  };

  const activeGroup = tabs[gi];

  return (
    <>
      <style>{DRAWER_ANIMATION_CSS}</style>

      {/* ── 100dvh sub-nav drawer ──────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="pg-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(5,8,16,0.72)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            ref={drawerRef}
            className="pg-drawer-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeGroup.group} navigation`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              height: "min(100dvh, 100vh)",
              background: `linear-gradient(180deg, ${K.s1}f5 0%, ${K.bg}fa 100%)`,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: `1px solid ${K.bd2}`,
              borderRadius: "20px 20px 0 0",
              display: "flex", flexDirection: "column",
              boxShadow: `0 -24px 64px rgba(0,0,0,0.6), inset 0 1px 0 ${K.bd2}`,
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: K.bd2 }}/>
            </div>

            {/* Section header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 20px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <NavIcon name={LABELS[gi] || activeGroup.group} color={K.gn}/>
                <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: K.gn, letterSpacing: "0.3px" }}>
                  {activeGroup.group}
                </span>
              </div>
              <button
                aria-label="Close navigation"
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: "50%", border: `1px solid ${K.bd2}`,
                  background: `${K.bd}60`, color: K.dm, cursor: "pointer", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable sub-items */}
            <div
              style={{ overflowY: "auto", flex: 1, paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
              role="list"
              aria-label={`${activeGroup.group} navigation items`}
            >
              {activeGroup.items.map((item, itemIndex) => {
                const isActive = ti === itemIndex;
                return (
                  <button
                    key={item.slug}
                    role="listitem"
                    onClick={() => handleSubItem(gi, itemIndex)}
                    style={{
                      display: "flex", alignItems: "center", width: "100%",
                      padding: "14px 20px",
                      background: isActive ? `${K.gn}10` : "transparent",
                      border: "none",
                      borderBottom: `1px solid ${K.bd}40`,
                      borderLeft: `3px solid ${isActive ? K.gn : "transparent"}`,
                      color: isActive ? K.gn : K.tx,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: font, fontSize: 14,
                      fontWeight: isActive ? 700 : 400,
                      gap: 12, transition: "background 0.12s",
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.n}</span>
                    {item.pro && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.8px",
                        textTransform: "uppercase", color: K.yl, background: `${K.yl}18`,
                        padding: "2px 6px", borderRadius: 4,
                      }}>PRO</span>
                    )}
                    {isActive && (
                      <span style={{ fontSize: 10, color: K.gn }}>●</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Group switcher row */}
            <div style={{
              display: "flex", borderTop: `1px solid ${K.bd}`,
              background: `linear-gradient(0deg, ${K.bg} 0%, ${K.s1}e0 100%)`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: `8px 0 env(safe-area-inset-bottom, 10px)`,
            }}>
              {tabs.map((tab, index) => {
                const label = LABELS[index] || tab.group;
                const isTabActive = gi === index;
                return (
                  <button
                    key={tab.group}
                    onClick={() => handleTabClick(index)}
                    aria-label={label}
                    aria-current={isTabActive ? "page" : undefined}
                    style={{
                      flex: 1, padding: "8px 4px 6px", background: "none", border: "none",
                      color: isTabActive ? K.gn : K.mt,
                      cursor: "pointer", fontFamily: font, fontSize: 9,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "color 0.15s",
                    }}
                  >
                    <NavIcon name={label} color={isTabActive ? K.gn : K.mt}/>
                    <span style={{ fontWeight: isTabActive ? 700 : 400 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed bottom rail ─────────────────────────────────────── */}
      <div
        className="pg-mobile-nav"
        role="navigation"
        aria-label="Primary navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: `linear-gradient(180deg, ${K.s1}e8 0%, ${K.bg}f5 100%)`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${K.bd2}`,
          display: "flex",
          padding: `6px 0 env(safe-area-inset-bottom, 0px)`,
          boxShadow: `0 -12px 32px rgba(0,0,0,0.28), inset 0 1px 0 ${K.bd2}40`,
        }}
      >
        {tabs.map((tab, index) => {
          const label = LABELS[index] || tab.group;
          const isActive = gi === index;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabClick(index)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1, padding: "7px 4px 5px", background: "none", border: "none",
                color: isActive ? K.gn : K.mt,
                cursor: "pointer", fontFamily: font, fontSize: 9,
                textTransform: "uppercase", letterSpacing: "0.5px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                position: "relative", transition: "color 0.15s",
              }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <span style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                  width: 28, height: 2, borderRadius: "0 0 2px 2px",
                  background: K.gn,
                  boxShadow: `0 0 8px ${K.gn}80`,
                }}/>
              )}
              <NavIcon name={label} color={isActive ? K.gn : K.mt}/>
              <span style={{ fontWeight: isActive ? 700 : 400 }}>{label}</span>
              {/* Expand hint for active tab */}
              {isActive && (
                <span style={{
                  position: "absolute", bottom: 2, right: "calc(50% - 18px)",
                  fontSize: 7, color: `${K.gn}80`, lineHeight: 1,
                }}>
                  {drawerOpen ? "▾" : "▴"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
