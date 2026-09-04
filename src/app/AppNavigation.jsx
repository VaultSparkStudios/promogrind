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

const NAV_ICONS = {
  Home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <polyline points="9 21 9 12 15 12 15 21"/>
    </svg>
  ),
  Convert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Calculate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  Track: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Live: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
      <path d="M20.07 3.93a12 12 0 0 1 0 16.97"/>
      <path d="M3.93 20.07a12 12 0 0 1 0-16.97"/>
    </svg>
  ),
  Learn: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
};

const NAV_LABELS = { Home: "Home", Convert: "Convert", Calculate: "Calc", Track: "Track", Live: "Live", Learn: "Learn" };

export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [sheetGroup, setSheetGroup] = useState(null);

  const handleTabPress = (index) => {
    if (gi === index) {
      setSheetGroup(sheetGroup === index ? null : index);
    } else {
      goTo(index, 0);
      setSheetGroup(index);
    }
  };

  const handleItemPress = (groupIndex, itemIndex) => {
    goTo(groupIndex, itemIndex);
    setSheetGroup(null);
  };

  const closeSheet = () => setSheetGroup(null);
  const activeGroup = sheetGroup !== null ? tabs[sheetGroup] : null;

  return (
    <>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {activeGroup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeGroup.group} navigation`}
          className="pg-subnav-sheet-backdrop"
          onClick={closeSheet}
          style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        >
          <div
            className="pg-subnav-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 72, left: 0, right: 0,
              maxHeight: "calc(100dvh - 88px)", overflowY: "auto",
              background: K.s1, borderTop: `1px solid ${K.bd2}`,
              borderRadius: "18px 18px 0 0",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: `1px solid ${K.bd}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: font }}>{activeGroup.group}</span>
              <button onClick={closeSheet} aria-label="Close navigation" style={{ background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>
            <div role="list" style={{ padding: "6px 0 env(safe-area-inset-bottom,8px)" }}>
              {activeGroup.items.map((item, itemIndex) => {
                const isActive = gi === sheetGroup && ti === itemIndex;
                return (
                  <button
                    key={item.slug}
                    role="listitem"
                    onClick={() => handleItemPress(sheetGroup, itemIndex)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "12px 16px",
                      background: isActive ? `${K.gn}12` : "transparent",
                      border: "none", borderBottom: `1px solid ${K.bd}`,
                      color: isActive ? K.gn : K.tx,
                      cursor: "pointer", fontFamily: font, textAlign: "left",
                      fontSize: 14, fontWeight: isActive ? 700 : 400,
                      minHeight: 44,
                    }}
                  >
                    <span>{item.n}</span>
                    {isActive && <span aria-hidden="true" style={{ fontSize: 10, color: K.gn }}>●</span>}
                    {item.pro && !isActive && <span style={{ fontSize: 9, color: K.pp, textTransform: "uppercase", letterSpacing: "0.8px", border: `1px solid ${K.pp}40`, borderRadius: 4, padding: "1px 5px" }}>Pro</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "4px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
        {tabs.map((tab, index) => {
          const active = gi === index;
          const sheetOpen = sheetGroup === index;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabPress(index)}
              aria-label={NAV_LABELS[tab.group] || tab.group}
              aria-pressed={sheetOpen}
              style={{
                flex: 1, padding: "6px 4px 4px", background: "none", border: "none",
                color: active ? K.gn : K.mt, cursor: "pointer",
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px",
                fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                minHeight: 44,
                transition: "color 0.15s",
              }}
            >
              <span style={{ color: active ? K.gn : K.mt, opacity: sheetOpen ? 0.7 : 1, transition: "opacity 0.15s" }}>
                {NAV_ICONS[tab.group] || null}
              </span>
              <span style={{ fontWeight: active ? 700 : 400, fontSize: 8, letterSpacing: "0.8px" }}>{NAV_LABELS[tab.group] || tab.group}</span>
              {active && <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: "50%", background: K.gn, display: "block" }} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
