import React from "react";
import { K, font } from "../lib/shared.js";
import { MOBILE_NAV_RESPONSIVE_CSS } from "./responsive.js";

// Thin-line SVG icons matched to "high-signal trading desk" tone (SOUL)
const HomeIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3 10L10 3.5 17 10v7a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1v-7z"
      stroke={color}
      strokeWidth={active ? "1.8" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ConvertIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M14 4.5L16.5 7 14 9.5" stroke={color} strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 7h13" stroke={color} strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
    <path d="M6 15.5L3.5 13 6 10.5" stroke={color} strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 13h-13" stroke={color} strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round" />
  </svg>
);

const CalcIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="4" y="2.5" width="12" height="15" rx="2" stroke={color} strokeWidth={active ? "1.8" : "1.5"} />
    <path d="M7 7h6M7 10.5h6M7 14h4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const TrackIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <polyline
      points="3,15 7,10 11,13 17,6"
      stroke={color}
      strokeWidth={active ? "1.8" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="10" r="1.5" fill={color} />
    <circle cx="17" cy="6" r="1.5" fill={color} />
  </svg>
);

const LiveIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="2.5" fill={color} />
    <path
      d="M5.5 5.5a6.36 6.36 0 0 0 0 9M14.5 5.5a6.36 6.36 0 0 1 0 9"
      stroke={color}
      strokeWidth={active ? "1.8" : "1.5"}
      strokeLinecap="round"
    />
  </svg>
);

const LearnIcon = ({ active, color }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4.5 3h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
      stroke={color}
      strokeWidth={active ? "1.8" : "1.5"}
    />
    <path d="M10 3v14" stroke={color} strokeWidth="1" strokeDasharray="1.5 1.5" strokeLinecap="round" />
    <path d="M7 7H5M7 10H5M7 13H5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const NAV_ITEMS = [
  { group: "Home",      label: "Home",    Icon: HomeIcon },
  { group: "Convert",   label: "Convert", Icon: ConvertIcon },
  { group: "Calculate", label: "Calc",    Icon: CalcIcon },
  { group: "Track",     label: "Track",   Icon: TrackIcon },
  { group: "Live",      label: "Live",    Icon: LiveIcon },
  { group: "Learn",     label: "Learn",   Icon: LearnIcon },
];

export function MobileBottomNav({ gi, goTo }) {
  return (
    <nav
      className="pg-mobile-nav"
      aria-label="Primary mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        // Translucent glass background; hex+alpha works for both KD and KL themes
        background: `linear-gradient(180deg, ${K.s1}e8, ${K.s2}f5)`,
        borderTop: `1px solid ${K.bd}`,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28), 0 -1px 0 rgba(255,255,255,0.04)",
        display: "flex",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <style>{MOBILE_NAV_RESPONSIVE_CSS}</style>
      {NAV_ITEMS.map((item, i) => {
        const isActive = gi === i;
        const color = isActive ? K.gn : K.mt;
        return (
          <button
            key={item.group}
            onClick={() => goTo(i, 0)}
            aria-label={item.group}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: "1 0 auto",
              minWidth: 52,
              padding: "10px 4px 6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              WebkitTapHighlightColor: "transparent",
              position: "relative",
            }}
          >
            {/* Active notch at top of button — green pill with glow */}
            {isActive && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: K.gn,
                  boxShadow: `0 2px 8px ${K.gn}60`,
                }}
              />
            )}
            {/* Icon — scales up on active with spring easing */}
            <span
              style={{
                transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
                transform: isActive ? "scale(1.12)" : "scale(1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <item.Icon active={isActive} color={color} />
            </span>
            <span
              style={{
                fontSize: 9,
                fontFamily: font,
                fontWeight: isActive ? 700 : 400,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
