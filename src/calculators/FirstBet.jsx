import React, { useState, useEffect, useMemo } from "react";
import { calcFirst, sensitivityFirst, K, font, fontD, f } from "../lib/shared.js";
import { S, In, RR, Tl, Nt, Help, useCalcMemory } from "../ui.jsx";
import { CANONICAL_APP_URL } from "../launchState.js";
import SensitivityChip from "../components/SensitivityChip.jsx";
import ResultFeedbackCard from "../components/ResultFeedbackCard.jsx";
import CalculatorTrustBadge from "../components/CalculatorTrustBadge.jsx";
import BookCTA from "../components/BookCTA.jsx";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import ShareCard from "../components/ShareCard.jsx";

export default function FirstBet() {
  const [mem, setMem] = useCalcMemory("first-bet", { s: "500", o: "+150", ho: "-170" });
  const { s, o, ho } = mem;
  const setS = (v) => setMem("s", v);
  const setO = (v) => setMem("o", v);
  const setHo = (v) => setMem("ho", v);
  const r = useMemo(() => calcFirst(parseFloat(s), o, ho), [s, o, ho]);
  const refundValue = useMemo(() => f(parseFloat(s) * 0.7, 0), [s]);
  const totalIfRefund = useMemo(() => r ? f(parseFloat(r.pHW) + parseFloat(refundValue)) : "0.00", [r, refundValue]);
  const sens = useMemo(() => sensitivityFirst(parseFloat(s), o, ho), [s, o, ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem("pg_hist_first-bet") || "[]"); } catch { return []; } });
  useEffect(() => {
    if (!r || !parseFloat(r.hs)) return;
    const entry = { ts: Date.now(), s, o, ho, hs: r.hs, pOW: r.pOW, pHW: r.pHW };
    setHist((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem("pg_hist_first-bet", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [r?.hs, r?.pOW]);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has("demo"));
  const [rCopied, setRCopied] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const applyDemo = () => { setS("200"); setO("-110"); setHo("-110"); setDemoMode(true); };
  const copyResult = () => {
    if (!r) return;
    const text = `📊 First Bet Safety Net — PromoGrind\nFirst Bet Stake: $${s} | Your Odds: ${o} | Hedge Odds: ${ho}\nHedge Amount: $${r.hs}\nIf Original Wins: $${r.pOW} | If Hedge Wins: $${r.pHW}\n${CANONICAL_APP_URL}`;
    try { navigator.clipboard.writeText(text); } catch {}
    setRCopied(true); setTimeout(() => setRCopied(false), 1500);
  };
  return (
    <div>
      <div style={S.card}>
        <Tl t="First Bet Safety Net Hedge" badge="CASH BET" bc={K.ac} shareable getParams={() => ({ s, o, ho })} />
        <div style={S.row}><In l="First Bet Stake" v={s} set={setS} pre="$" /><In l="Your Odds" v={o} set={setO} /><In l="Hedge Odds" v={ho} set={setHo} /></div>
        <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setS("1000"); setO("+120"); setHo("-140"); }} style={{ padding: "4px 10px", background: `${K.ac}10`, border: `1px solid ${K.ac}30`, borderRadius: 4, color: K.ac, fontSize: 10, cursor: "pointer", fontFamily: font }}>★ Show Example</button>
          <button onClick={() => demoMode ? setDemoMode(false) : applyDemo()} style={{ padding: "4px 10px", background: demoMode ? `${K.gn}15` : `${K.gn}08`, border: `1px solid ${demoMode ? K.gn : K.gn + "30"}`, borderRadius: 4, color: K.gn, fontSize: 10, cursor: "pointer", fontFamily: font }}>▶ Demo</button>
          <span style={{ fontSize: 10, color: K.mt }}>$1,000 BetMGM safety net at +120, hedge at -140</span>
        </div>
        {demoMode && (
          <div style={{ ...S.note(K.ac), marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Step-by-step demo</div>
            <div>Step 1: BetMGM offers $200 first bet insurance.</div>
            <div>Step 2: Bet $200 on a near-even moneyline.</div>
            <div>Step 3: If it loses, you get $200 in bonus bets.</div>
            <div>Step 4: Convert those for ~${f(parseFloat(s) * 0.7, 0)} modeled.</div>
            <button onClick={() => setDemoMode(false)} style={{ marginTop: 6, background: "transparent", border: "none", color: K.mt, cursor: "pointer", fontSize: 10, padding: 0, textDecoration: "underline" }}>✕ Exit Demo</button>
          </div>
        )}
        {hist.length > 0 && <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}><button onClick={() => setShowHist((h) => !h)} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 9, cursor: "pointer", fontFamily: font }}>🕐 History ({hist.length})</button></div>}
        {showHist && hist.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}`, maxHeight: 180, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Last {hist.length} Calculations</div>
            {hist.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: K.dm, padding: "3px 0", borderBottom: i < hist.length - 1 ? `1px solid ${K.bd}` : "none" }}>
                <span>${h.s} @ {h.o}</span>
                <span style={{ color: K.ac, fontWeight: 600 }}>hedge ${h.hs}</span>
                <span style={{ color: K.mt }}>{new Date(h.ts).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(true)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(K.ac)}>${r.g}</span>
              <span style={{ fontSize: 12, color: K.dm }}>hedge-only worst case</span>
              <button onClick={copyResult} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: rCopied ? K.gn : K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📋 {rCopied ? "Copied!" : "Copy"}</button>
              <button onClick={() => setShowReceipt(true)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
            </div>
            <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b /><RR l="If Original Wins" v={`$${r.pOW}`} c={parseFloat(r.pOW) >= 0 ? K.gn : K.rd} /><RR l="If Hedge Wins" v={`$${r.pHW}`} c={parseFloat(r.pHW) >= 0 ? K.gn : K.rd} />
            <RR l="If Original Loses + Refund Converts" v={`$${totalIfRefund}`} c={parseFloat(totalIfRefund) >= 0 ? K.gn : K.yl} />
            <Nt c={K.yl}>If your first bet loses, the sportsbook refund is usually bonus-credit value, not cash. At a rough 70% conversion, the refund adds about ${refundValue} after you run the Bonus Bet tab.</Nt>
            <BookCTA promoType="safety" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <CalculatorTrustBadge calculatorKey="first-bet" promoType="safety_net" />
              <SensitivityChip summary={sens} />
            </div>
            <ResultFeedbackCard calculatorKey="first-bet" calculatorLabel="First Bet Safety Net Hedge" promoType="safety_net" expectedProfit={totalIfRefund} />
            {parseFloat(r.g) > 0 && !showShareCard && (
              <button onClick={() => setShowShareCard(true)} style={{ marginTop: 8, width: "100%", padding: "7px 0", background: "transparent", border: "1px dashed #60a5fa", color: "#60a5fa", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                🎉 Share your hedge
              </button>
            )}
            {showShareCard && parseFloat(r.g) > 0 && (
              <ShareCard title="First Bet Safety Net Hedge" profit={`$${totalIfRefund} projected with refund`} onClose={() => setShowShareCard(false)} />
            )}
            {showReceipt && (
              <CalculatorReceipt
                calcName="First Bet Safety Net Hedge"
                inputs={[
                  { label: "First Bet Stake", value: `$${s}` },
                  { label: "Your Odds", value: o },
                  { label: "Hedge Odds", value: ho },
                ]}
                outputs={[
                  { label: "Hedge Amount", value: `$${r.hs}` },
                  { label: "If Original Wins", value: `$${r.pOW}` },
                  { label: "If Hedge Wins", value: `$${r.pHW}` },
                  { label: "Hedge-Only Worst Case", value: `$${r.g}` },
                  { label: "Projected With Refund", value: `$${totalIfRefund}`, highlight: true },
                ]}
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
      </div>
      <Help entries={[
        ["Safety Net Promo", "Books like BetMGM ($1,500), bet365 ($1,000), and BetRivers ($500) refund your first bet as bonus bets if it loses. This is different from a bonus bet — you're wagering your own real cash."],
        ["The Strategy", "Place your first bet at Book A. Immediately hedge at Book B. If your bet wins: you profit from the hedge math. If it loses: you get bonus bets back, which you convert using the Bonus Bet Converter tab. Either outcome is profitable."],
        ["Why price the hedge immediately?", "A hedge can reduce outcome exposure while quoted prices remain available. If the qualifying bet loses and the refund is issued as advertised, model that bonus credit as a new conversion with its own eligibility, price, limit, void, and execution risk."],
      ]} />
    </div>
  );
}
