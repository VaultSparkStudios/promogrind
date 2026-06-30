import React, { useState } from "react";
import { K } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";

const GLOSSARY_TERMS = [
  ["Vig / Juice", "The sportsbook's built-in profit margin on every bet. Standard vig is about 4.5% with both sides at -110."],
  ["Moneyline", "Bet on who wins outright. +200 is an underdog and -200 is a favorite."],
  ["Spread", "Bet on margin of victory. -3.5 means the team must win by 4 or more."],
  ["Total / Over-Under", "Bet on the combined score of both teams."],
  ["Parlay", "Multiple bets combined into one ticket. Every leg must win."],
  ["Arbitrage", "Betting both sides at different books where combined odds guarantee profit."],
  ["+EV", "Positive expected value. The bet is expected to profit over many repetitions."],
  ["Closing Line Value (CLV)", "Whether your odds were better than the closing odds. Consistently beating the close is a long-term edge signal."],
  ["Hedge", "Placing a second bet on the opposite outcome to lock in profit or limit loss."],
  ["Bonus Bet", "A bet credit where only the profit is returned, not the stake."],
  ["Profit Boost", "A percentage increase added to your winnings if the bet wins."],
  ["First Bet Insurance", "Refund of a first bet as bonus bets if it loses."],
  ["Rollover / Playthrough", "The required wagering multiple before bonus funds can be withdrawn."],
  ["Devig / No-Vig", "Removing the sportsbook's margin to find true probabilities."],
  ["Kelly Criterion", "Formula for sizing bets based on bankroll and edge."],
  ["Middle", "Betting opposite sides at different lines where both can win."],
  ["Round Robin", "Creating all possible sub-parlays from a pool of picks."],
  ["Teaser", "A parlay where you move lines in your favor for a reduced payout."],
  ["Hold", "The total percentage a sportsbook expects to keep from both sides of a market."],
  ["Sharp Book", "Sportsbook with low vig and accurate lines, often used as a market reference."],
  ["Getting Limited", "When a book reduces your max bet size due to consistent profiting."],
  ["SGP", "Same-game parlay. All legs must be from the same game."],
];

export default function Glossary() {
  const [search, setSearch] = useState("");
  const filtered = GLOSSARY_TERMS.filter(([term]) => term.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S.card}>
      <Tl t="Betting Glossary" badge="QUICK REF" bc={K.ac} />
      <div style={{ marginBottom: 12 }}>
        <input style={S.input} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search terms..." />
      </div>
      {filtered.map(([term, def]) => (
        <div key={term} style={{ padding: "10px 0", borderBottom: `1px solid ${K.bd}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: K.ac, marginBottom: 3 }}>{term}</div>
          <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.6 }}>{def}</div>
        </div>
      ))}
      {!filtered.length && <div style={{ textAlign: "center", padding: 24, color: K.mt, fontSize: 12 }}>No terms found.</div>}
    </div>
  );
}
