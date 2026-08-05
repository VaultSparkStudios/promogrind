import React, { useMemo, useState } from "react";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import ShareCard from "../components/ShareCard.jsx";
import JuiceScore from "../components/JuiceScore.jsx";
import { juiceFromEVPct } from "../lib/juiceScore.js";
import { calcTeaser, K, font } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function TeaserCalc() {
  const [mem, setMem] = useCalcMemory("teaser", { legs: "2", tOdds: "-110", wp: "72" });
  const { legs, tOdds, wp } = mem;
  const setLegs = (x) => setMem("legs", x);
  const setTOdds = (x) => setMem("tOdds", x);
  const setWp = (x) => setMem("wp", x);
  const r = useMemo(() => calcTeaser(legs, tOdds, wp), [legs, tOdds, wp]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const presets = [["2-leg 6pt", "-110"], ["2-leg 6.5pt", "-120"], ["2-leg 7pt", "-130"], ["3-leg 6pt", "+165"]];

  return (
    <div>
      <div style={S.card}>
        <Tl t="Teaser Calculator" badge="NFL / NBA" bc={K.ac} shareable />
        <div style={S.row}>
          <div style={S.col}>
            <label htmlFor="teaser-legs" style={S.label}>Legs</label>
            <select id="teaser-legs" style={S.input} value={legs} onChange={(e) => setLegs(e.target.value)}>
              {["2", "3", "4", "5"].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <In l="Teaser Odds" v={tOdds} set={setTOdds} ph="-110" />
          <In l="Win % Per Leg" v={wp} set={setWp} ph="72" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: K.mt, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Quick Presets</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {presets.map(([label, odds]) => (
              <button
                key={label}
                onClick={() => { const parts = label.split(" "); setLegs(parts[0][0]); setTOdds(odds); }}
                style={{ padding: "4px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 10, cursor: "pointer", fontFamily: font }}
              >{label} ({odds})</button>
            ))}
          </div>
        </div>
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>{r.ok ? "+" : ""}{r.ev}%</span>
              <span style={{ fontSize: 12, color: K.dm }}>expected value per $100</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Legs" v={legs} />
            <RR l="Combined Win Probability" v={`${r.combProb}%`} c={K.ac} />
            <RR l="Break-even Win % Per Leg" v={`${r.beProb}%`} c={K.yl} />
            <RR l="Payout (net odds)" v={`${r.payout}x`} />
            {showReceipt && (
              <CalculatorReceipt
                calcName="Teaser Calculator"
                inputs={[
                  { label: "Legs", value: legs },
                  { label: "Teaser Odds", value: tOdds },
                  { label: "Win % Per Leg", value: `${wp}%` },
                ]}
                outputs={[
                  { label: "Combined Win Prob", value: `${r.combProb}%` },
                  { label: "Break-even Win %", value: `${r.beProb}%` },
                  { label: "Payout", value: `${r.payout}x` },
                  { label: "Expected Value", value: `${r.ok ? "+" : ""}${r.ev}%`, highlight: true },
                ]}
                disclaimer="EV estimates assume independent legs at your stated win probability. Key-number teaser analysis only."
                onClose={() => setShowReceipt(false)}
              />
            )}
            {r.ok && <Nt c={K.gn}>The model is positive at your supplied per-leg win rate. Verify that estimate and the live lines; the result is not outcome evidence.</Nt>}
            {!r.ok && <Nt c={K.rd}>At {wp}% per-leg win rate, this teaser is -EV. You need {r.beProb}% per leg to break even. Teasers crossing 3 and 7 in NFL can reach 72-76% per leg — otherwise avoid.</Nt>}
            {r.ok && <JuiceScore score={juiceFromEVPct(parseFloat(r.ev))} basis="User-entered win-rate model" assumption="Leg outcomes are independent and the supplied per-leg win rate is accurate." />}
            {r.ok && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share this teaser edge
              </button>
            )}
            {r.ok && showShareCard && (
              <ShareCard title="Teaser Calculator" profit={`+${r.ev}% EV`} onClose={() => setShowShareCard(false)} />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Teaser", "A parlay where you move the point spread/total in your favor by a set number of points (6, 6.5, or 7 in NFL) in exchange for worse payout odds. The extra points increase your per-leg win probability."],
        ["Key numbers in NFL", "Margins of 3 and 7 are far more common than any other margin (field goal and touchdown). Crossing these numbers dramatically increases win probability. A team -7 becomes -1 in a 6-point teaser — this is the value."],
        ["When teasers are +EV", "The classic strategy: 2-team 6pt teasers that cross both 3 and 7 on spreads (sides ranging from +1.5 to +2.5, or -7.5 to -8.5). Historical win rate for these legs is ~72-76%."],
        ["NBA teasers", "Standard NBA teaser points are 4, 4.5, or 5. Key numbers matter less in basketball. Most NBA teasers are -EV — use with caution."],
      ]} />
    </div>
  );
}
