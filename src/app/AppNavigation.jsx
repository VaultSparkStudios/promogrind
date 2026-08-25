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

// SVG icons for each nav group
const NAV_ICONS = [
  // Home
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={active ? K.gn : K.mt} strokeWidth="1.6" fill={active ? `${K.gn}22` : "none"} strokeLinejoin="round"/>
      <rect x="7.5" y="12" width="5" height="6" rx="1" stroke={active ? K.gn : K.mt} strokeWidth="1.4" fill={active ? `${K.gn}30` : "none"}/>
    </svg>
  ),
  // Convert
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 7h10M14 7l-2-2.5M14 7l-2 2.5" stroke={active ? K.gn : K.mt} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 13H6M6 13l2-2.5M6 13l2 2.5" stroke={active ? K.gn : K.mt} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // Calculate
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke={active ? K.gn : K.mt} strokeWidth="1.5" fill={active ? `${K.gn}18` : "none"}/>
      <rect x="5.5" y="5.5" width="4" height="2.5" rx="0.8" fill={active ? K.gn : K.mt} opacity="0.8"/>
      <rect x="10.5" y="5.5" width="4" height="2.5" rx="0.8" fill={active ? K.gn : K.mt} opacity="0.5"/>
      <circle cx="6.5" cy="11" r="1" fill={active ? K.gn : K.mt}/>
      <circle cx="10" cy="11" r="1" fill={active ? K.gn : K.mt}/>
      <circle cx="13.5" cy="11" r="1" fill={active ? K.gn : K.mt}/>
      <circle cx="6.5" cy="14" r="1" fill={active ? K.gn : K.mt} opacity="0.6"/>
      <circle cx="10" cy="14" r="1" fill={active ? K.gn : K.mt} opacity="0.6"/>
      <circle cx="13.5" cy="14" r="1" fill={active ? K.ac : K.ac} opacity="0.8"/>
    </svg>
  ),
  // Track
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polyline points="3,15 7,9 11,12 15,5 17,7" stroke={active ? K.gn : K.mt} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M3 15h14" stroke={active ? K.mt : K.bd2} strokeWidth="1" strokeLinecap="round"/>
      <circle cx="15" cy="5" r="2" fill={active ? K.gn : "none"} stroke={active ? K.gn : K.mt} strokeWidth="1.4"/>
    </svg>
  ),
  // Live
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill={active ? K.rd : K.mt}/>
      <circle cx="10" cy="10" r="6" stroke={active ? K.rd : K.mt} strokeWidth="1.3" fill="none" opacity="0.5"/>
      <circle cx="10" cy="10" r="9" stroke={active ? K.rd : K.mt} strokeWidth="1" fill="none" opacity="0.25"/>
    </svg>
  ),
  // Learn
  (active) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4L2 8l8 4 8-4-8-4z" stroke={active ? K.gn : K.mt} strokeWidth="1.5" fill={active ? `${K.gn}18` : "none"} strokeLinejoin="round"/>
      <path d="M5 10.5v4c0 1 2.2 2 5 2s5-1 5-2v-4" stroke={active ? K.gn : K.mt} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="17" y1="8" x2="17" y2="13" stroke={active ? K.gn : K.mt} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
];

const GROUP_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

// Subcat order for grouping the Calculate items in the drawer
const SUBCAT_ORDER = ["Promo", "Arbitrage", "Value & EV", "Advanced"];

function groupItems(items) {
  // If items have subcat, group them; otherwise flat list
  const hasSubcats = items.some((item) => item.subcat);
  if (!hasSubcats) return [{ label: null, items }];

  const groups = [];
  SUBCAT_ORDER.forEach((cat) => {
    const catItems = items.filter((item) => item.subcat === cat);
    if (catItems.length) groups.push({ label: cat, items: catItems });
  });
  const uncategorized = items.filter((item) => !item.subcat);
  if (uncategorized.length) groups.unshift({ label: null, items: uncategorized });
  return groups;
}

