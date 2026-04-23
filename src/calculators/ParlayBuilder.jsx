import React, { useState, useMemo } from "react";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import ShareCard from "../components/ShareCard.jsx";
import { calcParlay, toD, f, K, font } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function ParlayBuilder() {
  const [legs, setLegs] = useState([{ odds: "+150" }, { odds: "+200" }, { odds: "+175" }]);
  const [mem, setMem] = useCalcMemory("parlay-builder", { stake: "100" });
  const { stake } = mem;
  const setStake = (v) => setMem("stake", v);
  const legOdds = legs.map((l) => l.odds);
  const r = useMemo(() => calcParlay(legOdds, stake), [legOdds, stake]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const addLeg = () => { if (legs.length < 8) setLegs((l) => [...l, { odds: "+150" }]); };
  const removeLeg = (i) => setLegs((l) => l.filter((_, j) => j !== i));
  const updateLeg = (i, v) => setLegs((l) => l.map((lg, j) => j === i ? { odds: v } : lg));

  return (
    <div>
      <div style={S.card}>
        <Tl t="Parlay Builder" badge="MULTI-LEG" bc={K.yl} shareable />
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Legs ({legs.length}/8) — enter any odds format</label>
            <button onClick={addLeg} disabled={legs.length >= 8} style={{ padding: "3px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>+ Leg</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {legs.map((lg, i) => {
              const d = toD(lg.odds);
              const ip = d > 1 ? f(1 / d * 100, 1) : null;
              const isFav = d > 1 && d < 2;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, color: K.mt }}>Leg {i + 1}</span>
                    <input style={{ ...S.input, width: 90, borderColor: isFav ? `${K.rd}80` : undefined }} value={lg.odds} onChange={(e) => updateLeg(i, e.target.value)} placeholder="+150" />
                    {isFav && <span style={S.tag(K.rd)}>FAV</span>}
                    {legs.length > 2 && <span onClick={() => removeLeg(i)} style={{ cursor: "pointer", color: K.rd, fontSize: 11, padding: "0 2px" }}>✕</span>}
                  </div>
                  {ip && <div style={{ fontSize: 9, color: isFav ? K.rd : K.mt, paddingLeft: 40 }}>{ip}% implied</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={S.row}><In l="Stake" v={stake} set={setStake} pre="$" ph="100" /></div>
        {r && (
          <div style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>${r.profit}</span>
              <span style={{ fontSize: 12, color: K.dm }}>profit if hits</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Combined Odds" v={`${r.combA} (${r.combined}x)`} c={K.pp} b />
            <RR l="Total Payout" v={`$${r.payout}`} c={K.gn} />
            <RR l="True Win Probability" v={`${r.prob}%`} c={K.ac} />
            <RR l="Expected Value" v={`${r.ok ? "+" : ""}$${r.ev}`} c={r.ok ? K.gn : K.rd} b />
            <RR l="Implied Prob Sum (vig)" v={`${r.impSum}%`} c={parseFloat(r.impSum) > 105 ? K.rd : K.yl} />
            {!r.ok && <Nt c={K.rd}>This parlay is -EV. The sportsbook&apos;s vig compounds across each leg — long parlays almost always favor the house.</Nt>}
            {r.ok && <Nt c={K.gn}>This parlay has positive expected value. Verify each leg has a genuine edge using the +EV calculator first.</Nt>}
            {showReceipt && (
              <CalculatorReceipt
                calcName="Parlay Builder"
                inputs={legs.map((lg, i) => ({ label: `Leg ${i + 1}`, value: lg.odds }))}
                outputs={[
                  { label: "Combined Odds", value: r.combA },
                  { label: "True Win Probability", value: `${r.prob}%` },
                  { label: "Total Payout", value: `$${r.payout}` },
                  { label: "Expected Value", value: `${r.ok ? "+" : ""}$${r.ev}` },
                  { label: "Profit if Hits", value: `$${r.profit}`, highlight: true },
                ]}
                disclaimer="Parlay EV assumes independent legs. Verify each leg edge separately."
                onClose={() => setShowReceipt(false)}
              />
            )}
            {r && r.ok && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share this parlay edge
              </button>
            )}
            {showShareCard && r && r.ok && (
              <ShareCard title="Parlay Builder" profit={`$${r.profit} profit if hits (${r.prob}% prob)`} onClose={() => setShowShareCard(false)} />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["How parlay odds compound", "Each leg's odds multiply together. 3 legs at +150 (+150 = 2.5x decimal each) = 2.5 × 2.5 × 2.5 = 15.625x combined. Bet $100, payout $1,562.50. But the house takes vig on EVERY leg — it compounds against you."],
        ["True win probability", "True probability = product of each leg's no-vig probability. This is always lower than the implied probabilities suggest because book prices include vig."],
        ["When parlays are +EV", "Almost never in traditional sportsbooks. The exception: when individual legs have genuine +EV edges. If every leg is +EV, the parlay can be +EV. If any leg is -EV, it drags the whole parlay down."],
        ["Round robin alternative", "Instead of one 4-leg parlay, try a round robin of 2-team parlays from your pool. Wins more often, less volatile. See the Round Robin tab."],
      ]} />
    </div>
  );
}
