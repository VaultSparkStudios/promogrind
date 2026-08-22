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

// Inline SVG icons — stroke-based, 24×24 viewBox, no external deps
const TAB_ICONS = [
  // Home
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  // Convert (arrows)
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V5m0 0L3 9m4-4l4 4"/>
      <path d="M17 8v11m0 0l4-4m-4 4l-4-4"/>
    </svg>
  ),
  // Calc (calculator grid)
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
      <line x1="15" y1="9" x2="15" y2="21"/>
      <line x1="3" y1="15" x2="9" y2="15"/>
    </svg>
  ),
  // Track (bar chart)
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="8"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="13"/>
      <line x1="3" y1="20" x2="21" y2="20"/>
    </svg>
  ),
  // Live (lightning bolt)
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={active ? `${color}20` : "none"}/>
    </svg>
  ),
  // Learn (book)
  (active, color) => (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="9" y1="7" x2="15" y2="7"/>
    </svg>
  ),
];

const MENU_ICON = (active, color) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const GROUP_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];
// Primary tabs shown in the bottom bar (indices into TABS)
const PRIMARY_TAB_INDICES = [0, 1, 2, 3, 4];

const FOCUSABLE_SELECTORS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function NavDrawer({ open, onClose, tabs, gi, goTo, openerRef }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Body scroll lock — prevents the page behind the modal from scrolling
  useEffect(() => {
    if (!open) return;
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = saved; };
  }, [open]);

  // Focus management + Escape key + Tab containment
  useEffect(() => {
    if (!open) return;
    // Move focus into drawer on open
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = [...panel.querySelectorAll(FOCUSABLE_SELECTORS)];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to the opener on close
      openerRef?.current?.focus?.();
    };
  }, [open, onClose, openerRef]);

  // Scroll to top when opened
  useEffect(() => {
    if (open && panelRef.current) panelRef.current.scrollTop = 0;
  }, [open]);

  return (
    <>
      <style>{`
        @keyframes pg-drawer-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes pg-drawer-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .pg-nav-drawer-panel { animation: pg-drawer-slide-in 0.22s cubic-bezier(0.32,0,0,1) forwards; }
        .pg-nav-drawer-backdrop { animation: pg-drawer-fade-in 0.18s ease forwards; }
        .pg-nav-drawer-group-item:active { opacity: 0.65; }
        @media (prefers-reduced-motion: reduce) {
          .pg-nav-drawer-panel, .pg-nav-drawer-backdrop { animation: none !important; }
        }
      `}</style>
      {open && (
        <div
          className="pg-nav-drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", justifyContent: "flex-end" }}
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,8,0.72)", backdropFilter: "blur(2px)" }}
            aria-hidden="true"
          />
          {/* Panel — 100dvh, scrollable */}
          <div
            ref={panelRef}
            className="pg-nav-drawer-panel"
            style={{
              position: "relative",
              width: "min(88vw, 300px)",
              height: "100dvh",
              background: K.s1,
              borderLeft: `1px solid ${K.bd}`,
              overflowY: "auto",
              overflowX: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-16px 0 48px rgba(0,0,0,0.5)",
              zIndex: 1,
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 16px 14px",
              borderBottom: `1px solid ${K.bd}`,
              position: "sticky", top: 0,
              background: K.s1,
              zIndex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: K.gn,
                  boxShadow: `0 0 8px ${K.gn}`,
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: K.tx, fontFamily: font, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  Navigate
                </span>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close navigation"
                style={{
                  background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8,
                  color: K.mt, cursor: "pointer", fontFamily: font,
                  width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* All tab groups */}
            <div style={{ flex: 1, padding: "8px 0 24px" }}>
              {tabs.map((tab, groupIndex) => {
                const isActiveGroup = gi === groupIndex;
                const iconFn = TAB_ICONS[groupIndex] || TAB_ICONS[TAB_ICONS.length - 1];
                return (
                  <div key={tab.group} style={{ marginBottom: 4 }}>
                    {/* Group header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 16px 6px",
                      borderTop: groupIndex > 0 ? `1px solid ${K.bd}` : "none",
                      marginTop: groupIndex > 0 ? 8 : 0,
                    }}>
                      <span style={{ opacity: 0.8 }}>
                        {iconFn(isActiveGroup, isActiveGroup ? K.gn : K.mt)}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: isActiveGroup ? K.gn : K.dm,
                        textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: font,
                      }}>
                        {GROUP_LABELS[groupIndex] || tab.group}
                      </span>
                      {isActiveGroup && (
                        <span style={{
                          marginLeft: "auto", fontSize: 9, color: K.gn,
                          background: `${K.gn}18`, border: `1px solid ${K.gn}30`,
                          borderRadius: 4, padding: "1px 5px", fontFamily: font,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>Active</span>
                      )}
                    </div>
                    {/* Sub-items */}
                    {tab.items.map((item, itemIndex) => {
                      const isActiveSub = isActiveGroup; // any sub-item in active group
                      return (
                        <button
                          key={item.n || item.slug}
                          className="pg-nav-drawer-group-item"
                          onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                          style={{
                            display: "block", width: "100%",
                            padding: "9px 16px 9px 40px",
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${K.bd}08`,
                            color: K.dm,
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 12,
                            fontFamily: font,
                            letterSpacing: "0.2px",
                            transition: "background 0.1s, color 0.1s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = `${K.ac}0a`; e.currentTarget.style.color = K.tx; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = K.dm; }}
                        >
                          {item.n || item.slug}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: "12px 16px",
              borderTop: `1px solid ${K.bd}`,
              fontSize: 10, color: K.mt, fontFamily: font,
              textAlign: "center", letterSpacing: "0.3px",
            }}>
              PromoGrind · VaultSpark Studios
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuBtnRef = useRef(null);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  // Whether the active group index is beyond the primary tab strip
  const isMenuActive = gi >= PRIMARY_TAB_INDICES.length;

  return (
    <>
      <div className="pg-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(180deg,${K.s1}f0,${K.s2}fc)`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        padding: `6px 0 env(safe-area-inset-bottom,0px)`,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <style>{`
          ${MOBILE_NAV_RESPONSIVE_CSS}
          .pg-nav-btn { -webkit-tap-highlight-color: transparent; transition: opacity 0.12s; }
          .pg-nav-btn:active { opacity: 0.6; }
          @keyframes pg-nav-pip-pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        `}</style>

        {/* Primary tab buttons */}
        {PRIMARY_TAB_INDICES.map((tabIndex) => {
          const tab = tabs[tabIndex];
          if (!tab) return null;
          const isActive = gi === tabIndex;
          const iconFn = TAB_ICONS[tabIndex];
          const color = isActive ? K.gn : K.mt;
          return (
            <button
              key={tab.group}
              className="pg-nav-btn"
              onClick={() => goTo(tabIndex, 0)}
              aria-label={GROUP_LABELS[tabIndex] || tab.group}
              aria-pressed={isActive}
              style={{
                flex: 1,
                padding: "6px 2px 5px",
                background: "none",
                border: "none",
                color,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {/* Active indicator pip */}
              {isActive && (
                <span style={{
                  position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
                  width: 20, height: 2, borderRadius: 2,
                  background: K.gn,
                  boxShadow: `0 0 6px ${K.gn}`,
                }} />
              )}
              {iconFn(isActive, color)}
              <span style={{
                fontSize: 8,
                fontFamily: font,
                fontWeight: isActive ? 700 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                lineHeight: 1,
              }}>
                {GROUP_LABELS[tabIndex] || tab.group}
              </span>
            </button>
          );
        })}

        {/* Menu button */}
        <button
          ref={menuBtnRef}
          className="pg-nav-btn"
          onClick={openDrawer}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          style={{
            flex: 1,
            padding: "6px 2px 5px",
            background: "none",
            border: "none",
            color: isMenuActive ? K.gn : K.mt,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            position: "relative",
          }}
        >
          {isMenuActive && (
            <span style={{
              position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
              width: 20, height: 2, borderRadius: 2,
              background: K.gn,
              boxShadow: `0 0 6px ${K.gn}`,
            }} />
          )}
          {MENU_ICON(isMenuActive, isMenuActive ? K.gn : K.mt)}
          <span style={{
            fontSize: 8,
            fontFamily: font,
            fontWeight: isMenuActive ? 700 : 400,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            lineHeight: 1,
          }}>
            More
          </span>
        </button>
      </div>

      <NavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        tabs={tabs}
        gi={gi}
        goTo={goTo}
        openerRef={menuBtnRef}
      />
    </>
  );
}
