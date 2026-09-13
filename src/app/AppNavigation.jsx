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

export function MobileBottomNav({ gi, goTo, tabs, onOpenDrawer }) {
  const icons = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];
  const labels = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => (
        <button key={tab.group} onClick={() => goTo(index, 0)} style={{ flex: 1, padding: "7px 4px", background: "none", border: "none", color: gi === index ? K.gn : K.mt, cursor: "pointer", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span aria-hidden="true" style={{ fontSize: 10, lineHeight: 1, fontWeight: 700 }}>{icons[index] || tab.group}</span>
          <span style={{ fontWeight: gi === index ? 700 : 400 }}>{labels[index] || tab.group}</span>
        </button>
      ))}
      {onOpenDrawer && (
        <button
          onClick={onOpenDrawer}
          aria-label="Open full navigation menu"
          style={{ flex: 1, padding: "7px 4px", background: "none", border: "none", color: K.mt, cursor: "pointer", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, WebkitTapHighlightColor: "transparent" }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1, fontWeight: 700 }}>≡</span>
          <span>All</span>
        </button>
      )}
    </div>
  );
}

const GROUP_ICONS = ["⌂", "⇄", "∑", "↗", "◎", "❖"];

export function MobileNavDrawer({ open, onClose, tabs, gi, ti, goTo }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 600,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "relative", zIndex: 1,
          height: "100dvh",
          background: `linear-gradient(160deg, ${K.s1} 0%, ${K.s2} 100%)`,
          display: "flex", flexDirection: "column",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.56)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: `1px solid ${K.bd}`,
          position: "sticky", top: 0,
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          zIndex: 2,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: K.gn, fontFamily: fontD, letterSpacing: "-0.3px", lineHeight: 1 }}>
              PROMOGRIND
            </div>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: 3 }}>
              All tools & surfaces
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 38, height: 38,
              background: "transparent",
              border: `1px solid ${K.bd2}`,
              borderRadius: 8,
              color: K.dm,
              fontSize: 18,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font,
              WebkitTapHighlightColor: "transparent",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
          {tabs.map((group, gIdx) => (
            <div key={group.group}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 20px 6px",
                background: `${K.s2}60`,
                borderBottom: `1px solid ${K.bd}30`,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: gi === gIdx ? K.gn : K.mt, textTransform: "uppercase", letterSpacing: "2px", fontFamily: font }}>
                  {GROUP_ICONS[gIdx] || "·"} {group.group}
                </span>
                {gi === gIdx && (
                  <span style={{ fontSize: 8, color: K.gn, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginLeft: "auto", background: `${K.gn}15`, borderRadius: 4, padding: "2px 6px" }}>
                    Here
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {group.items.map((navItem, iIdx) => {
                  const isActive = gi === gIdx && ti === iIdx;
                  return (
                    <button
                      key={navItem.slug || navItem.n}
                      onClick={() => { goTo(gIdx, iIdx); onClose(); }}
                      style={{
                        padding: "11px 20px 11px 36px",
                        textAlign: "left",
                        background: isActive ? `${K.ac}12` : "transparent",
                        border: "none",
                        borderLeft: isActive ? `2px solid ${K.ac}` : "2px solid transparent",
                        color: isActive ? K.ac : K.tx,
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: font,
                        width: "100%",
                        lineHeight: 1.4,
                        WebkitTapHighlightColor: "transparent",
                        transition: "background 0.1s",
                      }}
                    >
                      {navItem.n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
