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

// ── CANON-041: 100dvh scrollable mobile nav sheet ──────────────────────────

const NAV_ICONS = ["⌂", "⇄", "∑", "◈", "●", "◎"];
const NAV_LABELS = ["Home", "Convert", "Calc", "Track", "Live", "Learn"];

// Primary shortcut slots in the bottom bar (indices into TABS)
const PRIMARY_SLOTS = [0, 1, 2, 3]; // Home, Convert, Calc, Track

function MobileNavSheetInner({ tabs, gi, onNavigate, onClose }) {
  const [filter, setFilter] = useState("");
  const filterInputRef = useRef(null);
  const sheetRef = useRef(null);

  // Focus the filter input on open
  useEffect(() => { filterInputRef.current?.focus(); }, []);

  // Trap focus within the sheet
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const focusable = () => el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    const handler = (e) => {
      if (e.key !== "Tab") return;
      const nodes = [...focusable()];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = filter.trim().toLowerCase();

  // Build filtered sections
  const sections = tabs.map((tab, gi_idx) => {
    const items = tab.items.filter((it) =>
      !q || it.n.toLowerCase().includes(q) || tab.group.toLowerCase().includes(q)
    );
    return { ...tab, gi: gi_idx, items };
  }).filter((s) => s.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
          zIndex: 500,
          animation: "pg-fade-in 0.2s ease",
        }}
      />
      {/* Sheet — 100dvh with dvh fallback chain */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          height: "min(100dvh, 100vh)",
          background: `linear-gradient(180deg, ${K.s1} 0%, ${K.s2} 100%)`,
          borderTop: `1px solid ${K.bd2}`,
          borderRadius: "20px 20px 0 0",
          zIndex: 501,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.5)",
          animation: "pg-slide-up 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          overscrollBehavior: "contain",
        }}
      >
        <style>{`
          @keyframes pg-fade-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes pg-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
          .pg-nav-item:active { opacity: 0.7; }
          .pg-nav-group-btn { -webkit-tap-highlight-color: transparent; }
          .pg-nav-filter::placeholder { color: ${K.mt}; }
        `}</style>

        {/* Sheet header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${K.bd}40`,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: K.tx, fontFamily: font, letterSpacing: "-0.3px" }}>
              PromoGrind
            </div>
            <div style={{ fontSize: 10, color: K.mt, letterSpacing: "1px", textTransform: "uppercase", marginTop: 2 }}>
              Navigation
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: `${K.bd}40`, border: "none", borderRadius: "50%",
              width: 36, height: 36, cursor: "pointer", color: K.dm,
              fontSize: 16, fontFamily: font, display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter input */}
        <div style={{ padding: "12px 16px 8px", flexShrink: 0 }}>
          <input
            ref={filterInputRef}
            className="pg-nav-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search navigation…"
            aria-label="Filter navigation items"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 14px",
              background: `${K.s2}`,
              border: `1px solid ${K.bd2}`,
              borderRadius: 10,
              color: K.tx, fontFamily: font, fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        {/* Scrollable nav content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0 calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          {sections.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: K.mt, fontSize: 12 }}>No matches</div>
          )}
          {sections.map((section) => (
            <div key={section.group} style={{ marginBottom: 4 }}>
              {/* Section header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px 6px",
              }}>
                <span aria-hidden="true" style={{ fontSize: 14, color: gi === section.gi ? K.gn : K.mt }}>
                  {NAV_ICONS[section.gi] || "○"}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  color: gi === section.gi ? K.gn : K.mt,
                  fontFamily: font,
                }}>
                  {section.group}
                </span>
                {gi === section.gi && (
                  <span style={{
                    marginLeft: "auto", fontSize: 9, color: K.gn,
                    background: `${K.gn}18`, borderRadius: 4,
                    padding: "2px 6px", letterSpacing: "0.5px", fontWeight: 700,
                  }}>ACTIVE</span>
                )}
              </div>
              {/* Section items */}
              <div style={{ padding: "0 12px" }}>
                {section.items.map((item) => {
                  const isActive = gi === section.gi;
                  return (
                    <button
                      key={item.slug}
                      className="pg-nav-item pg-nav-group-btn"
                      onClick={() => { onNavigate(section.gi, section.items.indexOf(item)); onClose(); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "11px 14px",
                        background: isActive ? `${K.gn}08` : "transparent",
                        border: "none",
                        borderRadius: 10,
                        color: isActive ? K.tx : K.dm,
                        cursor: "pointer", textAlign: "left",
                        fontFamily: font, fontSize: 13,
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ fontWeight: isActive ? 500 : 400 }}>{item.n}</span>
                      {item.pro && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
                          color: K.pp, background: `${K.pp}18`,
                          padding: "2px 6px", borderRadius: 4,
                          textTransform: "uppercase",
                        }}>Pro</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // When navigating to a non-primary slot, close the sheet
  const handleNavigate = (newGi, newTi) => {
    goTo(newGi, newTi);
    setSheetOpen(false);
  };

  // Determine which slots to show in the bottom bar.
  // Always show Home(0), Convert(1), Calc(2), Track(3).
  // 5th slot: show the active tab if it's Live(4) or Learn(5); otherwise show "More".
  const isExtendedActive = gi === 4 || gi === 5;
  const fifthSlot = isExtendedActive ? gi : null;

  const primaryItems = PRIMARY_SLOTS.map((tabIdx) => ({
    gi: tabIdx,
    label: NAV_LABELS[tabIdx],
    icon: NAV_ICONS[tabIdx],
  }));

  return (
    <>
      <div className="pg-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: `linear-gradient(180deg,${K.s1},${K.s2})`,
        borderTop: `1px solid ${K.bd}`,
        display: "flex",
        zIndex: 100,
        padding: `6px 0 env(safe-area-inset-bottom,0px)`,
        boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
      }}>
        <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>

        {/* Primary shortcut tabs */}
        {primaryItems.map(({ gi: tabGi, label, icon }) => (
          <button
            key={tabGi}
            onClick={() => goTo(tabGi, 0)}
            aria-current={gi === tabGi ? "page" : undefined}
            style={{
              flex: 1, padding: "7px 4px",
              background: "none", border: "none",
              color: gi === tabGi ? K.gn : K.mt,
              cursor: "pointer", fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span aria-hidden="true" style={{
              fontSize: 13, lineHeight: 1, fontWeight: 700,
              color: gi === tabGi ? K.gn : K.mt,
            }}>{icon}</span>
            <span style={{ fontWeight: gi === tabGi ? 700 : 400 }}>{label}</span>
          </button>
        ))}

        {/* 5th slot: active extended tab or "More" */}
        {fifthSlot !== null ? (
          <button
            onClick={() => goTo(fifthSlot, 0)}
            aria-current="page"
            style={{
              flex: 1, padding: "7px 4px",
              background: "none", border: "none",
              color: K.gn,
              cursor: "pointer", fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1, fontWeight: 700, color: K.gn }}>
              {NAV_ICONS[fifthSlot]}
            </span>
            <span style={{ fontWeight: 700 }}>{NAV_LABELS[fifthSlot]}</span>
          </button>
        ) : (
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Open full navigation menu"
            aria-expanded={sheetOpen}
            style={{
              flex: 1, padding: "7px 4px",
              background: "none", border: "none",
              color: sheetOpen ? K.ac : K.mt,
              cursor: "pointer", fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.5px",
              fontFamily: font,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}
          >
            <span aria-hidden="true" style={{
              fontSize: 15, lineHeight: 1, fontWeight: 700,
              color: sheetOpen ? K.ac : K.mt,
            }}>≡</span>
            <span style={{ fontWeight: sheetOpen ? 700 : 400 }}>More</span>
          </button>
        )}
      </div>

      {/* Full-screen 100dvh nav sheet — rendered in a portal-like fixed overlay */}
      {sheetOpen && (
        <MobileNavSheetInner
          tabs={tabs}
          gi={gi}
          onNavigate={handleNavigate}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
