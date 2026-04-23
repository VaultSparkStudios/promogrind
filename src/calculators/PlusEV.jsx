import React, { useMemo, useState } from "react";
import { calcEV, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import CalcNextStep from "../components/CalcNextStep.jsx";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function PlusEV() {
  const [mem, setMem] = useCalcMemory("ev", { yo: "+120", fo: "+105", s: "100" });
  const { yo, fo, s } = mem;
  const setYo = (v) => setMem("yo", v);
  const setFo = (v) => setMem("fo", v);
  const setS = (v) => setMem("s", v);
  const r = useMemo(() => calcEV(yo, fo, parseFloat(s)), [yo, fo, s]);
  const [showReceipt, setShowReceipt] = useState(false);
  return (
    <div>
      <div style={S.card}>
        <Tl t="Expected Value Calculator" badge="+EV" bc={K.gn} shareable />
        <div style={S.row}><In l="Sportsbook's Odds" v={yo} set={setYo} ph="+120" /><In l="Fair (No-Vig) Odds" v={fo} set={setFo} ph="+105" /><In l="Bet Size" v={s} set={setS} pre="$" /></div>
        {r && (
          <div style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>{r.ok ? "+" : ""}${r.ev}</span>
              <span style={{ fontSize: 12, color: K.dm }}>expected value per bet</span>
              <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="ROI per bet" v={`${r.roi}%`} c={r.ok ? K.gn : K.rd} b /><RR l="True Win Probability" v={`${r.fp}%`} /><RR l="Your Edge" v={`${r.edge}%`} c={r.ok ? K.gn : K.rd} />
            <Nt c={r.ok ? K.gn : K.rd}>{r.ok ? "This bet is +EV. Over hundreds of bets at this edge, you WILL profit mathematically — individual bets can still lose." : "This bet is -EV. The sportsbook has the edge. Skip it."}</Nt>
            {showReceipt && (
              <CalculatorReceipt
                calcName="Expected Value Calculator"
                inputs={[
                  { label: "Sportsbook Odds", value: yo },
                  { label: "Fair (No-Vig) Odds", value: fo },
                  { label: "Bet Size", value: `$${s}` },
                ]}
                outputs={[
                  { label: "True Win Probability", value: `${r.fp}%` },
                  { label: "Your Edge", value: `${r.edge}%` },
                  { label: "ROI per Bet", value: `${r.roi}%` },
                  { label: "Expected Value", value: `${r.ok ? "+" : ""}$${r.ev}`, highlight: true },
                ]}
                disclaimer="EV is a long-run estimate. Individual results vary. Only bet with a genuine edge."
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
        {r && r.ok && <CalcNextStep calcKey="ev" />}
      </div>
      <Help entries={[
        ["Expected Value (EV)", "The average profit or loss per bet if you made this exact bet thousands of times. +EV means profitable long-term. -EV means the house wins long-term. It's the single most important concept in profitable betting."],
        ["Example", "Fair odds say a team has a 50% chance to win (fair odds: +100). A sportsbook offers +120 on that team. You're getting paid $120 for a $100 bet on something that's actually a coin flip. Over 100 such bets, you'd expect to win 50 of them at +120 = $6,000 in winnings, while losing 50 × $100 = $5,000. Net: +$1,000. That's +EV."],
        ["This is NOT guaranteed per bet", "A +EV bet can absolutely lose TODAY. It's like a casino — the house has an edge, but sometimes the player wins. You're the house now, and your edge plays out over VOLUME. You need 100+ bets for the math to smooth out."],
        ["Where to get Fair Odds", "Use the No-Vig calculator with odds from a sharp book, or use the market consensus (average of 5+ major books with the vig removed)."],
      ]} />
    </div>
  );
}
