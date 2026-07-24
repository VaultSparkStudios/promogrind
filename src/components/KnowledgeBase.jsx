import React, { useState } from "react";
import { K, font } from "../lib/shared.js";
import { S, Tl } from "../ui.jsx";

const FAQS = [
  ["Is this legal in my state?", "Yes, if your state has legal online sports betting. This tool is a math calculator: it does not place bets, access sportsbook systems, or handle money. The legal question is whether online sports betting is legal where you are, not whether you can use a calculator."],
  ["Can I get limited by sportsbooks?", "Books can reduce your maximum bet size or exclude you from specific promotions. This typically happens to accounts that only place hedging bets with no recreational activity. To improve account longevity, use varied stake sizes, avoid immediate withdrawal patterns, and keep most action on main markets."],
  ["How much can I realistically make?", "Welcome promos across 8-10 books can be worth roughly $1,000-$2,500 one-time. Daily profit boosts can create recurring value, often $300-$1,000/month for consistent operators in strong states. The income estimator gives a more personalized projection."],
  ["Do I need to know anything about sports?", "No. Promo conversion is mostly math, timing, and disciplined execution. You are evaluating odds, stakes, timing, and risk controls, not predicting teams or players."],
  ["Is this gambling?", "Traditional gambling means taking risk for the chance of reward. Matched betting aims to reduce or eliminate outcome risk by covering both sides. Positive expected value betting still has variance, so PromoGrind treats it as an advanced discipline surface rather than a hype loop."],
  ["What if I lose a bet?", "With a correctly hedged promo, the worst case is usually a smaller profit than expected. The main operational risks are missing the hedge, placing the wrong amount, using the wrong market, or misunderstanding terms."],
];

function FaqAccordion() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: K.ac, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        Frequently Asked Questions
      </div>
      {FAQS.map(([question, answer], index) => (
        <div key={question} style={{ borderBottom: `1px solid ${K.bd}`, marginBottom: 0 }}>
          <button
            onClick={() => setOpen((current) => (current === index ? null : index))}
            style={{
              width: "100%", textAlign: "left", background: "none", border: "none",
              padding: "10px 0", color: K.tx, cursor: "pointer", display: "flex",
              justifyContent: "space-between", alignItems: "center", fontFamily: font,
              fontSize: 12, fontWeight: 600,
            }}
          >
            <span>{question}</span>
            <span style={{ color: K.mt, fontSize: 10, marginLeft: 12 }}>{open === index ? "^" : "v"}</span>
          </button>
          {open === index && <div style={{ fontSize: 12, color: K.dm, lineHeight: 1.7, paddingBottom: 12 }}>{answer}</div>}
        </div>
      ))}
    </div>
  );
}

