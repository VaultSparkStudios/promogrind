import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

// Inline SVG icons for each nav group — no external deps
function NavIcon({ group, active }) {
  const c = active ? K.gn : K.mt;
  const sw = 1.6;
  if (group === "Home") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 8.8L10 2.5l7.5 6.3V18h-5v-5.5h-5V18h-5V8.8z" stroke={c} strokeWidth={sw} strokeLinejoin="round" fill={active ? `${K.gn}22` : "none"} />
    </svg>
  );
  if (group === "Convert") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 7h12M13 4l3 3-3 3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H4M7 10l-3 3 3 3" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (group === "Calculate") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke={c} strokeWidth={sw} fill={active ? `${K.gn}14` : "none"} />
      <path d="M6.5 6.5h7" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <path d="M6.5 10.5h3M13.5 9.5v3M12 11h3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
  if (group === "Track") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polyline points="2,15 7,9 11,12 18,5" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="5" r="1.8" fill={active ? K.gn : K.mt} />
    </svg>
  );
  if (group === "Live") return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" fill={active ? K.gn : K.mt} />
      <path d="M5 5a7 7 0 0010 10M15 5A7 7 0 005 15" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
  // Learn (fallback)
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 4.5h14v10.5a2 2 0 01-2 2H5a2 2 0 01-2-2V4.5z" stroke={c} strokeWidth={sw} fill={active ? `${K.gn}18` : "none"} />
      <path d="M7 4.5V2.5m6 2V2.5M7 9h6M7 12.5h4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

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

// Scrollable 100dvh nav sheet — lets mobile users reach every sub-item in a group
// Opens when the already-active bottom tab is tapped; closes on backdrop tap, item select, or Escape.
export function MobileBottomNav({ gi, ti, goTo, tabs }) {
  const [sheetGi, setSheetGi] = useState(null);
  const sheetOpen = sheetGi !== null;

  // Close sheet when the active group changes externally (e.g. router-driven navigation)
  useEffect(() => { setSheetGi(null); }, [gi]);

  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e) => { if (e.key === "Escape") setSheetGi(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sheetOpen]);

  function handleTabTap(index) {
    if (sheetOpen) {
      // Sheet is open: close it; if tapping a different group, navigate to it
      setSheetGi(null);
      if (index !== gi) goTo(index, 0);
    } else if (index === gi) {
      // Tap the already-active group → open the 100dvh sheet for it
      setSheetGi(gi);
    } else {
      goTo(index, 0);
    }
  }

  const sheetGroup = sheetGi !== null ? tabs[sheetGi] : null;

  return (
    <>
      {/* ── 100dvh scrollable nav sheet ─────────────────────────────────── */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${sheetGroup?.group} navigation`}
          onClick={(e) => { if (e.target === e.currentTarget) setSheetGi(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 299,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0, right: 0,
              // Sit above the 64px bottom nav bar
              bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
              // Fill remaining viewport height (100dvh minus the bottom nav)
              height: "100dvh",
              maxHeight: "calc(100dvh - 72px)",
              display: "flex", flexDirection: "column",
              background: K.s1,
              borderRadius: "20px 20px 0 0",
              boxShadow: `0 -28px 72px rgba(0,0,0,0.52), 0 0 0 1px ${K.bd}60`,
              overflow: "hidden",
            }}
          >
            {/* Drag handle */}
            <div style={{ flexShrink: 0, padding: "12px 20px 0", textAlign: "center" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: K.bd2, display: "inline-block" }} />
            </div>

            {/* Sheet header */}
            <div style={{
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px 12px",
              borderBottom: `1px solid ${K.bd}40`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <NavIcon group={sheetGroup?.group} active />
                <span style={{ fontSize: 15, fontWeight: 700, color: K.tx, letterSpacing: "-0.2px", fontFamily: font }}>
                  {sheetGroup?.group}
                </span>
                <span style={{ fontSize: 10, color: K.mt, fontFamily: font }}>
                  {sheetGroup?.items?.length} items
                </span>
              </div>
              <button
                onClick={() => setSheetGi(null)}
                aria-label="Close navigation"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: K.s2, border: `1px solid ${K.bd}`,
                  color: K.dm, fontSize: 18, lineHeight: 1,
                  cursor: "pointer", fontFamily: font,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable item list */}
            <div
              style={{
                flex: 1, overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "6px 12px",
              }}
            >
              {sheetGroup?.items?.map((item, itemIndex) => {
                const isCurrent = sheetGi === gi && itemIndex === (ti ?? 0);
                return (
                  <button
                    key={item.slug}
                    onClick={() => { goTo(sheetGi, itemIndex); setSheetGi(null); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "13px 14px",
                      textAlign: "left", cursor: "pointer",
                      background: isCurrent ? `${K.gn}12` : "transparent",
                      border: "none",
                      borderBottom: `1px solid ${K.bd}28`,
                      borderLeft: `3px solid ${isCurrent ? K.gn : "transparent"}`,
                      color: isCurrent ? K.gn : K.tx,
                      fontFamily: font, fontSize: 14,
                      fontWeight: isCurrent ? 600 : 400,
                      borderRadius: 6,
                      marginBottom: 1,
                      minHeight: 44,
                    }}
                  >
                    <span>{item.n}</span>
                    {item.pro && (
                      <span style={{
                        fontSize: 9, color: K.pp,
                        textTransform: "uppercase", letterSpacing: "1.5px",
                        fontWeight: 700, marginLeft: 8,
                        padding: "2px 5px",
                        background: `${K.pp}14`,
                        borderRadius: 3,
                      }}>
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Bottom safe-area padding */}
              <div style={{ height: "max(16px, env(safe-area-inset-bottom, 16px))" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom tab bar ───────────────────────────────────────────────── */}
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg,${K.s1}ee,${K.s2})`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: `1px solid ${K.bd}`,
          display: "flex", zIndex: 300,
          padding: `6px 0 env(safe-area-inset-bottom,0px)`,
          boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          const isSheetActive = sheetGi === index;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabTap(index)}
              aria-pressed={isSheetActive}
              style={{
                flex: 1, padding: "6px 2px 7px",
                background: "none", border: "none",
                color: isActive ? K.gn : K.mt,
                cursor: "pointer",
                fontSize: 8,
                textTransform: "uppercase", letterSpacing: "0.5px",
                fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                position: "relative",
                transition: "color 0.15s",
                WebkitTapHighlightColor: "transparent",
                minHeight: 44,
              }}
            >
              {/* Top active indicator bar */}
              {isActive && (
                <div style={{
                  position: "absolute", top: 0, left: "22%", right: "22%",
                  height: 2, borderRadius: "0 0 2px 2px",
                  background: K.gn,
                }} />
              )}
              <NavIcon group={tab.group} active={isActive} />
              <span style={{ fontWeight: isActive ? 700 : 400, lineHeight: 1 }}>
                {tab.group === "Calculate" ? "Calc" : tab.group}
              </span>
              {/* Sheet-open chevron */}
              {isSheetActive && (
                <div style={{
                  position: "absolute", bottom: 1, left: "50%",
                  transform: "translateX(-50%)",
                  width: 4, height: 4, borderRadius: "50%",
                  background: K.gn, opacity: 0.8,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
