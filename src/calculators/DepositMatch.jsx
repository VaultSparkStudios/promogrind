import React, { useMemo, useState, useEffect } from "react";
import { calcDeposit, K, font } from "../lib/shared.js";
import { S, In, RR, Tl, Nt, Help, useCalcMemory } from "../ui.jsx";
import CalculatorTrustBadge from "../components/CalculatorTrustBadge.jsx";
import ResultFeedbackCard from "../components/ResultFeedbackCard.jsx";
import CalcNextStep from "../components/CalcNextStep.jsx";

export default function DepositMatch() {
  const [mem, setMem] = useCalcMemory("deposit-match", { dep: "500", pct: "100", mx: "500", ro: "1", vg: "4.5" });
  const { dep, pct, mx, ro, vg } = mem;
  const setDep = (v) => setMem("dep", v);
  const setPct = (v) => setMem("pct", v);
  const setMx = (v) => setMem("mx", v);
  const setRo = (v) => setMem("ro", v);
  const setVg = (v) => setMem("vg", v);
  const r = useMemo(() => calcDeposit(dep, pct, mx, ro, vg), [dep, pct, mx, ro, vg]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pg_hist_deposit-match") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!r || !parseFloat(r.net)) return;
    const entry = { ts: Date.now(), dep, pct, mx, ro, vg, net: r.net, bonus: r.bonus };
    setHist((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem("pg_hist_deposit-match", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [r?.net, r?.bonus, dep, pct, mx, ro, vg]);

  return (
    <div>
      <div style={S.card}>
        <Tl t="Deposit Match Calculator" badge="ROLL OVER THE REAL VALUE" bc={K.ac} shareable getParams={() => ({ dep, pct, mx, ro, vg })} />
        <div style={S.row}>
          <In l="Deposit Amount" v={dep} set={setDep} pre="$" ph="500" />
          <In l="Match Percentage" v={pct} set={setPct} suf="%" ph="100" />
          <In l="Max Bonus" v={mx} set={setMx} pre="$" ph="500" />
        </div>
        <div style={S.row}>
          <In l="Rollover Multiple" v={ro} set={setRo} suf="x" ph="1" />
          <In l="Avg Vig Cost" v={vg} set={setVg} suf="%" ph="4.5" />
        </div>
        <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setDep("500"); setPct("100"); setMx("500"); setRo("1"); setVg("4.5"); }} style={{ padding: "4px 10px", background: `${K.ac}10`, border: `1px solid ${K.ac}30`, borderRadius: 4, color: K.ac, fontSize: 10, cursor: "pointer", fontFamily: font }}>
            Show Example
          </button>
          <span style={{ fontSize: 10, color: K.mt }}>
            Example: deposit $500, get a 100% match up to $500, 1x rollover, 4.5% average vig drag
          </span>
        </div>
        {hist.length > 0 && (
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setShowHist((h) => !h)} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.dm, fontSize: 9, cursor: "pointer", fontFamily: font }}>
              History ({hist.length})
            </button>
          </div>
        )}
        {showHist && hist.length > 0 && (
          <div style={{ marginBottom: 12, padding: 10, background: K.s2, borderRadius: 6, border: `1px solid ${K.bd}`, maxHeight: 180, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Last {hist.length} calculations</div>
            {hist.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: K.dm, padding: "3px 0", borderBottom: i < hist.length - 1 ? `1px solid ${K.bd}` : "none" }}>
                <span>${h.dep} at {h.pct}% up to ${h.mx}</span>
                <span style={{ color: K.gn, fontWeight: 600 }}>${h.net} net</span>
                <span style={{ color: K.mt }}>{new Date(h.ts).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        {r && (
          <div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span style={S.big(r.ok ? K.gn : K.rd)}>${r.net}</span>
              <span style={{ fontSize: 12, color: K.dm }}>estimated net bonus value</span>
            </div>
            <RR l="Bonus Awarded" v={`$${r.bonus}`} c={K.ac} b />
            <RR l="Total Wagering Required" v={`$${r.tw}`} c={K.pp} />
            <RR l="Estimated Vig Cost" v={`-$${r.cost}`} c={K.yl} />
            <RR l="ROI on Deposit" v={`${r.roi}%`} c={parseFloat(r.roi) >= 20 ? K.gn : K.yl} />
            <RR l="Deposit Needed to Max This Promo" v={`$${r.minDep}`} c={r.fill ? K.gn : K.yl} />
            {!r.fill && (
              <Nt c={K.yl}>
                This deposit does not fully capture the listed max bonus. Increase your deposit to the minimum above if you want the full match.
              </Nt>
            )}
            <Nt c={r.ok ? K.gn : K.rd}>
              Deposit matches usually look stronger than they really are. The rollover requirement and average line hold are what determine whether the promo is actually worth tying up bankroll.
            </Nt>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <CalculatorTrustBadge calculatorKey="deposit-match" promoType="deposit_match" />
            </div>
            {parseFloat(r.net) > 0 && (
              <ResultFeedbackCard calculatorKey="deposit-match" calculatorLabel="Deposit Match Calculator" promoType="deposit_match" expectedProfit={r.net} />
            )}
          </div>
        )}
        {r && r.ok && <CalcNextStep calcKey="deposit-match" />}
      </div>
      <Help entries={[
        ["What this calculator does", "A deposit match gives you bonus funds based on how much you deposit. This calculator estimates realizable value after rollover instead of treating the full bonus amount as cash."],
        ["Rollover multiple", "If the bonus has a 5x rollover and the bonus amount is $200, you must place $1,000 in total wagers before the funds are fully cleared."],
        ["Avg vig cost", "Every qualifying wager leaks a small amount of value through the book's hold. Around 4% to 5% is a reasonable default for many mainstream lines if you are not line-shopping aggressively."],
        ["When to use this", "Use this for welcome deposit matches, reload matches, and casino-style sportsbook crossover promos where the terms require playthrough before withdrawal."],
      ]} />
    </div>
  );
}
