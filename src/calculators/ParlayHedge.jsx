import React, { useMemo } from "react";
import { calcPH, K } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function ParlayHedge() {
  const [mem, setMem] = useCalcMemory("parlay-hedge", {
    payout: "500",
    hedgeOdds: "-150",
    originalStake: "100",
  });
  const { payout, hedgeOdds, originalStake } = mem;
  const setField = (key, value) => setMem(key, value);
  const result = useMemo(
    () => calcPH(parseFloat(payout), hedgeOdds, parseFloat(originalStake)),
    [payout, hedgeOdds, originalStake],
  );

  return (
    <div>
      <div style={S.card}>
        <Tl t="Parlay Hedge" badge="LOCK PROFIT" bc={K.ac} shareable />
        <div style={S.row}>
          <In l="Parlay Payout" v={payout} set={(value) => setField("payout", value)} pre="$" />
          <In l="Hedge Odds" v={hedgeOdds} set={(value) => setField("hedgeOdds", value)} ph="-150" />
          <In l="Original Stake" v={originalStake} set={(value) => setField("originalStake", value)} pre="$" />
        </div>
        {result && (
          <div style={S.res(true)}>
            <span style={S.big(K.gn)}>Guaranteed Profit: +${result.g}</span>
            <RR l="Recommended Hedge Stake" v={`$${result.hs}`} c={K.ac} b />
            <RR l="Profit If Parlay Wins" v={`+$${result.pPW}`} c={K.gn} />
            <RR l="Profit If Hedge Wins" v={`+$${result.pHW}`} c={K.gn} />
            <Nt c={K.ac}>
              Enter the total payout returned by the parlay book, the odds for the hedge side, and your original parlay stake. PromoGrind sizes the hedge so both outcomes stay profitable.
            </Nt>
          </div>
        )}
        {!result && (
          <Nt c={K.mt}>
            Add the parlay payout, the hedge odds, and the original stake to price the hedge.
          </Nt>
        )}
      </div>
      <Help entries={[
        ["Parlay payout", "Use the full return from the sportsbook if the parlay wins, not just the profit portion."],
        ["Hedge odds", "Price the opposite side at the book where you want to lock the outcome. The calculator accepts American or decimal odds."],
        ["Guaranteed profit", "PromoGrind shows the lower of the two outcomes so you know the worst-case locked-in result before you place the hedge."],
      ]} />
    </div>
  );
}
