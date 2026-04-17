import React, { useMemo } from "react";
import { calcNV3, K } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory } from "../ui.jsx";

export default function NoVig3Way() {
  const [mem, setMem] = useCalcMemory("no-vig-3way", { o1: "+220", o2: "+250", o3: "+300" });
  const { o1, o2, o3 } = mem;
  const setO1 = (v) => setMem("o1", v);
  const setO2 = (v) => setMem("o2", v);
  const setO3 = (v) => setMem("o3", v);
  const r = useMemo(() => calcNV3(o1, o2, o3), [o1, o2, o3]);
  return (
    <div>
      <div style={S.card}>
        <Tl t="3-Way No-Vig Calculator" badge="SOCCER / HOCKEY" bc={K.pp} shareable />
        <div style={S.row}><In l="Home Win Odds" v={o1} set={setO1} ph="+220" /><In l="Draw Odds" v={o2} set={setO2} ph="+250" /><In l="Away Win Odds" v={o3} set={setO3} ph="+300" /></div>
        {r && (
          <div style={S.res(true)}>
            <RR l="Total Vig (Juice)" v={`${r.v}%`} c={K.rd} b />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              {[["Home Win", r.ip1, r.fp1, r.fo1], [" Draw", r.ip2, r.fp2, r.fo2], ["Away Win", r.ip3, r.fp3, r.fo3]].map(([label, ip, fp, fo]) => (
                <div key={label} style={{ padding: "10px", background: K.s3, borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: K.pp, marginBottom: 4 }}>{fo}</div>
                  <div style={{ fontSize: 10, color: K.gn }}>True: {fp}%</div>
                  <div style={{ fontSize: 10, color: K.mt }}>Book: {ip}%</div>
                </div>
              ))}
            </div>
            <Nt c={K.ac}>These are the fair odds with zero vig. If any book offers BETTER than these fair odds on any outcome, that bet is +EV.</Nt>
          </div>
        )}
      </div>
      <Help entries={[
        ["3-Way Markets", "Soccer and hockey regulation time have 3 outcomes: Home Win, Draw, Away Win. Standard No-Vig only handles 2-way markets — this version correctly removes vig from all three simultaneously."],
        ["How to use", "Enter the lines from a sharp sportsbook (Pinnacle, Circa, or average of 5+ major books). The fair odds become your benchmark. Check other books for better prices."],
        ["Draw pricing", "The draw is typically the hardest outcome to price accurately, creating the most +EV opportunities in 3-way markets. Sharp bettors pay particular attention to draw pricing."],
      ]} />
    </div>
  );
}
