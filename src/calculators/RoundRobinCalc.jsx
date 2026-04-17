import React, { useState, useMemo } from "react";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { calcRR, K, font } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help } from "../ui.jsx";

export default function RoundRobinCalc() {
  const [picks, setPicks] = useState([{ odds: "+150" }, { odds: "+200" }, { odds: "+175" }]);
  const [size, setSize] = useState("2");
  const [stakeEach, setStakeEach] = useState("50");
  const pickOdds = picks.map((p) => p.odds);
  const r = useMemo(() => calcRR(pickOdds, size, stakeEach), [pickOdds, size, stakeEach]);
  const [showReceipt, setShowReceipt] = useState(false);
  const addPick = () => setPicks((p) => [...p, { odds: "+150" }]);
  const removePick = (i) => setPicks((p) => p.filter((_, j) => j !== i));
  const updatePick = (i, v) => setPicks((p) => p.map((pk, j) => j === i ? { odds: v } : pk));

  return (
    <div>
      <div style={S.card}>
        <Tl t="Round Robin Calculator" badge="PARLAY" bc={K.yl} shareable />
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={S.label}>Your Picks (enter odds for each)</label>
            <button onClick={addPick} style={{ padding: "3px 10px", background: K.s3, border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>+ Pick</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {picks.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: K.mt }}>#{i + 1}</span>
                <input style={{ ...S.input, width: 80 }} value={p.odds} onChange={(e) => updatePick(i, e.target.value)} placeholder="+150" />
                {picks.length > 2 && <span onClick={() => removePick(i)} style={{ cursor: "pointer", color: K.rd, fontSize: 11 }}>✕</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={S.row}>
          <div style={S.col}>
            <label style={S.label}>Combo Size</label>
            <select style={S.input} value={size} onChange={(e) => setSize(e.target.value)}>
              {["2", "3", "4"].filter((n) => parseInt(n) <= picks.length).map((n) => <option key={n}>{n}-team parlays</option>)}
            </select>
          </div>
          <In l="Stake Per Combo" v={stakeEach} set={setStakeEach} pre="$" ph="50" />
        </div>
        {r && (
          <div style={S.res(true)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(K.ac)}>{r.nCombos}</span>
              <span style={{ fontSize: 12, color: K.dm }}>combinations</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Total Stake" v={`$${r.totalStake}`} c={K.rd} b />
            <RR l="Best Case Payout" v={`$${r.maxPayout}`} c={K.gn} />
            <RR l="Worst Single Combo Payout" v={`$${r.minPayout}`} />
            <RR l="Average Payout Per Combo" v={`$${r.avgPayout}`} c={K.ac} />
            <Nt c={K.yl}>A round robin protects against one or two picks losing — you win multiple smaller parlays instead of needing all picks to hit. Total stake: ${r.totalStake} ({r.nCombos} combos × ${stakeEach}).</Nt>
            {showReceipt && (
              <CalculatorReceipt
                calcName="Round Robin Calculator"
                inputs={[
                  { label: "Picks", value: picks.map((p, i) => `#${i + 1}: ${p.odds}`).join(", ") },
                  { label: "Combo Size", value: `${size}-team` },
                  { label: "Stake Per Combo", value: `$${stakeEach}` },
                ]}
                outputs={[
                  { label: "Combinations", value: String(r.nCombos) },
                  { label: "Total Stake", value: `$${r.totalStake}` },
                  { label: "Worst Combo Payout", value: `$${r.minPayout}` },
                  { label: "Avg Payout Per Combo", value: `$${r.avgPayout}` },
                  { label: "Best Case Payout", value: `$${r.maxPayout}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Round Robin", "Instead of one big parlay, a round robin creates every possible smaller parlay from your pool of picks. If you have 4 picks and choose 2-team combos, you get 6 separate 2-team parlays (4 choose 2 = 6)."],
        ["Why use it", "A standard 4-leg parlay requires all 4 to win. A round robin of 2-team parlays from those 4 picks means you profit even if only 2 or 3 of your picks hit."],
        ["Risk vs reward", "You spend more total (6 × $50 = $300 vs $50 for one parlay) but you have multiple chances to profit. It is risk management for high-confidence multi-pick days."],
        ["Best use case", "When you have 3-5 strong +EV opinions on a slate. Rather than going all-or-nothing, round robins monetize partial correctness."],
      ]} />
    </div>
  );
}
