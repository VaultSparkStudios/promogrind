import React from "react";
import { useNavigate } from "react-router-dom";
import { K, font } from "../lib/shared.js";

// Static routing map: calcKey → [{ label, slug, reason }]
const CHAIN = {
  "bonus-bet": [
    { label: "2-Way Arb", slug: "arb-2way", reason: "Lock modeled profit across books" },
    { label: "Kelly Criterion", slug: "kelly", reason: "Size your edge bets optimally" },
  ],
  "arb-2way": [
    { label: "Kelly Criterion", slug: "kelly", reason: "Optimal stake sizing for your edge" },
    { label: "Parlay Hedge", slug: "parlay-hedge", reason: "Lock parlay profit before the final leg" },
  ],
  "arb-3way": [
    { label: "Kelly Criterion", slug: "kelly", reason: "Size stakes by bankroll fraction" },
    { label: "+EV Calculator", slug: "ev", reason: "Verify each leg is genuinely +EV" },
  ],
  "profit-boost": [
    { label: "Bonus Bet Converter", slug: "bonus-bet", reason: "Convert bonus bets from the same book" },
    { label: "2-Way Arb", slug: "arb-2way", reason: "Arb the boosted line across books" },
  ],
  "ev": [
    { label: "Kelly Criterion", slug: "kelly", reason: "Size this +EV bet by your bankroll" },
    { label: "2-Way Arb", slug: "arb-2way", reason: "Lock modeled profit on this line" },
  ],
  "deposit-match": [
    { label: "Bonus Bet Converter", slug: "bonus-bet", reason: "Convert bonus bets earned from the match" },
    { label: "+EV Calculator", slug: "ev", reason: "Find the best line to place your deposit" },
  ],
  "first-bet": [
    { label: "Bonus Bet Converter", slug: "bonus-bet", reason: "Convert safety-net bonus bets" },
    { label: "Parlay Hedge", slug: "parlay-hedge", reason: "Lock profit on a live parlay" },
  ],
  "parlay-hedge": [
    { label: "2-Way Arb", slug: "arb-2way", reason: "Find a clean arb for your next play" },
    { label: "Kelly Criterion", slug: "kelly", reason: "Size your next hedge by bankroll" },
  ],
  "parlay-builder": [
    { label: "Parlay Hedge", slug: "parlay-hedge", reason: "Lock profit once your parlay is live" },
    { label: "+EV Calculator", slug: "ev", reason: "Verify each leg has a genuine edge first" },
  ],
  "sgp": [
    { label: "Promo Insurance", slug: "insurance", reason: "Calculate your SGP insurance value" },
    { label: "Parlay Hedge", slug: "parlay-hedge", reason: "Hedge the SGP if a live hedge appears" },
  ],
  "teaser": [
    { label: "+EV Calculator", slug: "ev", reason: "Verify your per-leg win rates are correct" },
    { label: "Kelly Criterion", slug: "kelly", reason: "Size the teaser by expected edge" },
  ],
  "insurance": [
    { label: "Bonus Bet Converter", slug: "bonus-bet", reason: "Convert insurance bonus bets at max rate" },
    { label: "+EV Calculator", slug: "ev", reason: "Check if the insured line is genuinely +EV" },
  ],
  "kelly": [
    { label: "+EV Calculator", slug: "ev", reason: "Find the next +EV edge to size into" },
    { label: "2-Way Arb", slug: "arb-2way", reason: "Lock modeled profit on your next play" },
  ],
};

export default function CalcNextStep({ calcKey }) {
  const navigate = useNavigate();
  const suggestions = CHAIN[calcKey];
  if (!suggestions?.length) return null;

  return (
    <div style={{ marginTop: 12, padding: "10px 12px", background: K.s2, border: `1px solid ${K.bd}`, borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: K.mt, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontFamily: font }}>Next Recommended Step</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {suggestions.map(s => (
          <button
            key={s.slug}
            onClick={() => navigate(`/${s.slug}`)}
            title={s.reason}
            style={{ padding: "6px 12px", background: `${K.ac}10`, border: `1px solid ${K.ac}25`, borderRadius: 6, color: K.ac, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: font, textAlign: "left" }}
          >
            {s.label} <span style={{ color: K.mt, fontWeight: 400, fontSize: 10 }}>— {s.reason}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
