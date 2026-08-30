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
function NavIcon({ group, active }) {
  const stroke = active ? K.gn : K.mt;
  const sw = active ? 2.5 : 1.8;
  const sz = 20;
  if (group === "Home") return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
  if (group === "Convert") return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  );
  if (group === "Calculate") return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
      <line x1="15" y1="9" x2="15" y2="21"/>
    </svg>
  );
  if (group === "Track") return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
  if (group === "Live") return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
  // Learn / default
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}

// 100dvh slide-up drawer listing all sub-items for the current group
export function MobileSubNavDrawer({ group, currentTi, onItemSelect, onClose }) {
  if (!group) return null;
  return (
    <>
      <style>{`
        @keyframes pg-drawer-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .pg-subnav-sheet { animation: pg-drawer-in 0.26s cubic-bezier(0.32, 0.72, 0, 1) both; }
      `}</style>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1200, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-label={`${group.group} navigation`}
        aria-modal="true"
        className="pg-subnav-sheet"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: "85dvh", maxHeight: "85dvh",
          background: `linear-gradient(180deg,${K.s1},${K.s2})`,
          borderTop: `2px solid ${K.gn}30`,
          borderRadius: "20px 20px 0 0",
          zIndex: 1201,
          display: "flex", flexDirection: "column",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Drag handle + header */}
        <div style={{ padding: "12px 20px 10px", borderBottom: `1px solid ${K.bd}40`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: K.bd2, borderRadius: 2, margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: font, letterSpacing: "-0.3px" }}>
                {group.group}
              </div>
              <div style={{ fontSize: 10, color: K.mt, marginTop: 2, textTransform: "uppercase", letterSpacing: "1px" }}>
                {group.items.length} tools
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation drawer"
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: `${K.bd2}30`, border: `1px solid ${K.bd}`,
                color: K.mt, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        </div>
        {/* Scrollable item list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 56px" }}>
          {group.items.map((item, index) => {
            const isActive = index === currentTi;
            return (
              <button
                key={item.slug}
                onClick={() => { onItemSelect(index); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  padding: "14px 16px", marginBottom: 6,
                  background: isActive ? `${K.gn}10` : "transparent",
                  border: `1px solid ${isActive ? K.gn + "50" : K.bd}`,
                  borderRadius: 12,
                  color: isActive ? K.gn : K.tx,
                  cursor: "pointer", textAlign: "left",
                  fontFamily: font, fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  minHeight: 52,
                  transition: "background 0.1s, border-color 0.1s",
                }}
              >
                <span style={{ flex: 1 }}>{item.n}</span>
                {item.pro && (
                  <span style={{ fontSize: 9, color: K.pp, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 700, marginRight: 8 }}>
                    PRO
                  </span>
                )}
                {isActive && (
                  <span style={{ fontSize: 12, color: K.gn, fontWeight: 700 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, goTo, tabs, onGroupRetap }) {
  // onGroupRetap: called when user taps the already-active group icon — opens the sub-nav drawer
  const shortLabel = (group) => {
    if (group === "Calculate") return "Calc";
    if (group === "Convert") return "Promo";
    return group;
  };

  return (
    <div className="pg-mobile-nav" role="navigation" aria-label="Primary navigation" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: `6px 0 env(safe-area-inset-bottom,0px)`, boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const active = gi === index;
        return (
          <button
            key={tab.group}
            onClick={() => {
              if (active && onGroupRetap) {
                onGroupRetap();
              } else {
                goTo(index, 0);
              }
            }}
            aria-label={`${tab.group}${active ? ", current section" : ""}`}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1, padding: "6px 2px",
              background: active ? `${K.gn}08` : "none",
              border: "none",
              borderTop: active ? `2px solid ${K.gn}` : "2px solid transparent",
              color: active ? K.gn : K.mt,
              cursor: "pointer",
              fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              transition: "color 0.15s, background 0.15s",
              minHeight: 52,
            }}
          >
            <NavIcon group={tab.group} active={active} />
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: active ? 700 : 400, lineHeight: 1 }}>
              {shortLabel(tab.group)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
