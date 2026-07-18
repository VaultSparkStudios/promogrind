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

// ─── SVG icons for each nav group ─────────────────────────────────────────────

const GROUP_ICONS = {
  Home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Convert: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Calculate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="12" x2="10" y2="12"/>
      <line x1="14" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="10" y2="16"/>
      <line x1="14" y1="16" x2="16" y2="16"/>
    </svg>
  ),
  Track: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Live: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Learn: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
};

const BOTTOM_NAV_ICONS = {
  Home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Convert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Calculate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="12" x2="10" y2="12"/>
      <line x1="14" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="10" y2="16"/>
      <line x1="14" y1="16" x2="16" y2="16"/>
    </svg>
  ),
  Track: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Live: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Learn: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
};

// ─── Hamburger icon ────────────────────────────────────────────────────────────

const HamburgerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

// ─── Full-height mobile nav drawer (CANON-041) ─────────────────────────────────

export function MobileNavDrawer({ open, onClose, tabs, gi, goTo, activeSlug }) {
  const scrollRef = useRef(null);
  const [expandedGroup, setExpandedGroup] = useState(gi);
  const touchStartY = useRef(null);

  // Sync expanded group with active tab
  useEffect(() => { if (open) setExpandedGroup(gi); }, [open, gi]);

  // Scroll active group into view on open
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const active = scrollRef.current.querySelector("[data-active-group='true']");
    if (active) active.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Swipe-down to dismiss
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    if (touchStartY.current == null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) onClose();
    touchStartY.current = null;
  };

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes pg-drawer-up {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .pg-nav-drawer {
          animation: pg-drawer-up 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        .pg-nav-drawer-item:active { background: rgba(96,165,250,0.12) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        aria-hidden="true"
      />

      {/* Drawer panel — full height */}
      <div
        className="pg-nav-drawer"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 950,
          background: K.bg,
          display: "flex",
          flexDirection: "column",
          overflowY: "hidden",
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "12px 0 4px",
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 999,
            background: K.bd2, opacity: 0.6,
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px 12px",
          borderBottom: `1px solid ${K.bd}`,
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Space Grotesk','SF Pro Display',sans-serif", fontWeight: 800, fontSize: 18, color: K.tx, letterSpacing: "-0.5px" }}>
            <span style={{ color: K.gn }}>Promo</span>Grind
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: K.s2, border: `1px solid ${K.bd}`,
              color: K.mt, cursor: "pointer", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable nav list */}
        <div
          ref={scrollRef}
          role="navigation"
          aria-label="All sections"
          style={{ overflowY: "auto", flex: 1, padding: "8px 0 32px" }}
        >
          {tabs.map((tab, groupIndex) => {
            const isActiveGroup = gi === groupIndex;
            const isExpanded = expandedGroup === groupIndex;
            const groupIcon = GROUP_ICONS[tab.group] || null;

            return (
              <div key={tab.group} data-active-group={isActiveGroup ? "true" : undefined}>
                {/* Group header — tap to expand or navigate */}
                <button
                  onClick={() => {
                    if (isExpanded && groupIndex !== expandedGroup) {
                      setExpandedGroup(groupIndex);
                    } else {
                      setExpandedGroup(isExpanded ? -1 : groupIndex);
                    }
                    // Navigate to first item of group if collapsing a different group
                    if (!isExpanded) {
                      goTo(groupIndex, 0);
                    }
                  }}
                  aria-expanded={isExpanded}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "14px 20px",
                    background: isActiveGroup ? `${K.gn}0e` : "transparent",
                    border: "none",
                    borderLeft: isActiveGroup ? `3px solid ${K.gn}` : "3px solid transparent",
                    color: isActiveGroup ? K.gn : K.tx,
                    cursor: "pointer", fontFamily: font,
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: isActiveGroup ? K.gn : K.dm, display: "flex", alignItems: "center" }}>
                      {groupIcon}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isActiveGroup ? 700 : 500, letterSpacing: "0.3px" }}>
                      {tab.group}
                    </span>
                    <span style={{ fontSize: 10, color: K.mt, background: K.s2, borderRadius: 999, padding: "1px 6px" }}>
                      {tab.items.length}
                    </span>
                  </div>
                  <span style={{ color: K.mt, fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ▾
                  </span>
                </button>

                {/* Sub-items */}
                {isExpanded && (
                  <div style={{ borderBottom: `1px solid ${K.bd}30` }}>
                    {tab.items.map((item, itemIndex) => {
                      const isActiveItem = isActiveGroup && gi === groupIndex && activeSlug === item.slug;
                      return (
                        <button
                          key={item.slug}
                          className="pg-nav-drawer-item"
                          onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "11px 20px 11px 52px",
                            background: isActiveItem ? `${K.ac}14` : "transparent",
                            border: "none",
                            borderLeft: isActiveItem ? `3px solid ${K.ac}` : "3px solid transparent",
                            color: isActiveItem ? K.ac : K.dm,
                            cursor: "pointer", fontFamily: font,
                            fontSize: 13,
                            textAlign: "left",
                            transition: "background 0.1s",
                          }}
                        >
                          <span style={{ fontWeight: isActiveItem ? 600 : 400 }}>{item.n}</span>
                          {item.pro && (
                            <span style={{ fontSize: 9, color: K.pp, background: `${K.pp}18`, borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.5px" }}>
                              PRO
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
  const labels = ["Home", "Convert", "Calc", "Track", "Live", "All"];

  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "4px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.slice(0, 5).map((tab, index) => (
        <button
          key={tab.group}
          onClick={() => goTo(index, 0)}
          aria-label={tab.group}
          aria-pressed={gi === index}
          style={{
            flex: 1, padding: "7px 2px 5px", background: "none", border: "none",
            color: gi === index ? K.gn : K.mt,
            cursor: "pointer", fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.4px", fontFamily: font,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            minHeight: 44,
            transition: "color 0.15s",
            borderTop: gi === index ? `2px solid ${K.gn}` : "2px solid transparent",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", color: gi === index ? K.gn : K.mt }}>
            {BOTTOM_NAV_ICONS[tab.group] || null}
          </span>
          <span style={{ fontWeight: gi === index ? 700 : 400, lineHeight: 1 }}>
            {tab.group}
          </span>
        </button>
      ))}
      {/* ≡ All — opens 100dvh scrollable drawer */}
      <button
        onClick={onOpenDrawer}
        aria-label="Open full navigation menu"
        aria-haspopup="dialog"
        style={{
          flex: 1, padding: "7px 2px 5px", background: "none", border: "none",
          color: gi >= 5 ? K.gn : K.mt,
          cursor: "pointer", fontSize: 9, textTransform: "uppercase",
          letterSpacing: "0.4px", fontFamily: font,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          minHeight: 44,
          transition: "color 0.15s",
          borderTop: gi >= 5 ? `2px solid ${K.gn}` : "2px solid transparent",
        }}
      >
        <span style={{ display: "flex", alignItems: "center" }}>
          <HamburgerIcon />
        </span>
        <span style={{ fontWeight: gi >= 5 ? 700 : 400, lineHeight: 1 }}>All</span>
      </button>
    </div>
  );
}
