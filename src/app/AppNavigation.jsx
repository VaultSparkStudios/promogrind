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

const NAV_ICONS = ["⌂", "⇄", "≡", "◈", "⚡", "◎"];

const DRAWER_ANIM = `
  @keyframes pgNavDrawerIn {
    from { transform: translateY(100%); opacity: 0.6; }
    to   { transform: translateY(0);    opacity: 1; }
  }
`;

function MobileNavDrawer({ drawerGi, tabs, gi, goTo, onClose }) {
  const group = tabs[drawerGi];
  if (!group) return null;

  return (
    <div
      className="pg-mobile-nav-drawer-overlay"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
    >
      <style>{DRAWER_ANIM}</style>
      <div
        role="dialog"
        aria-label={`${group.group} navigation`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 64,
          left: 0,
          right: 0,
          maxHeight: "calc(100dvh - 64px)",
          minHeight: "30dvh",
          background: `linear-gradient(160deg, ${K.s1}, ${K.s2})`,
          borderTop: `1px solid ${K.bd2}`,
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -24px 56px rgba(0,0,0,0.38)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "pgNavDrawerIn 0.22s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">{NAV_ICONS[drawerGi] || ""}</span>
            <span style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx, letterSpacing: "-0.3px" }}>{group.group}</span>
            <span style={{ fontSize: 10, color: K.mt, background: K.s3, border: `1px solid ${K.bd}`, borderRadius: 50, padding: "2px 7px" }}>{group.items.length}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation drawer"
            style={{ background: "none", border: `1px solid ${K.bd2}`, borderRadius: 8, color: K.mt, fontSize: 14, cursor: "pointer", padding: "4px 10px", fontFamily: font }}
          >
            ✕
          </button>
        </div>
        {/* Scrollable item grid */}
        <div
          className="pg-mobile-nav-drawer-grid"
          style={{ overflowY: "auto", flex: 1, padding: "4px 14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}
        >
          {group.items.map((item, itemIndex) => {
            const isCurrent = gi === drawerGi && itemIndex === tabs[gi]?.items?.findIndex((x) => x.slug === item.slug);
            return (
              <button
                key={item.slug}
                onClick={() => { goTo(drawerGi, itemIndex); onClose(); }}
                aria-current={isCurrent ? "page" : undefined}
                style={{
                  padding: "12px 14px",
                  background: isCurrent ? `${K.gn}10` : K.s3,
                  border: `1px solid ${isCurrent ? K.gn + "50" : K.bd}`,
                  borderRadius: 12,
                  color: isCurrent ? K.gn : K.tx,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: font,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minHeight: 56,
                  transition: "background 0.12s, border-color 0.12s",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 600, lineHeight: 1.3 }}>{item.n}</span>
                {item.pro && (
                  <span style={{ fontSize: 8, color: K.yl, background: `${K.yl}15`, border: `1px solid ${K.yl}40`, borderRadius: 4, padding: "1px 5px", letterSpacing: "0.5px", textTransform: "uppercase", alignSelf: "flex-start" }}>
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MobileNavCSS() {
  return <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>;
}

export function MobileBottomNav({ gi, goTo, tabs }) {
  const [drawerGi, setDrawerGi] = useState(null);

  const handleTabTap = (index) => {
    if (drawerGi === index) {
      setDrawerGi(null);
    } else {
      setDrawerGi(index);
    }
  };

  const closeDrawer = () => setDrawerGi(null);

  return (
    <>
      {drawerGi !== null && (
        <MobileNavDrawer
          drawerGi={drawerGi}
          tabs={tabs}
          gi={gi}
          goTo={goTo}
          onClose={closeDrawer}
        />
      )}
      <div
        className="pg-mobile-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(180deg,${K.s1},${K.s2})`,
          borderTop: `1px solid ${drawerGi !== null ? K.bd2 : K.bd}`,
          display: "flex", zIndex: 100,
          padding: "6px 0 env(safe-area-inset-bottom,0px)",
          boxShadow: "0 -10px 24px rgba(0,0,0,0.22)",
        }}
      >
        {tabs.map((tab, index) => {
          const isGroupActive = gi === index;
          const isDrawerOpen = drawerGi === index;
          return (
            <button
              key={tab.group}
              onClick={() => handleTabTap(index)}
              aria-expanded={isDrawerOpen}
              aria-label={`${tab.group} — ${tab.items.length} tools`}
              style={{
                flex: 1, padding: "7px 4px", background: "none", border: "none",
                color: isGroupActive ? K.gn : isDrawerOpen ? K.ac : K.mt,
                cursor: "pointer", fontSize: 9, textTransform: "uppercase",
                letterSpacing: "0.5px", fontFamily: font,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "color 0.15s",
              }}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: 14, lineHeight: 1, fontWeight: 700, transition: "transform 0.15s", transform: isDrawerOpen ? "scale(1.15)" : "scale(1)" }}
              >
                {NAV_ICONS[index] || tab.group[0]}
              </span>
              <span style={{ fontWeight: isGroupActive || isDrawerOpen ? 700 : 400 }}>{tab.group}</span>
              {isGroupActive && !isDrawerOpen && (
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: K.gn, display: "block" }} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
