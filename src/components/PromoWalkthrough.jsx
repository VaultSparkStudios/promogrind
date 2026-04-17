import React, { useState, useRef } from "react";
import { K, font, fontD } from "../lib/shared.js";
import { useFocusTrap } from "../lib/focus-trap.js";

const WALKTHROUGHS = [
  {
    title: "DraftKings $200 Bonus Bet",
    steps: [
      { n: "Sign Up", body: "Create a new DraftKings account via a promo link. Deposit $5+." },
      { n: "Place Qualifying Bet", body: "Bet $5+ on any market at -500 odds or better. Your $200 bonus bet arrives within 72 hours." },
      { n: "Find Your Line", body: "Use the Bonus Bet Converter. Look for an underdog at +250 to +400. Sweet spot gives 65-72% conversion." },
      { n: "Lock In Profit", body: "Place $200 bonus bet on underdog at Book A. Hedge with calculated cash amount on favorite at FanDuel or BetMGM. Collect ~$130-144 guaranteed." },
    ],
    calcSlug: "bonus-bet",
  },
  {
    title: "FanDuel 25% Profit Boost",
    steps: [
      { n: "Claim the Boost", body: "Open FanDuel app, go to Promos tab. Claim the 25% profit boost token (max $10 boost, typically on a $40 bet)." },
      { n: "Find a Sharp Line", body: "Use No-Vig calculator to find the sharpest market — typically NFL spreads or NBA moneylines. Aim for -110 or better." },
      { n: "Calculate Your Edge", body: "Enter your bet size, odds, 25% boost, and $10 max into the Profit Boost Calculator. Note the effective boosted odds." },
      { n: "Hedge for Guaranteed Profit", body: "Place boosted bet at FanDuel. Hedge the stake+boost payout at another book. Lock in $6-10 regardless of outcome." },
    ],
    calcSlug: "profit-boost",
  },
  {
    title: "BetMGM First Bet Insurance",
    steps: [
      { n: "Sign Up & Deposit", body: "Create BetMGM account. Deposit up to $1,500 — this is your insurance amount. First bet must be $10+." },
      { n: "Place First Bet Strategically", body: "Use the First Bet Hedge Calculator. Place a large first bet on a near-50/50 market (moneyline close to -110/-110)." },
      { n: "If It Wins", body: "Great — you just won real money on your first bet. No bonus needed. Move on to regular promo hunting." },
      { n: "If It Loses — Collect Bonus", body: "BetMGM returns your stake as bonus bets (up to $1,500). Use Bonus Bet Converter to extract 65-72% as cash." },
    ],
    calcSlug: "first-bet",
  },
];

export default function PromoWalkthrough({ navigate, onClose }) {
  const [selectedWT, setSelectedWT] = useState(0);
  const [wtStep, setWtStep] = useState(0);
  const containerRef = useRef(null);
  useFocusTrap(true, containerRef);
  React.useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const wt = WALKTHROUGHS[selectedWT];
  const step = wt.steps[wtStep];
  const isCalcStep = wtStep >= 2;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Promo Walkthroughs" style={{ background: K.s1, border: `1px solid ${K.bd2}`, borderRadius: 12, maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${K.bd}` }}>
          <div style={{ fontFamily: fontD, fontSize: 16, fontWeight: 700, color: K.tx }}>Promo Walkthroughs</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 18, padding: "0 4px" }}>✕</button>
        </div>
        <div style={{ display: "flex", minHeight: 360 }}>
          <div style={{ width: 200, borderRight: `1px solid ${K.bd}`, padding: 12, flexShrink: 0 }}>
            {WALKTHROUGHS.map((w, i) => (
              <button key={i} onClick={() => { setSelectedWT(i); setWtStep(0); }} style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: selectedWT === i ? `${K.ac}15` : "transparent", border: `1px solid ${selectedWT === i ? K.ac : K.bd}`, borderRadius: 6, color: selectedWT === i ? K.ac : K.dm, fontSize: 11, cursor: "pointer", fontFamily: font, marginBottom: 6, lineHeight: 1.4 }}>{w.title}</button>
            ))}
          </div>
          <div style={{ flex: 1, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: K.tx, marginBottom: 4, fontFamily: fontD }}>{wt.title}</div>
            <div style={{ fontSize: 10, color: K.mt, marginBottom: 16 }}>Step {wtStep + 1} of {wt.steps.length}</div>
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {wt.steps.map((_, i) => (
                <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= wtStep ? K.ac : K.bd2, transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: K.ac, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: K.bg, fontSize: 14, flexShrink: 0 }}>{wtStep + 1}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: K.tx, marginBottom: 6, fontFamily: fontD }}>{step.n}</div>
                <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7 }}>{step.body}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {wtStep > 0 && <button onClick={() => setWtStep((s) => s - 1)} style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 6, color: K.dm, fontSize: 11, cursor: "pointer", fontFamily: font }}>← Prev</button>}
              {wtStep < wt.steps.length - 1 && <button onClick={() => setWtStep((s) => s + 1)} style={{ padding: "7px 16px", background: K.ac, border: "none", borderRadius: 6, color: K.bg, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font }}>Next →</button>}
              {isCalcStep && <button onClick={() => { navigate(`/${wt.calcSlug}`); onClose(); }} style={{ padding: "7px 16px", background: `${K.gn}15`, border: `1px solid ${K.gn}30`, borderRadius: 6, color: K.gn, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: font }}>Open Calculator →</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
