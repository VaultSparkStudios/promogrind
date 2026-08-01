import React, { useState } from "react";
import { f, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function BetSizingAdvisor() {
  const [mem, setMem] = useCalcMemory("bet-sizer", { bankroll: "1000", numBets: "5", avgEdge: "3", style: "quarter-kelly" });
  const { bankroll, numBets, avgEdge, style } = mem;
  const setBankroll = (x) => setMem("bankroll", x);
  const setNumBets = (x) => setMem("numBets", x);
  const setAvgEdge = (x) => setMem("avgEdge", x);
  const setStyle = (x) => setMem("style", x);
  const [showReceipt, setShowReceipt] = useState(false);
  const br = parseFloat(bankroll) || 0;
  const nb = parseInt(numBets) || 1;
  const edge = parseFloat(avgEdge) / 100;
  const kellyPct = edge > 0 ? Math.min(edge, 0.25) : 0;
  const kellyAmt = br * kellyPct;
  const qkAmt = kellyAmt * 0.25;
  const current = style === "flat" ? br * 0.01 : style === "half-kelly" ? kellyAmt * 0.5 : style === "quarter-kelly" ? qkAmt : kellyAmt;
  const totalRisk = current * nb;
  const riskPct = br > 0 ? f(totalRisk / br * 100, 1) : 0;

  return (
    <div>
      <div style={S.card}>
        <Tl t="Bet Sizing Advisor" badge="BANKROLL" bc={K.ac} shareable />
        <div style={S.row}>
          <In l="Total Bankroll" v={bankroll} set={setBankroll} pre="$" ph="1000" />
          <In l="Concurrent Bets" v={numBets} set={setNumBets} ph="5" />
          <In l="Avg Edge %" v={avgEdge} set={setAvgEdge} ph="3" />
          <div style={S.col}>
            <label htmlFor="bet-sizing-style" style={S.label}>Sizing Style</label>
            <select id="bet-sizing-style" style={S.input} value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="flat">Flat 1%</option>
              <option value="quarter-kelly">Quarter Kelly</option>
              <option value="half-kelly">Half Kelly</option>
              <option value="full-kelly">Full Kelly</option>
            </select>
          </div>
        </div>
        {br > 0 && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(parseFloat(riskPct) < 30)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(K.ac)}>${f(current)}</span>
              <span style={{ fontSize: 12, color: K.dm }}>per bet ({style})</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Flat 1% of bankroll" v={`$${f(br * 0.01)}`} c={K.dm} />
            <RR l="Quarter Kelly (recommended)" v={`$${f(qkAmt)}`} c={K.gn} />
            <RR l="Half Kelly" v={`$${f(kellyAmt * 0.5)}`} c={K.yl} />
            <RR l="Full Kelly" v={`$${f(kellyAmt)}`} c={K.rd} />
            <RR l={`${nb} bets at ${style}`} v={`$${f(totalRisk)} (${riskPct}% of bankroll)`} c={parseFloat(riskPct) > 30 ? K.rd : K.ac} b />
            <Nt c={parseFloat(riskPct) > 30 ? K.rd : K.gn}>
              {parseFloat(riskPct) > 30 ? "You have more than 30% of bankroll at risk simultaneously. High drawdown risk. Reduce bet count or size." :
              "Risk level is healthy. Less than 30% of bankroll across all open bets."}
            </Nt>
            {showReceipt && (
              <CalculatorReceipt
                calcName="Bet Sizing Advisor"
                inputs={[
                  { label: "Bankroll", value: `$${bankroll}` },
                  { label: "Concurrent Bets", value: numBets },
                  { label: "Avg Edge", value: `${avgEdge}%` },
                  { label: "Sizing Style", value: style },
                ]}
                outputs={[
                  { label: "Flat 1%", value: `$${f(br * 0.01)}` },
                  { label: "Quarter Kelly", value: `$${f(qkAmt)}` },
                  { label: "Half Kelly", value: `$${f(kellyAmt * 0.5)}` },
                  { label: "Total Risk", value: `$${f(totalRisk)} (${riskPct}%)` },
                  { label: `Per Bet (${style})`, value: `$${f(current)}`, highlight: true },
                ]}
                disclaimer="Sizing recommendations only. Bankroll management does not model a return."
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Flat betting", "Bet the same dollar amount every time (1-2% of bankroll). Simple, safe, and appropriate when you're not sure of your exact edge. 1% means you can lose 100 straight bets before busting."],
        ["Kelly Criterion", "Bets a percentage proportional to your edge. Maximum long-term growth but high variance. Full Kelly can cause -50% drawdowns even when profitable."],
        ["Quarter Kelly (recommended)", "The industry standard. Gives 75% of Full Kelly growth with dramatically lower variance. Most professional +EV bettors use 20-33% of Kelly."],
        ["Concurrent bets", "Keep total risk under 20-30% of bankroll across all open positions. If you have 10 open bets at 5% each, you're risking 50% of your bankroll simultaneously — one bad day can be devastating."],
      ]} />
    </div>
  );
}
