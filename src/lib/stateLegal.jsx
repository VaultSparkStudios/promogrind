import React, { useState } from "react";
import { K, S } from "./shared.js";

export const US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export const RECENTLY_LEGALIZED = [
  { state: "Missouri", abbr: "MO", date: "2025-12-01", note: "Legal sports wagering launched December 1, 2025" },
  { state: "North Carolina", abbr: "NC", date: "2024-03-11", note: "Mobile betting went live March 11, 2024" },
  { state: "Vermont", abbr: "VT", date: "2024-01-11", note: "Mobile betting live January 11, 2024" },
  { state: "Kentucky", abbr: "KY", date: "2023-09-28", note: "Mobile betting live September 2023" },
  { state: "Maine", abbr: "ME", date: "2023-11-03", note: "Mobile betting live November 2023" },
];

export const COMING_SOON_STATES = ["GA", "TX", "FL", "AL", "OK"];

export function resolveStateLegalAlert(userState) {
  if (!userState) return null;
  const normalized = String(userState).trim();
  const recent = RECENTLY_LEGALIZED.find((state) => state.abbr === normalized || state.state === normalized);
  if (recent) return { kind: "recent", state: recent };
  if (COMING_SOON_STATES.includes(normalized)) return { kind: "coming-soon", abbr: normalized };
  return null;
}

export function StateLegalAlert({ userState }) {
  const [dismissed, setDismissed] = useState(() => { try { return !!localStorage.getItem("pg_state_alert_dismissed"); } catch { return false; } });
  if (dismissed || !userState) return null;

  const alert = resolveStateLegalAlert(userState);
  if (!alert) return null;

  const dismiss = () => {
    try { localStorage.setItem("pg_state_alert_dismissed", "1"); } catch {}
    setDismissed(true);
  };

  const recent = alert.kind === "recent" ? alert.state : null;
  const comingSoon = alert.kind === "coming-soon";

  return (
    <div style={{ ...S.card, background: recent ? `${K.gn}08` : `${K.yl}08`, border: `1px solid ${recent ? K.gn : K.yl}30`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          {recent && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: K.gn, marginBottom: 4 }}>Your state [{userState}] recently launched sports betting.</div>
              <div style={{ fontSize: 12, color: K.dm, marginBottom: 4 }}>{recent.note}</div>
              <div style={{ fontSize: 11, color: K.dm }}>DraftKings, FanDuel, BetMGM, and Caesars are all available. Check the Sportsbooks tab to start tracking.</div>
            </>
          )}
          {comingSoon && !recent && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: K.yl, marginBottom: 4 }}>Sports betting is not yet available in your state ({userState})</div>
              <div style={{ fontSize: 11, color: K.dm }}>We'll keep the tools ready for when it launches. Set your state in the Sportsbooks tab to get updates.</div>
            </>
          )}
        </div>
        <button onClick={dismiss} style={{ background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 14, padding: "0 4px", flexShrink: 0 }}>x</button>
      </div>
    </div>
  );
}