export default function KnowledgeBase() {
  return (
    <div style={S.card}>
      <Tl t="Complete Knowledge Base" />
      <div style={{ fontSize: 13, lineHeight: 1.8, color: K.dm }}>
        <div style={{ ...S.tag(K.gn), marginBottom: 12, fontSize: 12 }}>START HERE IF YOU'RE NEW</div>

        <div style={S.helpH}>What Is This Tool?</div>
        <p>This is a math calculator for sportsbook promotions. Sportsbooks give away promotional value to attract new customers. PromoGrind helps you evaluate how to convert those offers into disciplined, trackable value without sportsbook hype or impulsive betting language.</p>

        <div style={S.helpH}>Is This Legal?</div>
        <p>Matched betting and promo conversion are legal in US states where online sports betting is legal. PromoGrind does not place bets, access sportsbook accounts, or handle money. It is closer to a spreadsheet or tax calculator than a sportsbook.</p>

        <div style={S.helpH}>How Much Can I Make?</div>
        <p>Welcome offers can create meaningful one-time value, while daily boosts can create recurring smaller opportunities. Treat these ranges as planning assumptions, not modeled income. Your state, available books, limits, bankroll, timing, and execution quality all matter.</p>

        <FaqAccordion />

        <div style={{ ...S.tag(K.ac), marginBottom: 12, marginTop: 24, fontSize: 12 }}>GLOSSARY - EVERY TERM EXPLAINED</div>

        <div style={S.helpH}>Odds Formats</div>
        <p><span style={S.helpTerm}>American Odds (+/-)</span> - The standard US format. Positive odds show how much you win on a $100 bet. Negative odds show how much you must risk to win $100.</p>
        <p><span style={S.helpTerm}>Decimal Odds</span> - Your total return per $1. Decimal 2.50 means bet $1 and receive $2.50 back if it wins.</p>
        <p><span style={S.helpTerm}>Implied Probability</span> - What the odds imply about the chance of winning. Sportsbook implied probabilities usually add to more than 100% because of the vig.</p>

        <div style={S.helpH}>Key Betting Terms</div>
        <p><span style={S.helpTerm}>Vig / Juice</span> - The sportsbook margin built into the price. Standard two-way markets often carry about 4.5% hold.</p>
        <p><span style={S.helpTerm}>Moneyline</span> - A bet on which team or participant wins.</p>
        <p><span style={S.helpTerm}>Spread</span> - A bet on the margin of victory.</p>
        <p><span style={S.helpTerm}>Total</span> - A bet on combined score over or under a posted number.</p>
        <p><span style={S.helpTerm}>Parlay</span> - Multiple legs combined into one bet. Every leg must win for the parlay to pay.</p>
        <p><span style={S.helpTerm}>Player Prop</span> - A bet on an individual player statistic.</p>

        <div style={S.helpH}>Promo Types</div>
        <p><span style={S.helpTerm}>Bonus Bet / Free Bet</span> - A sportsbook credit where only the profit is usually returned if it wins. The original bonus stake disappears.</p>
        <p><span style={S.helpTerm}>Profit Boost</span> - A percentage increase to potential winnings. You use your own stake, and the boost changes the payout.</p>
        <p><span style={S.helpTerm}>First Bet Safety Net</span> - Your first real-cash bet is insured. If it loses, you receive a refund, commonly as bonus bets.</p>
        <p><span style={S.helpTerm}>Deposit Match</span> - A book matches a percentage of your deposit with bonus funds, usually with rollover requirements.</p>
        <p><span style={S.helpTerm}>Rollover / Playthrough</span> - The amount you must wager before bonus funds become withdrawable.</p>

        <div style={S.helpH}>Strategy Terms</div>
        <p><span style={S.helpTerm}>Hedge</span> - A second bet on the opposite outcome to lock or limit the result.</p>
        <p><span style={S.helpTerm}>Arbitrage</span> - Betting all sides of an event across books when pricing models a return.</p>
        <p><span style={S.helpTerm}>Positive Expected Value (+EV)</span> - A bet where your estimated true probability is better than the offered odds. Individual outcomes can still lose.</p>
        <p><span style={S.helpTerm}>Conversion Rate</span> - The percentage of a promo's face value you extract as real value.</p>
        <p><span style={S.helpTerm}>Middle</span> - Betting opposite sides at different lines where both bets can win if the result lands in the gap.</p>
        <p><span style={S.helpTerm}>Closing Line Value (CLV)</span> - Whether your odds beat the final market price before the event starts.</p>
        <p><span style={S.helpTerm}>Getting Limited</span> - A sportsbook reducing your limits or excluding you from promos because your account pattern looks too sharp or too promo-only.</p>

        <div style={{ ...S.tag(K.yl), marginBottom: 12, marginTop: 24, fontSize: 12 }}>STEP-BY-STEP WALKTHROUGH</div>

        <div style={S.helpH}>Phase 1: Setup</div>
        <p>Create accounts only where legal, verify identity, fund deliberately, and keep a written checklist. Do not place rushed qualifying bets before you understand each promo's terms.</p>

        <div style={S.helpH}>Phase 2: Welcome Promos</div>
        <p>Start with the highest-value offers, run exact math in the calculator, place the hedge immediately when required, and log every action.</p>

        <div style={S.helpH}>Phase 3: Convert Everything</div>
        <p>Use the Bonus Bet Converter for every bonus bet. Target clean, repeatable conversions rather than heroic edge claims.</p>

        <div style={S.helpH}>Phase 4: Daily Profit Boosts</div>
        <p>After welcome promos, recurring boosts become the operator loop. Check books consistently, estimate value, execute only when the math clears your floor, and record outcomes.</p>

        <div style={S.helpH}>Phase 5: Advanced +EV Betting</div>
        <p>Use no-vig and expected value tools only after your tracking discipline is solid. Positive expected value is not a guarantee on any single bet.</p>

        <div style={{ ...S.tag(K.rd), marginBottom: 12, marginTop: 24, fontSize: 12 }}>IMPORTANT WARNINGS</div>
        <p><strong>This is not gambling advice.</strong> You must be of legal age and only use sportsbooks where betting is legal. All winnings are taxable. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
        <p><strong>Account longevity:</strong> Avoid same-book hedges, vary behavior, keep records, avoid reckless withdrawal patterns, and understand that books can still limit accounts.</p>

        <div style={{ ...S.tag(K.gn), marginBottom: 12, marginTop: 24, fontSize: 12 }}>TAX GUIDE</div>

        <div style={S.helpH}>Reporting Your Winnings</div>
        <p>All gambling winnings are taxable ordinary income in the US. Keep records even if a sportsbook does not issue a form.</p>

        <div style={S.helpH}>Deducting Losses</div>
        <p>Loss deductions have strict limits and generally require itemizing. The ledger is designed to help you keep source records, not to replace a tax professional.</p>

        <div style={S.helpH}>Quarterly Estimated Taxes</div>
        <p>If you expect to owe meaningful tax, consider quarterly estimated payments. Consult a qualified tax professional for your situation.</p>

        <div style={S.helpH}>Professional Gambler Status</div>
        <p>Professional status is complex and can create self-employment tax exposure. Do not assume it applies just because you are systematic.</p>

        <div style={{ ...S.tag(K.pp), marginBottom: 12, marginTop: 24, fontSize: 12 }}>STATE AVAILABILITY GUIDE</div>

        <div style={S.helpH}>Which Sportsbooks Operate Where</div>
        <p>Online sportsbook availability changes by state and by operator. Each sportsbook app will show whether it operates in your state during account creation.</p>
        <p><span style={S.helpTerm}>Strong promo states</span>: New Jersey, Pennsylvania, Colorado, Michigan, Virginia, Ohio, Indiana, Arizona, and New York usually offer broader operator choice.</p>

        <div style={{ ...S.tag(K.ac), marginBottom: 12, marginTop: 24, fontSize: 12 }}>STAKING PLAN GUIDE</div>

        <div style={S.helpH}>Flat Betting</div>
        <p>Bet the same dollar amount every time, typically a small percentage of bankroll. Simple, conservative, and easier to audit.</p>

        <div style={S.helpH}>Kelly Criterion</div>
        <p>Bets scale with estimated edge. Full Kelly can create large drawdowns; most practical operators use fractional Kelly.</p>

        <div style={S.helpH}>Proportional Bankroll Sizing</div>
        <p>Stake a fixed percentage of current bankroll so bet sizes shrink after losses and grow after wins.</p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 11 }}>
          <thead><tr>{["Style", "Risk Level", "Best For", "Avg Bet ($1000 BR)"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${K.bd2}`, color: K.mt, fontSize: 10 }}>{heading}</th>)}</tr></thead>
          <tbody>{[
            ["Flat 1%", "Low", "Beginners and promo conversion", "$10"],
            ["Quarter Kelly", "Medium", "Verified +EV bettors", "$5-25"],
            ["Half Kelly", "Med-High", "Experienced operators", "$10-50"],
            ["Full Kelly", "High", "Experts only", "Variable"],
          ].map(([style, risk, bestFor, average]) => (
            <tr key={style}>
              <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.tx, fontWeight: 600 }}>{style}</td>
              <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.dm }}>{risk}</td>
              <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.dm }}>{bestFor}</td>
              <td style={{ padding: "6px 8px", borderBottom: `1px solid ${K.bd}`, color: K.ac }}>{average}</td>
            </tr>
          ))}</tbody>
        </table>

        <div style={{ ...S.tag(K.yl), marginBottom: 12, marginTop: 24, fontSize: 12 }}>PROMO CALENDAR</div>

        <div style={S.helpH}>Best Times of Year for Promo Grinding</div>
        <p>Sportsbooks spend most aggressively around major sports events. Plan around NFL kickoff, the Super Bowl, March Madness, NBA/NHL playoff windows, and MLB Opening Day.</p>

        <div style={{ ...S.tag(K.gn), marginBottom: 12, marginTop: 24, fontSize: 12 }}>BOOK-SPECIFIC GUIDES</div>

        <div style={S.helpH}>DraftKings</div>
        <p>Often broad state coverage and frequent boosts. Check promotions daily and keep account behavior varied.</p>

        <div style={S.helpH}>FanDuel</div>
        <p>Strong same-game parlay and boost inventory. Understand refund formats before qualifying.</p>

        <div style={S.helpH}>BetMGM</div>
        <p>Large safety-net style offers can be valuable, but disciplined sizing and longevity practices matter.</p>

        <div style={S.helpH}>Caesars</div>
        <p>Rewards points and boost tokens can add value. Be conservative with repeat conversion patterns.</p>

        <div style={S.helpH}>bet365</div>
        <p>Often strong odds quality in supported states. Availability is narrower than the largest US operators.</p>

        <div style={S.helpH}>ESPN BET</div>
        <p>Promos can be tied to featured games and ESPN integrations. Check current terms carefully.</p>

        <div style={S.helpH}>Fanatics</div>
        <p>FanCash and shopping-account integration can change how value is realized. Treat merchandise value separately from cash value.</p>

        <div style={S.helpH}>BetRivers</div>
        <p>Known for loyalty and second-chance style promos in supported states. Check the exact reward conversion path.</p>
      </div>
    </div>
  );
}
