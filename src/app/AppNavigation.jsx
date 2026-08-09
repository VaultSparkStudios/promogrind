import React, { useEffect, useRef, useState } from "react";
import { K, S, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";
import { SEARCH_UI } from "./appText.js";

const SHEET_CSS = `
  @keyframes pg-sheet-in {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .pg-nav-sheet { animation: pg-sheet-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
`;

// SVG icons for the 6 navigation groups
function NavIcon({ group, size = 22 }) {
  const sp = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const sv = { width: size, height: size, display: "block" };
  if (group === "Home") return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
  if (group === "Convert") return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  if (group === "Calculate") return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="10" y2="16" />
      <line x1="14" y1="16" x2="16" y2="16" />
    </svg>
  );
  if (group === "Track") return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
  if (group === "Live") return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
  // "Learn"
  return (
    <svg style={sv} viewBox="0 0 24 24" {...sp}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// Short labels for the 6-tab bottom bar
const NAV_SHORT_LABELS = {
  Home: "Home",
  Convert: "Cnvrt",
  Calculate: "Calc",
  Track: "Track",
  Live: "Live",
  Learn: "Learn",
};

// Scrollable 100dvh sub-nav sheet — slides up from bottom, lists all items in the active group
function MobileNavSheet({ open, onClose, groupName, items, currentTi, onSelect }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{SHEET_CSS}</style>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 300, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        }}
      />
      <div
        role="dialog"
        aria-label={`${groupName} navigation`}
        aria-modal="true"
        className="pg-nav-sheet"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          height: "100dvh", overflowY: "auto",
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          borderTop: `2px solid ${K.bd2}`,
          borderRadius: "20px 20px 0 0",
          zIndex: 301,
          boxShadow: "0 -32px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            position: "sticky", top: 0,
            background: `${K.s1}f0`,
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderBottom: `1px solid ${K.bd}`, zIndex: 1,
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: K.bd2, margin: "12px auto 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 14px" }}>
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: K.gn, textTransform: "uppercase", letterSpacing: "2px" }}>
              {groupName}
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${K.s3}80`, border: `1px solid ${K.bd2}`,
                color: K.dm, cursor: "pointer", fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: font,
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ padding: "8px 16px 120px" }}>
          {items.map((item, idx) => {
            const isActive = currentTi === idx;
            return (
              <button
                key={item.slug}
                onClick={() => onSelect(idx)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "14px 18px",
                  background: isActive ? `${K.gn}14` : "transparent",
                  border: "none",
                  borderRadius: 12,
                  borderBottom: `1px solid ${K.bd}`,
                  color: isActive ? K.gn : K.tx,
                  cursor: "pointer", fontFamily: font, textAlign: "left",
                  fontSize: 15, fontWeight: isActive ? 700 : 400,
                  marginBottom: 4,
                }}
              >
                <span>{item.n}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.pro && (
                    <span style={{
                      fontSize: 10, color: K.pp,
                      background: `${K.pp}18`, border: `1px solid ${K.pp}40`,
                      borderRadius: 4, padding: "2px 6px",
                    }}>PRO</span>
                  )}
                  {isActive && <span style={{ fontSize: 16, color: K.gn, fontFamily: font }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
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

// Bottom tab bar with SVG icons; tapping the active group opens the 100dvh sub-nav sheet
export function MobileBottomNav({ gi, ti, goTo, tabs, groupItems }) {
  const [showSheet, setShowSheet] = useState(false);

  const handleTabClick = (index) => {
    if (index === gi) {
      setShowSheet((prev) => !prev);
    } else {
      setShowSheet(false);
      goTo(index, 0);
    }
  };

  return (
    <>
      <MobileNavSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        groupName={tabs[gi]?.group || ""}
        items={groupItems || []}
        currentTi={ti ?? 0}
        onSelect={(newTi) => { goTo(gi, newTi); setShowSheet(false); }}
      />
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg, ${K.s1}, ${K.s2})`,
          borderTop: `1px solid ${K.bd}`,
          display: "flex",
          zIndex: 100,
          padding: `6px 0 env(safe-area-inset-bottom, 0px)`,
          boxShadow: "0 -10px 32px rgba(0,0,0,0.28)",
        }}
      >
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
        {tabs.map((tab, index) => {
          const isActive = gi === index;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabClick(index)}
              aria-label={`${tab.group} navigation`}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex: 1, padding: "8px 4px 6px",
                background: isActive ? `${K.gn}0c` : "none",
                border: "none",
                borderTop: `2px solid ${isActive ? K.gn : "transparent"}`,
                color: isActive ? K.gn : K.mt,
                cursor: "pointer", fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                minHeight: 56, transition: "color 0.15s, background 0.15s",
              }}
            >
              <NavIcon group={tab.group} size={22} />
              <span style={{
                fontSize: 9, textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontWeight: isActive ? 700 : 400,
                lineHeight: 1,
              }}>
                {NAV_SHORT_LABELS[tab.group] || tab.group}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
