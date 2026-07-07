import React, { useEffect, useRef, useState } from "react";
import { K, S, font, fontD } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

const TAB_ICONS = {
  Home: "⌂",
  Convert: "⇌",
  Calculate: "≡",
  Track: "◉",
  Live: "⚡",
  Learn: "✦",
};

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

export function MobileNavDrawer({ open, onClose, tabs, gi, ti, goTo }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 490,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Full navigation"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: "100dvh",
          zIndex: 500,
          background: `linear-gradient(180deg,${K.s2},${K.s1})`,
          borderTop: `1px solid ${K.bd2}`,
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 2px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px 12px",
          borderBottom: `1px solid ${K.bd}`,
        }}>
          <div style={{ fontFamily: fontD, fontSize: 14, fontWeight: 700, color: K.gn, letterSpacing: "-0.2px", textTransform: "uppercase" }}>
            All Navigation
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: K.s2, border: `1px solid ${K.bd}`,
              color: K.dm, cursor: "pointer",
              fontFamily: font, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0 env(safe-area-inset-bottom,16px)" }}>
          {tabs.map((tab, groupIndex) => (
            <div key={tab.group}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 20px 6px",
              }}>
                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1, color: gi === groupIndex ? K.gn : K.mt }}>
                  {TAB_ICONS[tab.group] || "•"}
                </span>
                <span style={{
                  fontFamily: fontD, fontSize: 11, fontWeight: 700,
                  color: gi === groupIndex ? K.gn : K.mt,
                  textTransform: "uppercase", letterSpacing: "1.8px",
                }}>
                  {tab.group}
                </span>
              </div>
              {tab.items.map((item, itemIndex) => {
                const isActive = gi === groupIndex && ti === itemIndex;
                return (
                  <button
                    key={item.slug}
                    onClick={() => { goTo(groupIndex, itemIndex); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "11px 20px 11px 48px",
                      background: isActive ? `${K.gn}0d` : "transparent",
                      border: "none",
                      borderLeft: isActive ? `3px solid ${K.gn}` : "3px solid transparent",
                      color: isActive ? K.gn : item.pro ? K.pp : K.tx,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: font, fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      transition: "background 0.1s",
                    }}
                  >
                    <span>{item.n}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {item.pro && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: "1.2px",
                          textTransform: "uppercase", padding: "2px 5px",
                          borderRadius: 4,
                          background: `${K.pp}18`, color: K.pp,
                          border: `1px solid ${K.pp}40`,
                          fontFamily: font,
                        }}>
                          PRO
                        </span>
                      )}
                      {isActive && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: K.gn, flexShrink: 0 }} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{ height: 82 }} />
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, goTo, tabs, onOpenDrawer }) {
  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        const icon = TAB_ICONS[tab.group] || "•";
        return (
          <button
            key={tab.group}
            aria-label={tab.group}
            aria-current={isActive ? "true" : undefined}
            onClick={() => {
              if (isActive && onOpenDrawer) {
                onOpenDrawer();
              } else {
                goTo(index, 0);
              }
            }}
            style={{
              flex: 1, padding: "5px 2px 6px",
              background: "none", border: "none",
              color: isActive ? K.gn : K.mt,
              cursor: "pointer",
              fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              transition: "color 0.15s",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1, fontWeight: isActive ? 700 : 400 }}>
              {icon}
            </span>
            <span style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>
              {tab.group}
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? K.gn : "transparent", transition: "background 0.15s" }} />
          </button>
        );
      })}
    </div>
  );
}