// Full-screen bottom sheet for a single nav group
function MobileGroupDrawer({ tab, groupIndex, currentGi, currentTi, goTo, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const startTouchY = useRef(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const items = tab.items || [];
  const hasSearch = items.length > 6;

  const filtered = q.trim()
    ? items.filter((item) => item.n.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  const groups = groupItems(filtered);

  const onTouchStart = (e) => { startTouchY.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (startTouchY.current === null) return;
    const dy = e.touches[0].clientY - startTouchY.current;
    if (dy > 0) setTranslateY(dy);
  };
  const onTouchEnd = () => {
    if (translateY > 80) { onClose(); } else { setTranslateY(0); }
    startTouchY.current = null;
  };

  const navigate = (gi, ti) => { goTo(gi, ti); onClose(); };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.58)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
      aria-modal="true"
      role="dialog"
      aria-label={`${tab.group} navigation`}
    >
      <div
        ref={sheetRef}
        style={{
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          borderTop: `1px solid ${K.bd2}`,
          borderRadius: "20px 20px 0 0",
          maxHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.46)",
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
          willChange: "transform",
          animation: "pgDrawerIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <style>{`
          @keyframes pgDrawerIn {
            from { transform: translateY(100%); opacity: 0.6; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Drag handle — swipe-to-dismiss scoped here so the item list scrolls freely */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", touchAction: "none" }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 99, background: K.bd2 }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 18px 10px", gap: 10, borderBottom: `1px solid ${K.bd}` }}>
          <span style={{ fontSize: 18 }}>{NAV_ICONS[groupIndex]?.(true)}</span>
          <span style={{ fontFamily: "'Space Grotesk','SF Pro Display',sans-serif", fontSize: 17, fontWeight: 800, color: K.gn, letterSpacing: "-0.3px", flex: 1 }}>
            {tab.group}
          </span>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{ width: 32, height: 32, borderRadius: 99, background: K.s3, border: "none", color: K.dm, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>

        {/* Search (for large groups) */}
        {hasSearch && (
          <div style={{ padding: "10px 16px 0" }}>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${tab.group.toLowerCase()}…`}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 14px", borderRadius: 10,
                background: K.s3, border: `1px solid ${K.bd2}`,
                color: K.tx, fontFamily: font, fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Item list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "10px 0 calc(env(safe-area-inset-bottom,0px) + 12px)", WebkitOverflowScrolling: "touch" }}>
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div style={{
                  padding: "10px 18px 4px",
                  fontSize: 10, fontWeight: 700, color: K.mt,
                  textTransform: "uppercase", letterSpacing: "1.4px",
                }}>
                  {group.label}
                </div>
              )}
              {group.items.map((item, ti) => {
                const realTi = items.indexOf(item);
                const isActive = currentGi === groupIndex && currentTi === realTi;
                return (
                  <button
                    key={item.slug || item.n}
                    onClick={() => navigate(groupIndex, realTi)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "13px 18px",
                      background: isActive ? `${K.gn}14` : "transparent",
                      border: "none",
                      borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                      color: isActive ? K.gn : K.tx,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: font, fontSize: 14,
                      fontWeight: isActive ? 700 : 400,
                      transition: "background 0.12s",
                    }}
                  >
                    <span>{item.n}</span>
                    {isActive && (
                      <span aria-hidden="true" style={{ fontSize: 10, color: K.gn, fontWeight: 700, letterSpacing: "0.8px" }}>
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {!filtered.length && (
            <div style={{ textAlign: "center", padding: 32, color: K.mt, fontSize: 13 }}>
              No matches for "{q}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [drawerGroup, setDrawerGroup] = useState(null);

  const openDrawer = (index) => {
    const tab = tabs[index];
    // Groups with a single item navigate directly
    if (!tab || tab.items.length === 1) { goTo(index, 0); return; }
    setDrawerGroup(index);
  };

  const closeDrawer = () => setDrawerGroup(null);

  return (
    <>
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg, ${K.s1}f0, ${K.s2})`,
          borderTop: `1px solid ${K.bd}`,
          display: "flex",
          zIndex: 100,
          padding: `6px 0 env(safe-area-inset-bottom,0px)`,
          boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const active = gi === index;
          const Icon = NAV_ICONS[index];
          return (
            <button
              key={tab.group}
              onClick={() => openDrawer(index)}
              aria-label={`Open ${tab.group} navigation`}
              aria-expanded={drawerGroup === index}
              style={{
                flex: 1,
                padding: "7px 4px 5px",
                background: "none",
                border: "none",
                color: active ? K.gn : K.mt,
                cursor: "pointer",
                fontFamily: font,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              {active && (
                <span style={{
                  position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
                  width: 24, height: 24, borderRadius: "50%",
                  background: `${K.gn}18`,
                  pointerEvents: "none",
                }} />
              )}
              {Icon ? Icon(active) : (
                <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>{GROUP_LABELS[index] || tab.group}</span>
              )}
              <span style={{
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px",
                fontWeight: active ? 700 : 400,
                lineHeight: 1,
              }}>
                {GROUP_LABELS[index] || tab.group}
              </span>
            </button>
          );
        })}
      </div>

      {drawerGroup !== null && (
        <MobileGroupDrawer
          tab={tabs[drawerGroup]}
          groupIndex={drawerGroup}
          currentGi={gi}
          currentTi={ti ?? 0}
          goTo={goTo}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
