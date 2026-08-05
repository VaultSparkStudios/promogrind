import React, { useState, useMemo } from "react";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import ShareCard from "../components/ShareCard.jsx";
import JuiceScore from "../components/JuiceScore.jsx";
import { juiceFromEVPct } from "../lib/juiceScore.js";
import { calcSGP, toD, f, K, font } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function SGPEstimator() {
  const [legs, setLegs] = useState([{ odds: "+200" }, { odds: "+150" }, { odds: "-110" }]);
  const [sgpOdds, setSgpOdds] = useState("+450");
  const [mem, setMem] = useCalcMemory("sgp-estimator", { stake: "50" });
  const { stake } = mem;
  const setStake = (v) => setMem("stake", v);
  const r = useMemo(() => calcSGP(legs.map((l) => l.odds), sgpOdds, stake), [legs, sgpOdds, stake]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const addLeg = () => { if (legs.length < 4) setLegs((l) => [...l, { odds: "+150" }]); };
  const removeLeg = (i) => setLegs((l) => l.filter((_, j) => j !== i));
  const updateLeg = (i, v) => setLegs((l) => l.map((lg, j) => j === i ? { odds: v } : lg));

  return (
    <div>
      <div style={S.card}>
        <Tl t="SGP EV Estimator" badge="SAME-GAME PARLAY" bc={K.pp} shareable />
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div id="sgp-legs-label" style={S.label}>Individual leg odds (assume independent)</div>
            <button onClick={addLeg} disabled={legs.length >= 4} style={{ padding: "3px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>+ Leg</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {legs.map((lg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: K.mt }}>Leg {i + 1}</span>
                <input aria-label={`Same game parlay leg ${i + 1} odds`} aria-describedby="sgp-legs-label" style={{ ...S.input, width: 90 }} value={lg.odds} onChange={(e) => updateLeg(i, e.target.value)} placeholder="+150" />
                {legs.length > 2 && <button type="button" aria-label={`Remove same game parlay leg ${i + 1}`} onClick={() => removeLeg(i)} style={{ cursor: "pointer", color: K.rd, fontSize: 11, padding: "2px 4px", background: "transparent", border: 0 }}>✕</button>}
              </div>
            ))}
          </div>
        </div>
        <div style={S.row}>
          <In l="Book's SGP Odds" v={sgpOdds} set={setSgpOdds} ph="+450" />
          <In l="Stake" v={stake} set={setStake} pre="$" ph="50" />
        </div>
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>{r.ok ? "+" : ""}${r.ev}</span>
              <span style={{ fontSize: 12, color: K.dm }}>expected value</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Independent Parlay Odds (fair)" v={`${r.indOdds} (${r.indD}x)`} c={K.ac} />
            <RR l="Book's SGP Odds" v={`${sgpOdds} (${r.sgpD}x)`} c={K.tx} />
            <RR l="SGP Discount vs Fair" v={`${r.discount}%`} c={parseFloat(r.discount) > 20 ? K.rd : parseFloat(r.discount) > 10 ? K.yl : K.gn} b />
            <RR l="Independent-model Win Probability" v={`${r.prob}%`} c={K.dm} />
            {parseFloat(r.discount) > 25 && <Nt c={K.rd}>This SGP is priced 25%+ below fair value. The book is heavily discounting for leg correlation. Look for better-priced SGPs or use the individual legs separately.</Nt>}
            {parseFloat(r.discount) <= 10 && r.ok && <Nt c={K.gn}>The independent-leg model is positive under these inputs. Verify correlation, limits, and the live price before deciding.</Nt>}
            {r.ok && <JuiceScore score={juiceFromEVPct(Math.min(15, Math.max(0, 10 - parseFloat(r.discount || 10))))} basis="Independent-leg price comparison" assumption="Legs are treated as independent; unmodeled correlation can materially change fair value." />}
            {showReceipt && (
              <CalculatorReceipt
                calcName="SGP EV Estimator"
                inputs={[
                  ...legs.map((lg, i) => ({ label: `Leg ${i + 1}`, value: lg.odds })),
                  { label: "Book's SGP Odds", value: sgpOdds },
                  { label: "Stake", value: `$${stake}` },
                ]}
                outputs={[
                  { label: "Fair Parlay Odds", value: r.indOdds },
                  { label: "SGP Discount vs Fair", value: `${r.discount}%` },
                  { label: "Independent-model Win Probability", value: `${r.prob}%` },
                  { label: "Expected Value", value: `${r.ok ? "+" : ""}$${r.ev}`, highlight: true },
                ]}
                disclaimer="Assumes independent legs. Correlated legs reduce true fair value further."
                onClose={() => setShowReceipt(false)}
              />
            )}
            {r.ok && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share this SGP edge
              </button>
            )}
            {r.ok && showShareCard && (
              <ShareCard title="SGP Estimator" profit={`+$${r.ev} EV`} onClose={() => setShowShareCard(false)} />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Why SGPs are usually overpriced (for the book)", "An SGP combines correlated legs (e.g. QB passing yards + WR receiving yards). Books know they're correlated so they reduce the payout from what a true independent parlay would pay. The average SGP discount vs. fair value is 15-30%."],
        ["Independent parlay assumption", "This calculator assumes your legs are statistically independent for the 'fair' calculation. If legs are positively correlated (QB TDs + WR yards on same game), the true fair odds are actually LOWER than this shows. If negatively correlated, they'd be higher."],
        ["When SGPs are worth it", "Almost never at standard books. The exception: books sometimes offer SGP boosts (e.g. '20% SGP boost') which can overcome the discount. Plug in the boosted odds to see if it creates positive EV."],
      ]} />
    </div>
  );
}
