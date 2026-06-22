// 100dvh slide-up navigation overlay for mobile (CANON-041)
// Gives mobile users full desktop-parity tool access in a single scrollable panel.
import React, { useEffect } from "react";
import { K, font, fontD } from "../lib/shared.js";

const GROUP_ICONS = {
  Home:      "🏠",
  Convert:   "⚡",
  Calculate: "📊",
  Track:     "📈",
  Live:      "🔴",
  Learn:     "📚",
};

export function MobileNavDrawer({ tabs, gi, ti, navigate, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (slug) => { navigate("/" + slug); onClose(); };

  return (
    <>
      <div
        data-testid="mobile-nav-backdrop"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 490,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />
      <div
        data-testid="mobile-nav-drawer"
        role="dialog"
        aria-label="All tools navigation"
        aria-modal="true"
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: K.bg,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          height: "100dvh",
          animation: "pgNavIn 0.26s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        <style>{`
          @keyframes pgNavIn {
            from { transform: translateY(55%); opacity: 0.7; }
            to   { transform: translateY(0);   opacity: 1; }
          }
        `}</style>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 44, height: 4, borderRadius: 2, background: K.bd2 }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 20px 14px",
          borderBottom: `1px solid ${K.bd}`,
        }}>
          <div style={{
            fontFamily: fontD, fontSize: 15, fontWeight: 800,
            color: K.gn, letterSpacing: "0.5px",
          }}>
            ALL TOOLS
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              padding: "5px 14px", background: "transparent",
              border: `1px solid ${K.bd2}`, borderRadius: 6,
              color: K.mt, fontSize: 11, cursor: "pointer", fontFamily: font,
            }}
          >
            Done
          </button>
        </div>

        {/* Groups + items */}
        <div style={{ padding: "8px 0 120px" }}>
          {tabs.map((tab, gIdx) => {
            const icon = GROUP_ICONS[tab.group] || "▸";
            const isActiveGroup = gIdx === gi;
            return (
              <div key={tab.group} style={{ marginBottom: 4 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px 5px",
                }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <span style={{
                    fontFamily: font, fontSize: 9, fontWeight: 700,
                    color: isActiveGroup ? K.gn : K.mt,
                    textTransform: "uppercase", letterSpacing: "1.8px",
                  }}>
                    {tab.group}
                  </span>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: 3, padding: "0 12px",
                }}>
                  {tab.items.map((item, iIdx) => {
                    const isActive = isActiveGroup && iIdx === ti;
                    return (
                      <button
                        key={item.slug}
                        data-testid={`nav-item-${item.slug}`}
                        onClick={() => go(item.slug)}
                        style={{
                          padding: "10px 11px",
                          background: isActive ? `${K.gn}15` : "transparent",
                          border: `1px solid ${isActive ? `${K.gn}60` : K.bd}`,
                          borderRadius: 7,
                          color: isActive ? K.gn : K.tx,
                          fontSize: 12, fontWeight: isActive ? 600 : 400,
                          cursor: "pointer", fontFamily: font,
                          textAlign: "left",
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <span style={{ flex: 1 }}>{item.n}</span>
                        {item.pro && (
                          <span style={{
                            fontSize: 7, color: K.pp, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.5px",
                          }}>
                            PRO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
