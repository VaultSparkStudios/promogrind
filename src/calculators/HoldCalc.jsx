import React, { useMemo, useState } from "react";
import { calcHold, f, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function HoldCalc() {
  const [mem, setMem] = useCalcMemory("hold-calc", { o1: "-110", o2: "-110" });
  const { o1, o2 } = mem;
  const setO1 = (x) => setMem("o1", x);
  const setO2 = (x) => setMem("o2", x);
  const r = useMemo(() => calcHold(o1, o2), [o1, o2]);
  const [showReceipt, setShowReceipt] = useState(false);
  const grade = r ? (parseFloat(r.hold) < 3 ? "SHARP" : parseFloat(r.hold) < 5 ? "FAIR" : parseFloat(r.hold) < 8 ? "HIGH" : "AVOID") : null;
  const gradeColor = r ? (parseFloat(r.hold) < 3 ? K.gn : parseFloat(r.hold) < 5 ? K.ac : parseFloat(r.hold) < 8 ? K.yl : K.rd) : K.mt;

  return (
    <div>
      <div style={S.card}>
        <Tl t="Book Hold Calculator" badge="VIG DETECTOR" bc={K.dm} shareable />
        <div style={S.row}>
          <In l="Side 1 Odds" v={o1} set={setO1} ph="-110" />
          <In l="Side 2 Odds" v={o2} set={setO2} ph="-110" />
        </div>
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(gradeColor)}>{r.hold}%</span>
              <span style={{ fontSize: 12, color: K.dm }}>book hold</span>
              <span style={S.tag(gradeColor)}>{grade}</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Side 1 Implied Probability" v={`${r.ip1}%`} c={K.dm} />
            <RR l="Side 2 Implied Probability" v={`${r.ip2}%`} c={K.dm} />
            <RR l="Total (should be 100% for fair)" v={`${f(parseFloat(r.ip1) + parseFloat(r.ip2), 1)}%`} c={K.yl} />
            <RR l="Overround (hold)" v={`${r.hold}%`} c={gradeColor} b />
            <Nt c={gradeColor}>
              {parseFloat(r.hold) < 3 ? "Sharp book pricing — minimal vig. Great line to bet." :
               parseFloat(r.hold) < 5 ? "Fair vig. Standard -110/-110 spread pricing." :
               parseFloat(r.hold) < 8 ? "Above-average hold. Consider shopping other books." :
               "High hold. This book is overcharging significantly. Skip unless no other options."}
            </Nt>
            {showReceipt && (
              <CalculatorReceipt
                calcName="Book Hold Calculator"
                inputs={[
                  { label: "Side 1 Odds", value: o1 },
                  { label: "Side 2 Odds", value: o2 },
                ]}
                outputs={[
                  { label: "Side 1 Implied Prob", value: `${r.ip1}%` },
                  { label: "Side 2 Implied Prob", value: `${r.ip2}%` },
                  { label: "Grade", value: grade },
                  { label: "Book Hold", value: `${r.hold}%`, highlight: true },
                ]}
                disclaimer="Lower hold = less vig. Sharp books run <3%. Retail books typically 4.5-5.5%."
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Book Hold", "The total percentage the sportsbook profits from both sides of a bet. At -110/-110, each side has 52.4% implied probability — 104.8% total. The extra 4.8% is the hold. Whatever you bet, the book keeps 4.8 cents per dollar wagered long-term."],
        ["Sharp books (hold < 3%)", "Pinnacle, Circa, and some offshore books run <3% hold. Sharp bettors love these because more of your edge translates to actual profit."],
        ["Retail books (hold 4.5-6%)", "DraftKings, FanDuel, BetMGM typically run 4.5-5.5% hold on main lines. Player props and live betting are often 8-15% hold — much worse."],
        ["Use this to compare books", "Enter the same game at two different books. The one with lower hold is charging you less for the same bet. Over hundreds of bets, this is meaningful."],
      ]} />
    </div>
  );
}
