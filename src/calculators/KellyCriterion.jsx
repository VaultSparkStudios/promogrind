import React, { useMemo, useState } from "react";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { calcKelly, K, font, f } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";

export default function KellyCriterion() {
  const [mem, setMem] = useCalcMemory("kelly", { wp: "55", odds: "+110", br: "1000", frac: "25" });
  const { wp, odds, br, frac } = mem;
  const setWp = (v) => setMem("wp", v);
  const setOdds = (v) => setMem("odds", v);
  const setBr = (v) => setMem("br", v);
  const setFrac = (v) => setMem("frac", v);
  const r = useMemo(() => calcKelly(wp, odds, parseFloat(br), parseFloat(frac) / 100), [wp, odds, br, frac]);
  const [rCopied, setRCopied] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const copyResult = () => {
    if (!r) return;
    const text = `📊 Kelly Criterion — PromoGrind\nWin Probability: ${wp}% | Odds: ${odds} | Bankroll: $${br} | Kelly Fraction: ${frac}%\nRecommended Bet: $${r.bet}\nFull Kelly: ${r.k}% | Fractional Kelly: ${r.ak}%\n${CANONICAL_APP_URL}`;
    try { navigator.clipboard.writeText(text); } catch {}
    setRCopied(true); setTimeout(() => setRCopied(false), 1500);
  };
  return (
    <div>
      <div style={S.card}>
        <Tl t="Kelly Criterion Bet Sizer" badge="+EV SIZING" bc={K.gn} shareable />
        <div style={S.row}><In l="Win Probability %" v={wp} set={setWp} ph="55" /><In l="Odds" v={odds} set={setOdds} ph="+110" /><In l="Bankroll" v={br} set={setBr} pre="$" ph="1000" /><In l="Kelly Fraction %" v={frac} set={setFrac} ph="25" /></div>
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>${r.bet}</span>
              <span style={{ fontSize: 12, color: K.dm }}>recommended bet size</span>
              <button onClick={copyResult} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: rCopied ? K.gn : K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📋 {rCopied ? "Copied!" : "Copy"}</button>
              <button onClick={() => setShowReceipt(true)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Full Kelly %" v={`${r.k}%`} c={K.dm} /><RR l={`${frac}% Fractional Kelly`} v={`${r.ak}%`} c={K.ac} b /><RR l="Bet Size" v={`$${r.bet}`} c={r.ok ? K.gn : K.rd} b /><RR l="Expected Value" v={`${r.ok ? "+" : ""}${r.ev}%`} c={r.ok ? K.gn : K.rd} />
            {showReceipt && r.ok && (
              <CalculatorReceipt
                calcName="Kelly Criterion Bet Sizer"
                inputs={[
                  { label: "Win Probability", value: `${wp}%` },
                  { label: "Odds", value: odds },
                  { label: "Bankroll", value: `$${br}` },
                  { label: "Kelly Fraction", value: `${frac}%` },
                ]}
                outputs={[
                  { label: "Full Kelly %", value: `${r.k}%` },
                  { label: `${frac}% Fractional Kelly`, value: `${r.ak}%` },
                  { label: "Expected Value", value: `${r.ev}%` },
                  { label: "Recommended Bet", value: `$${r.bet}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
            {!r.ok && <Nt c={K.rd}>Kelly says skip this bet — your win probability does not support an edge at these odds.</Nt>}
            {r.ok && <Nt c={K.yl}>Using {frac}% fractional Kelly. Full Kelly maximizes growth but has high variance. Most pros use 20–33% Kelly.</Nt>}
            {r.ok && (() => {
              const fracNum = parseFloat(frac);
              const riskLabel = fracNum < 25 ? "Conservative — lower growth, minimal ruin risk" : fracNum <= 50 ? "Balanced — recommended for most bettors" : fracNum <= 75 ? "Aggressive — higher variance, 10-20% ruin risk" : "Dangerous — high ruin probability";
              const riskColor = fracNum < 25 ? K.gn : fracNum <= 50 ? K.ac : fracNum <= 75 ? K.yl : K.rd;
              const markerPct = Math.min(100, (fracNum - 5) / 95 * 100);
              const fracBet = f(parseFloat(br) * parseFloat(r.k) / 100 * fracNum / 100);
              return (
                <div style={{ marginTop: 12, padding: "12px 14px", background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Fraction Risk Optimizer</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: K.mt, marginBottom: 4 }}><span>5%</span><span>100%</span></div>
                  <div style={{ position: "relative", height: 8, background: `linear-gradient(to right,${K.gn},${K.yl},${K.rd})`, borderRadius: 4, marginBottom: 8 }}>
                    <div style={{ position: "absolute", left: `calc(${markerPct}% - 4px)`, top: -2, width: 12, height: 12, borderRadius: "50%", background: "white", border: `2px solid ${riskColor}` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: K.mt, marginBottom: 8 }}><span style={{ color: K.gn }}>Low Ruin Risk</span><span style={{ color: K.rd }}>High Ruin Risk</span></div>
                  <div style={{ fontSize: 11, color: riskColor, fontWeight: 600, marginBottom: 4 }}>{frac}% Kelly: {riskLabel}</div>
                  <div style={{ fontSize: 11, color: K.dm }}>Bet at this fraction: ${fracBet}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <Help entries={[
        ["Kelly Criterion", "A formula that tells you what percentage of your bankroll to bet given your edge. It maximizes long-term growth. Bet too little: sub-optimal growth. Bet too much: risk of ruin."],
        ["Win Probability", "Your TRUE estimate of the bet winning — not the book's implied probability. Get this from the No-Vig calculator or sharp book consensus."],
        ["Fractional Kelly", "Most professionals use 25–33% Kelly. Full Kelly has high variance — you can have long drawdowns even when profitable. Quarter-Kelly gives 75% of the growth with far less risk."],
        ["Edge required", "If your win probability is below the book's implied probability, Kelly returns 0. Only bet when you have a genuine edge."],
        ["Bankroll", "Your total allocated betting bankroll — not your life savings. Kelly only works correctly when staked against a consistent bankroll figure."],
      ]} />
    </div>
  );
}
