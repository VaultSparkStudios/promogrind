import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
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

// SVG icon paths for primary nav tabs — semantically distinct marks at small sizes
const NAV_SVGS = [
  // Home: house outline
  <svg key="home" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 18v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  // Convert: two arrows
  <svg key="convert" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 6h12M4 6l3-3M4 6l3 3M16 14H4M16 14l-3-3M16 14l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  // Calc: grid squares
  <svg key="calc" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  // Track: upward trend line
  <svg key="track" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 14l4.5-5 4 3L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  // Live: lightning bolt
  <svg key="live" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12 2L5 11h6l-3 7 9-9h-6l3-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
];
const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live"];

export function MobileNavDrawer({ isOpen, onClose, tabs, gi, ti, goTo }) {
  const [expandedGroup, setExpandedGroup] = useState(gi);
  const drawerRef = useRef(null);

  useEffect(() => { if (isOpen) setExpandedGroup(gi); }, [isOpen, gi]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Focus trap + Escape + focus restore
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement;
    const el = drawerRef.current;
    if (!el) return;

    const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(el.querySelectorAll(FOCUSABLE));

    // Move focus into the drawer
    const first = getFocusable()[0];
    first?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) { e.preventDefault(); return; }
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === focusable[0]) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); focusable[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to the element that opened the drawer
      try { trigger?.focus(); } catch {}
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 1900,
        }}
        aria-hidden="true"
      />
      {/* 100dvh slide-up sheet */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Full navigation"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "100dvh",
          background: `linear-gradient(180deg, ${K.s1} 0%, ${K.s2} 100%)`,
          borderRadius: "22px 22px 0 0",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.45)",
          overflowY: "hidden",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>

        {/* Header row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 20px 14px", borderBottom: `1px solid ${K.bd}`, flexShrink: 0,
        }}>
          <div style={{ fontFamily: fontD, fontSize: 15, fontWeight: 800, color: K.gn, letterSpacing: "-0.3px" }}>
            All Sections
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 36, height: 36, borderRadius: 10, cursor: "pointer",
              background: "transparent", border: `1px solid ${K.bd2}`,
              color: K.mt, fontSize: 16, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable nav tree */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
          {tabs.map((tabGroup, groupIndex) => {
            const isGroupActive = gi === groupIndex;
            const isExpanded = expandedGroup === groupIndex;

            return (
              <div key={tabGroup.group}>
                {/* Section header */}
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : groupIndex)}
                  aria-expanded={isExpanded}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "15px 20px",
                    background: isGroupActive ? `${K.gn}0d` : "transparent",
                    border: "none",
                    borderLeft: isGroupActive ? `3px solid ${K.gn}` : "3px solid transparent",
                    color: isGroupActive ? K.gn : K.tx,
                    cursor: "pointer", fontFamily: font,
                    fontSize: 13, fontWeight: isGroupActive ? 700 : 500,
                    textAlign: "left", textTransform: "uppercase", letterSpacing: "1.1px",
                  }}
                >
                  <span>{tabGroup.group}</span>
                  <span style={{ fontSize: 10, color: K.mt, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ opacity: 0.6 }}>{tabGroup.items.length}</span>
                    <span style={{ fontSize: 8 }}>{isExpanded ? "▲" : "▼"}</span>
                  </span>
                </button>

                {/* Items list */}
                {isExpanded && (
                  <div style={{ borderBottom: `1px solid ${K.bd}` }}>
                    {tabGroup.items.map((navItem, itemIndex) => {
                      const isItemActive = isGroupActive && ti === itemIndex;
                      return (
                        <button
                          key={navItem.slug || navItem.n}
                          onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "12px 20px 12px 32px",
                            background: isItemActive ? `${K.ac}12` : "transparent",
                            border: "none",
                            borderLeft: isItemActive ? `3px solid ${K.ac}` : "3px solid transparent",
                            color: isItemActive ? K.ac : K.dm,
                            cursor: "pointer", fontFamily: font,
                            fontSize: 13, fontWeight: isItemActive ? 600 : 400,
                            textAlign: "left",
                          }}
                        >
                          <span>{navItem.n}</span>
                          {navItem.pro && (
                            <span style={{
                              fontSize: 9, color: K.pp, textTransform: "uppercase",
                              letterSpacing: "0.8px", border: `1px solid ${K.pp}40`,
                              borderRadius: 4, padding: "1px 5px",
                            }}>
                              Pro
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, goTo, tabs, onOpenDrawer }) {
  // Show up to 5 primary group tabs + "More" to open the full drawer
  const primaryTabs = tabs.slice(0, 5);

  return (
    <div
      className="pg-mobile-nav"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(180deg,${K.s1},${K.s2})`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex", zIndex: 100,
        padding: "4px 0 env(safe-area-inset-bottom,0px)",
        boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {primaryTabs.map((tab, index) => {
        const isActive = gi === index;
        return (
          <button
            key={tab.group}
            onClick={() => goTo(index, 0)}
            aria-label={NAV_LABELS[index] || tab.group}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1, padding: "7px 4px 6px",
              background: "none", border: "none",
              color: isActive ? K.gn : K.mt,
              cursor: "pointer", fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "color 0.15s",
            }}
          >
            {/* SVG icon */}
            <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {NAV_SVGS[index] || null}
            </span>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: isActive ? 700 : 400 }}>
              {NAV_LABELS[index] || tab.group}
            </span>
            {isActive && (
              <span style={{
                position: "absolute", bottom: "env(safe-area-inset-bottom, 0px)",
                width: 24, height: 2, borderRadius: 1, background: K.gn,
              }} aria-hidden="true" />
            )}
          </button>
        );
      })}

      {/* More / Browse — opens 100dvh drawer */}
      <button
        onClick={onOpenDrawer}
        aria-label="Browse all sections"
        aria-haspopup="dialog"
        style={{
          flex: 1, padding: "7px 4px 6px",
          background: "none", border: "none",
          color: gi >= 5 ? K.gn : K.mt,
          cursor: "pointer", fontFamily: font,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          transition: "color 0.15s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="5" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
        </svg>
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 400 }}>
          More
        </span>
      </button>
    </div>
  );
}
