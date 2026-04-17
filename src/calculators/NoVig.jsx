import React, { useMemo } from "react";
import { calcNV, K } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function NoVig() {
  const [mem, setMem] = useCalcMemory("no-vig", { o1: "-110", o2: "-110" });
  const { o1, o2 } = mem;
  const setO1 = (v) => setMem("o1", v);
  const setO2 = (v) => setMem("o2", v);
  const r = useMemo(() => calcNV(o1, o2), [o1, o2]);
  return (
    <div>
      <div style={S.card}>
        <Tl t="No-Vig Fair Odds Calculator" badge="DEVIG" bc={K.pp} shareable />
        <div style={S.row}><In l="Side 1 Odds" v={o1} set={setO1} ph="-110" /><In l="Side 2 Odds" v={o2} set={setO2} ph="-110" /></div>
        {r && (
          <div style={S.res(true)}>
            <RR l="Sportsbook Vig (Juice)" v={`${r.v}%`} c={K.rd} b />
            <div style={{ marginTop: 8, marginBottom: 2, fontSize: 10, color: K.mt }}>SIDE 1</div>
            <RR l="Implied Probability (with vig)" v={`${r.ip1}%`} c={K.dm} /><RR l="True Probability (no vig)" v={`${r.fp1}%`} c={K.gn} /><RR l="Fair Odds" v={r.fo1} c={K.pp} b />
            <div style={{ marginTop: 8, marginBottom: 2, fontSize: 10, color: K.mt }}>SIDE 2</div>
            <RR l="Implied Probability (with vig)" v={`${r.ip2}%`} c={K.dm} /><RR l="True Probability (no vig)" v={`${r.fp2}%`} c={K.gn} /><RR l="Fair Odds" v={r.fo2} c={K.pp} b />
            <Nt c={K.ac}>If any sportsbook offers BETTER than these fair odds on either side, that bet has positive expected value (+EV).</Nt>
          </div>
        )}
      </div>
      <Help entries={[
        ["Vig (Vigorish) / Juice", "The sportsbook's built-in profit margin. It's why both sides of a coin flip aren't +100 — they're typically -110 each. That gap is the vig. Standard vig is about 4.5% (called 'the juice'). The book keeps this regardless of who wins."],
        ["Why -110/-110 doesn't add to 100%", "At -110 odds, each side has an implied probability of 52.4%. That's 104.8% total — the extra 4.8% is the vig. The true probability of each side is 50/50, but the book charges you extra for the privilege of betting."],
        ["No-Vig / Fair Odds", "What the odds WOULD be if the sportsbook took zero profit. These represent the 'true' probability of each outcome based on market consensus. If you can bet at odds BETTER than the fair odds, you have an edge."],
        ["How to use this", "Enter odds from a sharp sportsbook (one known for accurate lines — Pinnacle, Circa, or the average of several major books). The fair odds become your benchmark. Then check other books — if any offer better odds than the fair line, use the +EV calculator."],
      ]} />
    </div>
  );
}
