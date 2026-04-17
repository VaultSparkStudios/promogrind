import React, { useMemo, useState } from "react";
import { calcArb2, K, font } from "../lib/shared.js";
import { S, In, RR, Nt, Tl, Help, useCalcMemory, shouldShowTrigger, dismissTrigger } from "../ui.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import ShareCard from "../components/ShareCard.jsx";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";

export default function Arb2Way() {
  const [mem, setMem] = useCalcMemory("arb-2way", { o1: "+110", o2: "+105", t: "500" });
  const { o1, o2, t } = mem;
  const setO1 = (v) => setMem("o1", v);
  const setO2 = (v) => setMem("o2", v);
  const setT = (v) => setMem("t", v);
  const r = useMemo(() => calcArb2(o1, o2, parseFloat(t)), [o1, o2, t]);
  const [rCopied, setRCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const arbIsPro = () => { try { return ["vault_sparked", "pro", "trial"].includes(localStorage.getItem("pg_pro_status") || ""); } catch { return false; } };
  const [showArbTrigger, setShowArbTrigger] = useState(() => {
    try {
      const log = JSON.parse(localStorage.getItem("pg_usage_log") || "{}");
      const arbCount = (log["arb-2way"] || 0) + (log["arb-3way"] || 0);
      return arbCount >= 5 && shouldShowTrigger("arb_upsell") && !arbIsPro();
    } catch { return false; }
  });
  const copyResult = () => {
    if (!r || !r.ok) return;
    const text = `📊 2-Way Arbitrage — PromoGrind\nOutcome 1: ${o1} | Outcome 2: ${o2} | Total Stake: $${t}\nStake Side 1: $${r.s1} | Stake Side 2: $${r.s2}\nARB Profit: +$${r.pr} | ROI: ${r.roi}%\n${CANONICAL_APP_URL}`;
    try { navigator.clipboard.writeText(text); } catch {}
    setRCopied(true); setTimeout(() => setRCopied(false), 1500);
  };
  return (
    <div>
      <div style={S.card}>
        <Tl t="2-Way Arbitrage" badge="SUREBET" bc={K.pp} shareable />
        {showArbTrigger && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "linear-gradient(90deg,#1e3a2f,#0f1724)", border: "1px solid #4ade80", borderRadius: 8, marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>⚡ <strong style={{ color: "#4ade80" }}>The Live Scanner</strong> finds these arb opportunities automatically in real time.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a href="#/upgrade" style={{ padding: "5px 12px", background: "#4ade80", color: "#0a0e17", borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Try Free →</a>
              <button onClick={() => dismissTrigger("arb_upsell", setShowArbTrigger)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          </div>
        )}
        <div style={S.row}><In l="Outcome 1 (Book A)" v={o1} set={setO1} /><In l="Outcome 2 (Book B)" v={o2} set={setO2} /><In l="Total Stake" v={t} set={setT} pre="$" /></div>
        {r && (
          <div style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>{r.ok ? `ARB: +$${r.pr}` : "NO ARB"}</span>
              {r.ok && <button onClick={copyResult} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: rCopied ? K.gn : K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📋 {rCopied ? "Copied!" : "Copy"}</button>}
              {r.ok && <button onClick={() => setShowReceipt(true)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>}
            </div>
            {r.ok && <><RR l="Stake Side 1" v={`$${r.s1}`} c={K.ac} b /><RR l="Stake Side 2" v={`$${r.s2}`} c={K.ac} b /><RR l="ROI" v={`${r.roi}%`} c={K.gn} /></>}
            {!r.ok && <Nt c={K.rd}>No arb exists. Both sides need + odds at different books. Typical arb margins are 1-5%. Use OddsJam or BetBurger to scan automatically.</Nt>}
            {r.ok && !showShareCard && <button onClick={() => setShowShareCard(true)} style={{ marginTop: 10, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #c084fc", color: "#c084fc", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>🎉 Share this arb</button>}
            {r.ok && showShareCard && <ShareCard title="2-Way Arbitrage" profit={`+$${r.pr} (${r.roi}% ROI)`} onClose={() => setShowShareCard(false)} />}
            {showReceipt && r.ok && (
              <CalculatorReceipt
                calcName="2-Way Arbitrage"
                inputs={[
                  { label: "Outcome 1 Odds (Book A)", value: o1 },
                  { label: "Outcome 2 Odds (Book B)", value: o2 },
                  { label: "Total Stake", value: `$${t}` },
                ]}
                outputs={[
                  { label: "Stake Side 1", value: `$${r.s1}` },
                  { label: "Stake Side 2", value: `$${r.s2}` },
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
        ["Arbitrage", "Betting both sides of the same event at different sportsbooks where the combined odds guarantee a profit. It works because different books set different odds. When the gap is big enough, you can bet both sides and win no matter what."],
        ["How to spot one", "You need both sides to be + odds (or the implied probabilities to add up to LESS than 100%). Example: Book A has Team 1 at +110, Book B has Team 2 at +105. Each side implies ~48.8% and ~48.8% = 97.6% total. The missing 2.4% is your profit."],
        ["Why it's rare", "Books monitor each other and adjust quickly. Arb opportunities last seconds to minutes. That's why people use scanning tools — humans can't check fast enough."],
      ]} />
    </div>
  );
}
