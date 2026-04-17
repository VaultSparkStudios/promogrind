import React, { useState } from "react";
import { toD, toA, f, K, font } from "../lib/shared.js";
import CalculatorReceipt from "../components/CalculatorReceipt.jsx";
import { BOOKS } from "../books.js";
import { S, RR, Nt, Tl, Help } from "../ui.jsx";

export default function LineShop() {
  const bookNames = BOOKS.map((b) => b.name);
  const [showReceipt, setShowReceipt] = useState(false);
  const [odds, setOdds] = useState(() => Object.fromEntries(bookNames.map((n) => [n, ""])));
  const [label, setLabel] = useState("");
  const entries = bookNames.map((n) => ({ name: n, odds: odds[n], color: BOOKS.find((b) => b.name === n)?.color || "#60a5fa" })).filter((e) => e.odds && toD(e.odds) > 1);
  const best = entries.length ? entries.reduce((b, e) => toD(e.odds) > toD(b.odds) ? e : b) : null;
  const nvOdds = entries.length >= 2 ? (() => { const probs = entries.map((e) => 1 / toD(e.odds)); const avg = probs.reduce((s, p) => s + p, 0) / probs.length; return toA(1 / avg); })() : null;

  return (
    <div>
      <div style={S.card}>
        <Tl t="Line Shopping" badge="BEST ODDS FINDER" bc={K.gn} shareable />
        <div style={S.row}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={S.label}>Game / Event (optional)</label>
            <input style={S.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Chiefs vs Bills — Moneyline Chiefs" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
          {bookNames.map((n) => {
            const isBest = best?.name === n;
            return (
              <div key={n} style={{ padding: "10px", background: isBest ? `${K.gn}10` : K.s2, border: `1px solid ${isBest ? K.gn : K.bd2}`, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: isBest ? K.gn : K.mt, fontWeight: isBest ? 700 : 400, marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>{n}{isBest && " ★"}</div>
                <input style={{ ...S.input, padding: "5px 8px", fontSize: 12 }} value={odds[n]} onChange={(e) => setOdds((o) => ({ ...o, [n]: e.target.value }))} placeholder="e.g. -110" />
              </div>
            );
          })}
        </div>
        {entries.length >= 2 && (
          <div style={S.res(true)}>
            {best && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                <span style={S.big(K.gn)}>{best.odds}</span>
                <span style={{ fontSize: 12, color: K.dm }}>best odds at {best.name}</span>
                <button onClick={() => setShowReceipt(true)} style={{ marginLeft: "auto", padding: "2px 8px", background: "transparent", border: `1px solid ${K.bd2}`, borderRadius: 4, color: K.mt, fontSize: 9, cursor: "pointer", fontFamily: font }}>📄 Receipt</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {entries.sort((a, b) => toD(b.odds) - toD(a.odds)).map((e) => (
                <div key={e.name} style={{ padding: "6px 12px", background: e.name === best?.name ? `${K.gn}15` : K.s3, border: `1px solid ${e.name === best?.name ? K.gn : K.bd2}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: e.name === best?.name ? K.gn : K.tx }}>{e.odds}</div>
                  <div style={{ fontSize: 9, color: K.mt }}>{e.name}</div>
                </div>
              ))}
            </div>
            {nvOdds && <RR l="Market consensus (no-vig)" v={nvOdds} c={K.pp} />}
            {best && <RR l="Best vs. average (cents saved per $100)" v={`+${f((1 / toD(entries.reduce((s, e) => ({ odds: String(toD(s.odds) + toD(e.odds)), name: "avg" })).odds * entries.length) - 1 / toD(best.odds)) * 100, 1)}¢`} c={K.gn} />}
            <Nt c={K.ac}>Always bet at the book offering the best odds for your side. Even 5 cents better on a $200 bet = $10 extra profit per game.</Nt>
            {showReceipt && best && (
              <CalculatorReceipt
                calcName="Line Shopping"
                inputs={label ? [{ label: "Event", value: label }, ...entries.map((e) => ({ label: e.name, value: e.odds }))] : entries.map((e) => ({ label: e.name, value: e.odds }))}
                outputs={[
                  ...(nvOdds ? [{ label: "Market Consensus (no-vig)", value: nvOdds }] : []),
                  ...entries.sort((a, b) => toD(b.odds) - toD(a.odds)).slice(0, 3).map((e, i) => ({ label: `#${i + 1} ${e.name}`, value: e.odds })),
                  { label: "Best Odds", value: `${best.odds} @ ${best.name}`, highlight: true },
                ]}
                disclaimer="Always verify odds are still available before placing."
                onClose={() => setShowReceipt(false)}
              />
            )}
          </div>
        )}
        {entries.length < 2 && <Nt c={K.mt}>Enter odds from 2+ books above to compare.</Nt>}
      </div>
      <Help entries={[
        ["Line Shopping", "Checking multiple sportsbooks to find the best odds for your bet before placing. At -110 vs -105, you save $5 per $100 bet. Over hundreds of bets, this compounds into hundreds of dollars."],
        ["Market Consensus", "The average implied probability across all books you entered, with vig removed. This is a rough estimate of the 'true' fair odds."],
        ["How much it matters", "A bettor who always shops lines and gets 5 cents better odds on average will beat a bettor who doesn't by 2-3% ROI over the long run — without needing better picks."],
        ["The golden rule", "Never place a moneyline or spread bet without checking at least 3 books. Difference between books is often 5-15 cents. Set up accounts at 6+ books so you always have options."],
      ]} />
    </div>
  );
}
