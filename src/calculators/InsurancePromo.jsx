import React, { useMemo, useState } from "react";
import { calcInsurance, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import ShareCard from "../components/ShareCard.jsx";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function InsurancePromo() {
  const [mem, setMem] = useCalcMemory("insurance", { stake: "100", insPct: "100", insMax: "100", conv: "70" });
  const { stake, insPct, insMax, conv } = mem;
  const setStake = (x) => setMem("stake", x);
  const setInsPct = (x) => setMem("insPct", x);
  const setInsMax = (x) => setMem("insMax", x);
  const setConv = (x) => setMem("conv", x);
  const r = useMemo(() => calcInsurance(stake, insPct, insMax, conv), [stake, insPct, insMax, conv]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  return (
    <div>
      <div style={S.card}>
        <Tl t="Promo Insurance Calculator" badge="SGP / PARLAY" bc={K.pp} shareable />
        <div style={S.row}><In l="Your Stake" v={stake} set={setStake} pre="$" ph="100" /><In l="Insurance % of Stake" v={insPct} set={setInsPct} ph="100" /><In l="Max Insurance $" v={insMax} set={setInsMax} pre="$" ph="100" /><In l="Bonus Conversion %" v={conv} set={setConv} ph="70" /></div>
        {r && (
          <div style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(K.gn)}>${r.insVal}</span>
              <span style={{ fontSize: 12, color: K.dm }}>insurance value (real cash)</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Insurance Bonus Amount" v={`$${r.insAmt}`} c={K.pp} b /><RR l="Bonus Value After Conversion" v={`$${r.insVal}`} c={K.gn} b /><RR l="Net Cost if Bet Loses" v={`$${r.netCost}`} c={parseFloat(r.netCost) <= 5 ? K.gn : K.yl} /><RR l="Insurance Effectiveness" v={`${r.effPct}%`} c={parseFloat(r.effPct) >= 60 ? K.gn : K.yl} />
            <Nt c={K.ac}>If your insured bet loses: you get ${r.insAmt} back as a bonus bet. Convert that using the Bonus Bet tab (~{conv}%) = ${r.insVal} real cash. Your net loss is only ${r.netCost}.</Nt>
            {r.ok && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #c084fc", color: "#c084fc", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share insurance value
              </button>
            )}
            {r.ok && showShareCard && (
              <ShareCard title="Promo Insurance" profit={`$${r.insVal} insurance value`} onClose={() => setShowShareCard(false)} />
            )}
            {showReceipt && (
              <CalculatorReceipt
                calcName="Promo Insurance Calculator"
                inputs={[
                  { label: "Stake", value: `$${stake}` },
                  { label: "Insurance %", value: `${insPct}%` },
                  { label: "Max Insurance", value: `$${insMax}` },
                  { label: "Bonus Conversion %", value: `${conv}%` },
                ]}
                outputs={[
                  { label: "Insurance Bonus Amount", value: `$${r.insAmt}` },
                  { label: "Insurance Effectiveness", value: `${r.effPct}%` },
                  { label: "Net Cost if Bet Loses", value: `$${r.netCost}` },
                  { label: "Insurance Value (Cash)", value: `$${r.insVal}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Insurance Promo", "A sportsbook refunds part or all of your stake (as bonus bets) if your bet loses. Common forms: SGP Insurance (refund if 1 leg misses), Parlay Insurance, and Step-Up Parlays (tiered payouts by legs hit)."],
        ["Why it changes the math", "Without insurance, a $100 loss costs $100. With 100% SGP insurance, you lose $100 but get $100 in bonus bets back — worth ~$70 after conversion. Net loss is only ~$30."],
        ["Insurance %", "Some promos give 100% back, others give 50% or 25%. A '50% SGP insurance up to $50' on a $100 bet returns $50 as bonus if it loses."],
        ["Conversion Rate", "Bonus bets are worth ~70% as real cash when converted using the Bonus Bet Calculator. Adjust if your lines are particularly good or bad."],
        ["vs. hedging", "If you CAN hedge the bet, use the First Bet Hedge calculator for guaranteed profit. Insurance calcs are for bets you cannot hedge (SGPs, same-book parlays)."],
      ]} />
    </div>
  );
}
