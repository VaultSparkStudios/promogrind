import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS, MOBILE_NAV_DRAWER_CSS } from "./responsive.js";
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

const TAB_ICONS = ["⌂", "↔", "⊞", "◎", "⚡", "≡"];
const TAB_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

export function MobileNavDrawer({ open, onClose, tabs, gi, ti, goTo }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) drawerRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const currentGroup = tabs[gi];

  return (
    <div
      className="pg-nav-drawer-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(10,14,23,0.72)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <style>{MOBILE_NAV_DRAWER_CSS}</style>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${currentGroup?.group ?? "Navigation"} menu`}
        tabIndex={-1}
        className="pg-nav-drawer"
        style={{
          background: `linear-gradient(180deg, ${K.s2}, ${K.s1})`,
          borderTop: `1px solid ${K.bd2}`,
          borderRadius: "20px 20px 0 0",
          height: "calc(100dvh - 72px)",
          maxHeight: "calc(100dvh - 72px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.52)",
          outline: "none",
          overscrollBehavior: "contain",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 14px",
          borderBottom: `1px solid ${K.bd}`,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: fontD, fontSize: 17, fontWeight: 800, color: K.gn, letterSpacing: "-0.3px", lineHeight: 1 }}>
              {currentGroup?.group ?? "Navigate"}
            </div>
            <div style={{ fontSize: 10, color: K.mt, letterSpacing: "1.2px", textTransform: "uppercase", marginTop: 4 }}>
              {currentGroup?.items?.length ?? 0} tools — tap to open
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${K.bd2}`,
              background: "transparent", color: K.dm, fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        {/* Group pills */}
        <div style={{
          display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto",
          borderBottom: `1px solid ${K.bd}`, flexShrink: 0, scrollbarWidth: "none",
        }}>
          {tabs.map((tab, index) => (
            <button
              key={tab.group}
              onClick={() => { if (index !== gi) { goTo(index, 0); onClose(); } }}
              style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 10, fontFamily: font,
                fontWeight: index === gi ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap",
                background: index === gi ? `${K.gn}18` : "transparent",
                border: `1px solid ${index === gi ? K.gn : K.bd2}`,
                color: index === gi ? K.gn : K.dm,
                letterSpacing: "0.5px", textTransform: "uppercase",
              }}
            >
              {TAB_LABELS[index] || tab.group}
            </button>
          ))}
        </div>
        {/* Sub-items scrollable list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0", scrollbarWidth: "thin" }}>
          {currentGroup?.items?.map((item, index) => {
            const isActive = index === ti;
            return (
              <button
                key={item.slug}
                onClick={() => { goTo(gi, index); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "13px 20px",
                  background: isActive ? `${K.gn}0c` : "transparent",
                  border: "none", borderLeft: `3px solid ${isActive ? K.gn : "transparent"}`,
                  color: isActive ? K.gn : K.tx, cursor: "pointer", fontFamily: font,
                  textAlign: "left", fontSize: 13, fontWeight: isActive ? 700 : 400,
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                <span>{item.n}</span>
                {isActive && <span aria-hidden="true" style={{ color: K.gn, fontSize: 10 }}>●</span>}
              </button>
            );
          })}
        </div>
        {/* Safe area spacer */}
        <div style={{ flexShrink: 0, height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </div>
  );
}

export function MobileBottomNav({ gi, goTo, tabs, onTabTap }) {
  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        return (
          <button
            key={tab.group}
            onClick={() => onTabTap ? onTabTap(index) : goTo(index, 0)}
            aria-label={`${TAB_LABELS[index] || tab.group}${isActive ? " — tap again to see all tools" : ""}`}
            style={{
              flex: 1, padding: "7px 4px", background: "none", border: "none",
              color: isActive ? K.gn : K.mt, cursor: "pointer",
              fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1, fontWeight: 700, opacity: isActive ? 1 : 0.6 }}>
              {TAB_ICONS[index] || "○"}
            </span>
            <span style={{ fontWeight: isActive ? 700 : 400 }}>
              {TAB_LABELS[index] || tab.group}
            </span>
            {isActive && (
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: "50%", background: K.gn, display: "block" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
