import React, { useMemo, useState } from "react";
import { calcArb3, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { S, In, RR, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function Arb3Way() {
  const [showReceipt, setShowReceipt] = useState(false);
  const [mem, setMem] = useCalcMemory("arb-3way", { o1: "+180", o2: "+250", o3: "+320", t: "500" });
  const { o1, o2, o3, t } = mem;
  const setO1 = (v) => setMem("o1", v);
  const setO2 = (v) => setMem("o2", v);
  const setO3 = (v) => setMem("o3", v);
  const setT = (v) => setMem("t", v);
  const r = useMemo(() => calcArb3(o1, o2, o3, parseFloat(t)), [o1, o2, o3, t]);
  return (
    <div>
      <div style={S.card}>
        <Tl t="3-Way Arbitrage" badge="SOCCER / HOCKEY" bc={K.pp} shareable />
        <div style={S.row}><In l="Home Win (Book A)" v={o1} set={setO1} /><In l="Draw (Book B)" v={o2} set={setO2} /><In l="Away Win (Book C)" v={o3} set={setO3} /><In l="Total Stake" v={t} set={setT} pre="$" /></div>
        {r && (
          <div style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>{r.ok ? `ARB: +$${r.pr}` : "NO ARB"}</span>
              {r.ok && <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>}
            </div>
            {r.ok && <><RR l="Stake Home" v={`$${r.s1}`} c={K.ac} b /><RR l="Stake Draw" v={`$${r.s2}`} c={K.ac} b /><RR l="Stake Away" v={`$${r.s3}`} c={K.ac} b /><RR l="ROI" v={`${r.roi}%`} c={K.gn} /></>}
            {showReceipt && r.ok && (
              <CalculatorReceipt
                calcName="3-Way Arbitrage"
                inputs={[
                  { label: "Home Win (Book A)", value: o1 },
                  { label: "Draw (Book B)", value: o2 },
                  { label: "Away Win (Book C)", value: o3 },
                  { label: "Total Stake", value: `$${t}` },
                ]}
                outputs={[
                  { label: "Stake Home", value: `$${r.s1}` },
                  { label: "Stake Draw", value: `$${r.s2}` },
                  { label: "Stake Away", value: `$${r.s3}` },
                  { label: "ROI", value: `${r.roi}%` },
                  { label: "ARB Profit", value: `+$${r.pr}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["3-Way Markets", "Soccer and hockey regulation time have three possible outcomes: Home Win, Draw, Away Win. With three outcomes across multiple books, pricing inefficiencies are MORE common than 2-way markets because it's harder for books to price all three perfectly."],
        ["You need 3 sportsbooks", "Each outcome should be at a different book for the best odds. Same-book arbs are essentially impossible due to correlated odds."],
      ]} />
    </div>
  );
}
