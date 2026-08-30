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

// Inline SVG icons for each bottom-nav group. Stroke-based, 20px.
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconConvert = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);
const IconCalculate = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);
const IconTrack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconLive = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconLearn = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z" />
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z" />
  </svg>
);

// Maps tab group index → icon component. Order must match buildAppTabs().
const NAV_ICONS = [IconHome, IconConvert, IconCalculate, IconTrack, IconLive, IconLearn];

export function MobileBottomNav({ gi, goTo, tabs, onNavTap }) {
  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        const Icon = NAV_ICONS[index] || IconHome;
        return (
          <button
            key={tab.group}
            onClick={() => onNavTap ? onNavTap(index) : goTo(index, 0)}
            aria-label={tab.group}
            aria-pressed={isActive}
            style={{
              flex: 1,
              padding: "5px 4px 4px",
              background: "none",
              border: "none",
              color: isActive ? K.gn : K.mt,
              cursor: "pointer",
              fontFamily: font,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              WebkitTapHighlightColor: "transparent",
              transition: "color 0.15s",
            }}
          >
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 26,
              borderRadius: 999,
              background: isActive ? `${K.gn}1a` : "transparent",
              transition: "background 0.2s",
            }}>
              <Icon />
            </span>
            <span style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: isActive ? 700 : 400,
              lineHeight: 1,
            }}>
              {tab.group}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MobileSubNavSheet({ open, group, gi, ti, goTo, onClose }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Scroll active item into view when sheet opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector("[aria-current='page']");
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [open, ti]);

  if (!open || !group) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.52)",
          zIndex: 1998,
          WebkitBackdropFilter: "blur(2px)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        role="dialog"
        aria-label={`${group.group} navigation`}
        aria-modal="true"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "80dvh",
          background: K.s1,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          zIndex: 1999,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -24px 60px rgba(0,0,0,0.4)",
          border: `1px solid ${K.bd}`,
          borderBottom: "none",
          overflow: "hidden",
        }}
      >
        {/* Drag handle + header */}
        <div style={{ padding: "10px 16px 8px", borderBottom: `1px solid ${K.bd}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ width: 32, height: 3, borderRadius: 99, background: K.bd2, margin: "0 auto 10px", opacity: 0.7 }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, textTransform: "uppercase", letterSpacing: "1.2px" }}>
              {group.group}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${K.bd}`, borderRadius: 8, color: K.mt, fontSize: 12, cursor: "pointer", fontFamily: font, flexShrink: 0 }}
          >
            Done
          </button>
        </div>
        {/* Scrollable sub-item list */}
        <div
          ref={listRef}
          role="list"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", flex: 1, paddingBottom: "env(safe-area-inset-bottom,0px)" }}
        >
          {group.items.map((item, index) => {
            const isCurrentItem = ti === index;
            return (
              <button
                key={item.slug}
                role="listitem"
                aria-current={isCurrentItem ? "page" : undefined}
                onClick={() => { goTo(gi, index); onClose(); }}
                style={{
                  display: "flex",
                  width: "100%",
                  padding: "14px 20px",
                  background: isCurrentItem ? `${K.ac}12` : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${K.bd}`,
                  color: isCurrentItem ? K.ac : K.tx,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: font,
                  fontSize: 14,
                  fontWeight: isCurrentItem ? 700 : 400,
                  alignItems: "center",
                  gap: 12,
                  WebkitTapHighlightColor: "transparent",
                  transition: "background 0.1s",
                }}
              >
                <span style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: isCurrentItem ? K.ac : "transparent",
                  border: isCurrentItem ? "none" : `1px solid ${K.bd2}`,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>{item.n}</span>
                {item.pro && (
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: `${K.yl}20`, color: K.yl, border: `1px solid ${K.yl}40`, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700 }}>
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
