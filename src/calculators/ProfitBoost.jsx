import React, { useState, useEffect, useMemo } from "react";
import { calcBoost, sensitivityBoost, K, font, fontD, f } from "../lib/shared.js";
import { S, In, RR, Tl, Nt, Help, useCalcMemory } from "../ui.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import SensitivityChip from "../components/SensitivityChip.jsx";
import ResultFeedbackCard from "../components/ResultFeedbackCard.jsx";
import CalculatorTrustBadge from "../components/CalculatorTrustBadge.jsx";
import BookCTA from "../components/BookCTA.jsx";
import ShareCard from "../components/ShareCard.jsx";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";

export default function ProfitBoost() {
  const [mem, setMem] = useCalcMemory("profit-boost", { s: "50", o: "+200", bp: "50", mx: "250", ho: "-220" });
  const { s, o, bp, mx, ho } = mem;
  const setS = (v) => setMem("s", v);
  const setO = (v) => setMem("o", v);
  const setBp = (v) => setMem("bp", v);
  const setMx = (v) => setMem("mx", v);
  const setHo = (v) => setMem("ho", v);
  const r = useMemo(() => calcBoost(parseFloat(s), o, parseFloat(bp), mx, ho), [s, o, bp, mx, ho]);
  const sens = useMemo(() => sensitivityBoost(parseFloat(s), o, parseFloat(bp), mx, ho), [s, o, bp, mx, ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem("pg_hist_profit-boost") || "[]"); } catch { return []; } });
  useEffect(() => {
    if (!r || !parseFloat(r.g)) return;
    const entry = { ts: Date.now(), s, o, bp, mx, ho, profit: r.g, hs: r.hs };
    setHist((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem("pg_hist_profit-boost", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [r?.g, r?.hs]);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has("demo"));
  const [rCopied, setRCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const applyDemo = () => { setS("50"); setO("-110"); setBp("25"); setMx("10"); setHo("-110"); setDemoMode(true); };
  const copyResult = () => {
    if (!r) return;
    const text = `📊 Profit Boost Converter — PromoGrind\nStake: $${s} | Odds: ${o} | Boost: ${bp}% | Max: $${mx} | Hedge Odds: ${ho}\nEffective Boosted Odds: ${r.eo}\nHedge Amount: $${r.hs}\nGuaranteed Profit: $${r.g}\n${CANONICAL_APP_URL}`;
    try { navigator.clipboard.writeText(text); } catch {}
    setRCopied(true); setTimeout(() => setRCopied(false), 1500);
  };
  return (
    <div>
      <div style={S.card}>
        <Tl t="Profit Boost Converter" badge="DAILY RECURRING $$$" bc={K.yl} shareable getParams={() => ({ s, o, bp, mx, ho })} />
        <div style={S.row}><In l="Your Stake (cash)" v={s} set={setS} pre="$" ph="50" /><In l="Original Odds" v={o} set={setO} ph="+200" /><In l="Boost Percentage" v={bp} set={setBp} ph="50" /></div>
        <div style={S.row}><In l="Max Extra Winnings" v={mx} set={setMx} pre="$" ph="250" /><In l="Hedge Odds (other book)" v={ho} set={setHo} ph="-220" /></div>
        <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setS("50"); setO("+200"); setBp("50"); setMx("25"); setHo("-220"); }} style={{ padding: "4px 10px", background: `${K.ac}10`, border: `1px solid ${K.ac}30`, borderRadius: 4, color: K.ac, fontSize: 10, cursor: "pointer", fontFamily: font }}>★ Show Example</button>
          <button onClick={() => demoMode ? setDemoMode(false) : applyDemo()} style={{ padding: "4px 10px", background: demoMode ? `${K.gn}15` : `${K.gn}08`, border: `1px solid ${demoMode ? K.gn : K.gn + "30"}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>▶ Demo</button>
          <span style={{ fontSize: 10, color: K.mt }}>$50 stake, 50% boost capped at $25, hedge at -220</span>
        </div>
        {demoMode && (
          <div style={{ ...S.note(K.ac), marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Step-by-step demo</div>
            <div>Step 1: FanDuel gave you a 25% profit boost (max $10).</div>
            <div>Step 2: Bet $50 on Chiefs -110.</div>
            <div>Step 3: Hedge ${r ? r.hs : "~"} on the other side.</div>
            <div>Step 4: Lock in ~${r ? r.g : "~"} profit.</div>
            <button onClick={() => setDemoMode(false)} style={{ marginTop: 6, background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 10, padding: 0, textDecoration: "underline" }}>✕ Exit Demo</button>
          </div>
        )}
        {hist.length > 0 && <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}><button onClick={() => setShowHist((h) => !h)} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 9, cursor: "pointer", fontFamily: font }}>🕐 History ({hist.length})</button></div>}
        {showHist && hist.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}`, maxHeight: 180, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Last {hist.length} Calculations</div>
            {hist.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: K.dm, padding: "3px 0", borderBottom: i < hist.length - 1 ? `1px solid ${K.bd}` : "none" }}>
                <span>${h.s} @ {h.o} +{h.bp}% boost</span>
                <span style={{ color: K.gn, fontWeight: 600 }}>+${h.profit}</span>
                <span style={{ color: K.mt }}>{new Date(h.ts).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(parseFloat(r.g) > 0)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(parseFloat(r.g) > 0 ? K.gn : K.rd)}>${r.g}</span>
              <span style={{ fontSize: 12, color: K.dm }}>guaranteed profit</span>
              <button onClick={copyResult} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: rCopied ? K.gn : K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📋 {rCopied ? "Copied!" : "Copy"}</button>
              <button onClick={() => setShowReceipt(true)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Effective Boosted Odds" v={`${r.eo} (${r.ed2} decimal)`} c={K.pp} b /><RR l="Boost Value Added" v={`+$${r.bv}`} c={K.yl} /><RR l="Total Boosted Payout (if win)" v={`$${r.tp}`} /><RR l="Hedge Amount (real cash)" v={`$${r.hs}`} c={K.ac} b /><RR l="If Boosted Bet Wins" v={`+$${r.pBW}`} c={K.gn} /><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn} />
            <Nt c={K.yl}>Treat each boost as a new decision. Verify the live odds, cap, eligibility, and hedge before counting any value.</Nt>
            <BookCTA promoType="boost" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <CalculatorTrustBadge calculatorKey="profit-boost" promoType="profit_boost" />
              <SensitivityChip summary={sens} />
            </div>
            {parseFloat(r.g) > 0 && (
              <ResultFeedbackCard calculatorKey="profit-boost" calculatorLabel="Profit Boost Converter" promoType="profit_boost" expectedProfit={r.g} />
            )}
            {parseFloat(r.g) > 0 && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #4ade80", color: "#4ade80", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share your win
              </button>
            )}
            {showShareCard && parseFloat(r.g) > 0 && (
              <ShareCard title="Profit Boost Calculator" profit={`$${r.g}`} onClose={() => setShowShareCard(false)} />
            )}
            {showReceipt && (
              <CalculatorReceipt
                calcName="Profit Boost Converter"
                inputs={[
                  { label: "Stake", value: `$${s}` },
                  { label: "Original Odds", value: o },
                  { label: "Boost %", value: `${bp}%` },
                  { label: "Max Extra Winnings", value: `$${mx}` },
                  { label: "Hedge Odds", value: ho },
                ]}
                outputs={[
                  { label: "Boosted Odds", value: r.eo },
                  { label: "Boost Value Added", value: `+$${r.bv}` },
                  { label: "Hedge Amount", value: `$${r.hs}` },
                  { label: "If Boosted Wins", value: `+$${r.pBW}` },
                  { label: "If Hedge Wins", value: `+$${r.pHW}` },
                  { label: "Guaranteed Profit", value: `$${r.g}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Profit Boost", "A sportsbook promo that adds a percentage to your winnings IF your bet wins. A 50% profit boost on a bet that would win $100 now wins $150 instead. Unlike bonus bets, you're using your OWN money — the boost just sweetens the payout."],
        ["How the math works", "The boost changes your 'effective odds' — the real payout you'd get. We calculate those effective odds, then figure out the exact hedge amount at another book that locks in profit regardless of outcome."],
        ["Max Extra Winnings", "Most boosts have a cap. A '50% boost, max $250 extra' means even if your normal winnings would be $600, the boost only adds up to $250. Always enter this cap — it affects the hedge calculation."],
        ["Why recurring boosts matter", "Welcome promos are one-time, while boosts can recur. Frequency and value vary by account, book, limits, and market conditions, so track realized outcomes instead of projecting a fixed monthly return."],
        ["Step-by-Step", "1) Check your sportsbook apps each morning for profit boosts. 2) Find the boost, note the odds, percentage, and max extra winnings. 3) Find the opposing line at another book. 4) Enter everything here. 5) Place the boosted bet at Book A. 6) Place the hedge at Book B for the calculated amount. 7) Profit either way."],
      ]} />
    </div>
  );
}
