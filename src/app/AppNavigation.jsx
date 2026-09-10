import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS, MOBILE_DRAWER_CSS } from "./responsive.js";
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

export function MobileBottomNav({ gi, goTo, tabs, onOpenDrawer }) {
  const labels = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => (
        <button key={tab.group} onClick={() => goTo(index, 0)} style={{ flex: 1, minHeight: 44, padding: "7px 2px", background: "none", border: "none", color: gi === index ? K.gn : K.mt, cursor: "pointer", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span aria-hidden="true" style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>{labels[index] || tab.group}</span>
          <span style={{ fontWeight: gi === index ? 700 : 400 }}>{tab.group.slice(0, 4)}</span>
        </button>
      ))}
      <button onClick={onOpenDrawer} aria-label="Open navigation menu" style={{ flex: 1, minHeight: 44, padding: "7px 2px", background: "none", border: "none", color: K.ac, cursor: "pointer", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>≡</span>
        <span style={{ fontWeight: 500 }}>All</span>
      </button>
    </div>
  );
}

// CANON-041: Full-height scrollable mobile nav drawer
// Uses 100dvh, env(safe-area-inset-*), ≥44px targets, body-scroll-lock, reachable close
export function MobileNavDrawer({ isOpen, onClose, tabs, gi, goTo }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      style={{ position: "fixed", inset: 0, zIndex: 490 }}
    >
      <style>{MOBILE_DRAWER_CSS}</style>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }}
      />
      {/* Sheet: 100dvh, scrolls within itself — CANON-041 core contract */}
      <div
        className="pg-nav-drawer-sheet"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          background: K.s1,
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 32px rgba(0,0,0,0.42)",
        }}
      >
        {/* Sticky header — always reachable close */}
        <div style={{
          position: "sticky",
          top: 0,
          background: K.s1,
          borderBottom: `1px solid ${K.bd}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          paddingBottom: 12,
          paddingLeft: 20,
          paddingRight: 16,
          zIndex: 1,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: font }}>All Tools</span>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{
              minWidth: 44,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: `1px solid ${K.bd2}`,
              borderRadius: 22,
              color: K.mt,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: font,
            }}
          >✕</button>
        </div>
        {/* Scrollable content */}
        <div style={{
          flex: 1,
          padding: "8px 16px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        }}>
          {tabs.map((group, gIdx) => (
            <div key={group.group} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10,
                color: K.mt,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontWeight: 700,
                fontFamily: font,
                padding: "8px 8px 4px",
              }}>
                {group.group}
              </div>
              {group.items.map((item, iIdx) => (
                <button
                  key={item.slug}
                  onClick={() => { goTo(gIdx, iIdx); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    minHeight: 44,
                    padding: "10px 12px",
                    background: gi === gIdx ? `${K.ac}12` : "transparent",
                    border: "none",
                    borderRadius: 8,
                    color: gi === gIdx ? K.ac : K.tx,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 14,
                    fontFamily: font,
                    marginBottom: 2,
                  }}
                >
                  <span>{item.n}</span>
                  {item.pro && (
                    <span style={{ fontSize: 9, color: K.gn, border: `1px solid ${K.gn}40`, borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.5px" }}>PRO</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
