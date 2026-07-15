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

const NAV_ICONS = ["⌂", "⇄", "⊞", "◎", "⚡", "✦"];

export function MobileBottomNav({ gi, goTo, tabs, onDrawerOpen }) {
  return (
    <div className="pg-mobile-nav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg,${K.s1},${K.s2})`, borderTop: `1px solid ${K.bd}`, display: "flex", zIndex: 100, padding: "6px 0 env(safe-area-inset-bottom,0px)", boxShadow: "0 -10px 24px rgba(0,0,0,0.22)" }}>
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {tabs.map((tab, index) => {
        const isActive = gi === index;
        return (
          <button
            key={tab.group}
            onClick={() => isActive ? onDrawerOpen?.() : goTo(index, 0)}
            aria-label={isActive ? `Browse ${tab.group} tools` : tab.group}
            style={{ flex: 1, padding: "7px 4px", background: "none", border: "none", color: isActive ? K.gn : K.mt, cursor: "pointer", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "color 0.15s" }}
          >
            <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1, opacity: isActive ? 1 : 0.7 }}>{NAV_ICONS[index] || "○"}</span>
            <span style={{ fontWeight: isActive ? 700 : 400 }}>{tab.group}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MobileNavDrawer({ tabs, gi, currentTi, goTo, isOpen, onClose }) {
  const g = tabs?.[gi];
  const hasSubcats = g?.items?.some((item) => item.subcat);

  const grouped = React.useMemo(() => {
    if (!g) return [];
    if (!hasSubcats) return [{ label: null, items: g.items.map((item, ti) => ({ item, ti })) }];
    const map = new Map();
    g.items.forEach((item, ti) => {
      const key = item.subcat || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ item, ti });
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [g, hasSubcats]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!g) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: isOpen ? "rgba(0,0,0,0.55)" : "transparent",
          backdropFilter: isOpen ? "blur(3px)" : "none",
          WebkitBackdropFilter: isOpen ? "blur(3px)" : "none",
          zIndex: 310,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "background 0.22s, backdrop-filter 0.22s",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${g.group} — all tools`}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: "100dvh",
          background: K.s1,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${K.bd2}`,
          zIndex: 320,
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.55)",
          willChange: "transform",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 0", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: K.bd2 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 14px", borderBottom: `1px solid ${K.bd}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: K.tx, fontFamily: fontD, letterSpacing: "-0.3px" }}>
              {g.group}
            </div>
            <div style={{ fontSize: 11, color: K.mt, marginTop: 2, textTransform: "uppercase", letterSpacing: "1.2px" }}>
              {g.items.length} tool{g.items.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 8, color: K.dm, cursor: "pointer", fontSize: 13, fontFamily: font, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
          {grouped.map(({ label, items }) => (
            <div key={label || "_all"}>
              {label && (
                <div style={{ padding: "14px 20px 6px", fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1.4px", fontWeight: 700, fontFamily: font }}>
                  {label}
                </div>
              )}
              {items.map(({ item, ti }) => {
                const isCurrentItem = ti === currentTi;
                return (
                  <button
                    key={item.slug}
                    onClick={() => { goTo(gi, ti); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "15px 20px",
                      background: isCurrentItem ? `${K.gn}08` : "transparent",
                      border: "none",
                      borderLeft: isCurrentItem ? `3px solid ${K.gn}` : "3px solid transparent",
                      borderBottom: `1px solid ${K.bd}`,
                      color: isCurrentItem ? K.gn : K.tx,
                      cursor: "pointer", textAlign: "left", fontFamily: font,
                      transition: "background 0.1s, color 0.1s",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: isCurrentItem ? 700 : 500 }}>{item.n}</span>
                    {item.pro && (
                      <span style={{ fontSize: 10, color: K.pp, background: `${K.pp}15`, padding: "2px 8px", borderRadius: 50, fontFamily: font, flexShrink: 0 }}>
                        Pro
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
