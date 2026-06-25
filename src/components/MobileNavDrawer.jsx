import React, { useEffect, useRef } from "react";
import { K, font, fontD } from "../lib/shared.js";

const GROUP_ICONS = {
  Home: "⬡",
  Convert: "⚡",
  Calculate: "∑",
  Track: "◈",
  Live: "◉",
  Learn: "◎",
};

const GROUP_ACCENT = {
  Home: K.gn,
  Convert: K.yl,
  Calculate: K.ac,
  Track: K.pp,
  Live: K.rd,
  Learn: K.dm,
};

export function MobileNavDrawer({ tabs, gi, ti, goTo, onClose }) {
  const panelRef = useRef(null);
  const drawerRef = useRef(null);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Focus trap
  useEffect(() => {
    const el = panelRef.current;
    if (el) el.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const navigate = (groupIndex, itemIndex) => {
    goTo(groupIndex, itemIndex);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Drawer panel — scrollable, 100dvh minus safe bottom */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "calc(100dvh - 56px)",
          background: `linear-gradient(180deg, ${K.s1} 0%, ${K.s2} 100%)`,
          borderTop: `1px solid ${K.bd}`,
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* Handle + header */}
        <div
          style={{
            padding: "12px 20px 8px",
            borderBottom: `1px solid ${K.bd}40`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: K.bd2,
              borderRadius: 2,
              margin: "0 auto 10px",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: fontD,
                fontSize: 13,
                fontWeight: 700,
                color: K.mt,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Navigate
            </span>
            <button
              ref={panelRef}
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${K.bd2}`,
                borderRadius: 6,
                color: K.mt,
                cursor: "pointer",
                fontSize: 14,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable nav content */}
        <div
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            flex: 1,
            padding: "8px 0 env(safe-area-inset-bottom, 16px)",
          }}
        >
          {tabs.map((tab, groupIndex) => {
            const isActiveGroup = gi === groupIndex;
            const accent = GROUP_ACCENT[tab.group] || K.ac;
            const icon = GROUP_ICONS[tab.group] || "◆";
            return (
              <div key={tab.group} style={{ marginBottom: 4 }}>
                {/* Group header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 20px 6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: isActiveGroup ? accent : K.mt,
                      lineHeight: 1,
                      fontFamily: fontD,
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isActiveGroup ? accent : K.mt,
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      fontFamily: font,
                    }}
                  >
                    {tab.group}
                  </span>
                  {isActiveGroup && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: K.bg,
                        background: accent,
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontFamily: font,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>

                {/* Sub-items */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                    padding: "0 12px 8px",
                  }}
                >
                  {tab.items.map((item, itemIndex) => {
                    const isActive = isActiveGroup && ti === itemIndex;
                    return (
                      <button
                        key={item.slug}
                        onClick={() => navigate(groupIndex, itemIndex)}
                        style={{
                          padding: "9px 12px",
                          background: isActive
                            ? `${accent}18`
                            : "transparent",
                          border: `1px solid ${isActive ? accent + "50" : K.bd + "60"}`,
                          borderRadius: 8,
                          color: isActive ? accent : K.dm,
                          cursor: "pointer",
                          fontFamily: font,
                          fontSize: 11,
                          fontWeight: isActive ? 700 : 400,
                          textAlign: "left",
                          lineHeight: 1.3,
                          transition: "background 0.12s, border-color 0.12s",
                          WebkitTapHighlightColor: "transparent",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minHeight: 40,
                        }}
                      >
                        {item.pro && (
                          <span
                            style={{
                              fontSize: 7,
                              fontWeight: 700,
                              color: K.yl,
                              background: `${K.yl}18`,
                              border: `1px solid ${K.yl}40`,
                              borderRadius: 3,
                              padding: "0px 4px",
                              flexShrink: 0,
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                            }}
                          >
                            Pro
                          </span>
                        )}
                        {item.n}
                      </button>
                    );
                  })}
                </div>

                {groupIndex < tabs.length - 1 && (
                  <div
                    style={{
                      height: 1,
                      background: K.bd + "40",
                      margin: "4px 20px",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
