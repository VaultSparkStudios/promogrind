import React, { useMemo, useState } from "react";
import { BOOKS, US_BOOK_STATES } from "../books.js";
import { PROMO_SCHED } from "../data/promoSchedule.js";
import { calcArb2, f, K, toD } from "../lib/shared.js";
import { US_STATES } from "../lib/stateLegal.jsx";
import { GUT_CHECK_UI } from "../app/appText.js";
import { Help, In, Nt, RR, S, Tl, useCalcMemory } from "../ui.jsx";

export const DepositOptimizer = () => {
  const [bankroll, setBankroll] = useState("3000");
  const [userState, setUserState] = useState(() => {
    try { return localStorage.getItem("pg_user_state") || ""; } catch { return ""; }
  });
  const availBooks = useMemo(() => {
    if (!userState) return BOOKS;
    return BOOKS.filter((book) => !US_BOOK_STATES[book.name] || US_BOOK_STATES[book.name].includes(userState));
  }, [userState]);
  const ranked = useMemo(() => availBooks.map((book) => ({ ...book, ev: book.bonus * 0.70 })).sort((a, b) => b.ev - a.ev), [availBooks]);
  const bankrollNumber = Number.parseFloat(bankroll) || 0;
  const totalEV = ranked.reduce((sum, book) => sum + book.ev, 0);

  return (
    <div>
      <div style={S.card}>
        <Tl t="Deposit Optimizer" badge="BANKROLL PLANNER" bc={K.gn} shareable />
        <div style={S.row}>
          <div style={S.col}>
            <label style={S.label}>Your Bankroll</label>
            <input style={S.input} value={bankroll} onChange={(event) => setBankroll(event.target.value)} placeholder="3000" />
          </div>
          <div style={S.col}>
            <label style={S.label}>Your State</label>
            <select style={S.input} value={userState} onChange={(event) => {
              setUserState(event.target.value);
              try { localStorage.setItem("pg_user_state", event.target.value); } catch {}
            }}>
              <option value="">All States</option>
              {US_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
        </div>
        <div style={{ ...S.res(true), marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 9, color: K.mt }}>BOOKS AVAILABLE</div><div style={S.big(K.ac)}>{ranked.length}</div></div>
            <div><div style={{ fontSize: 9, color: K.mt }}>TOTAL EXTRACTABLE</div><div style={S.big(K.gn)}>~${Math.round(totalEV).toLocaleString()}</div></div>
          </div>
        </div>
        {ranked.map((book, index) => {
          const tier = index < 3 ? "top" : index < 6 ? "mid" : "low";
          const tone = tier === "top" ? K.gn : tier === "mid" ? K.yl : K.mt;
          const canFund = bankrollNumber >= (book.bonus || 0);
          return (
            <div key={book.name} style={{ padding: "10px 14px", background: K.s2, borderRadius: 6, marginBottom: 6, border: `1px solid ${canFund ? tone + "40" : K.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: K.tx, marginRight: 8 }}>#{index + 1}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tone }}>{book.name}</span>
                <span style={{ fontSize: 11, color: K.mt, marginLeft: 8 }}>Fund ${book.bonus}+ </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tone }}>Expected: ~${Math.round(book.ev)}</div>
                <div style={{ fontSize: 10, color: K.mt }}>70% of ${book.bonus} bonus</div>
              </div>
            </div>
          );
        })}
        <Nt c={K.ac}>Rankings use an estimated 70% bonus conversion rate. Available books are filtered by your state.</Nt>
      </div>
      <Help entries={[
        ["How to use", "Rank these books by expected value. Fund the highest-EV books first with your available bankroll. Each book needs roughly the bonus amount as float."],
        ["70% conversion rate", "A conservative estimate for how much of a bonus bet you will extract as real cash. Better lines produce higher conversion."],
      ]} />
    </div>
  );
};

export const HedgeValidator = () => {
  const [mem, setMem] = useCalcMemory("hedge-validator", { o1: "+300", s1: "100", o2: "-350", s2: "" });
  const { o1, s1, o2, s2 } = mem;
  const d1 = toD(o1);
  const d2 = toD(o2);
  const ipSum = ((d1 > 1 ? 1 / d1 : 0) + (d2 > 1 ? 1 / d2 : 0)) * 100;
  const s1n = Number.parseFloat(s1) || 0;
  const s2n = s2 ? (Number.parseFloat(s2) || 0) : (d2 > 1 && d1 > 1 && s1n ? s1n * (d1 - 1) / d2 : 0);
  const bothPos = d1 > 1 && d1 < 2 && d2 > 1 && d2 < 2;
  const bothNeg = d1 >= 2 && d2 >= 2;
  const pBW = s1n > 0 && d1 > 1 ? s1n * (d1 - 1) - s2n : null;
  const pHW = s2n > 0 && d2 > 1 ? s2n * (d2 - 1) - s1n : null;
  const gProfit = pBW !== null && pHW !== null ? Math.min(pBW, pHW) : null;
  const isValidHedge = gProfit !== null && gProfit > -1;

  return (
    <div>
      <div style={S.card}>
        <Tl t="Hedge Sanity Validator" badge="VALIDATE" bc={K.ac} shareable />
        <div style={S.row}><In l="Side A Odds" v={o1} set={(value) => setMem("o1", value)} ph="+300" /><In l="Side A Stake" v={s1} set={(value) => setMem("s1", value)} pre="$" ph="100" /></div>
        <div style={S.row}><In l="Side B Odds" v={o2} set={(value) => setMem("o2", value)} ph="-350" /><In l="Side B Stake (blank=auto)" v={s2} set={(value) => setMem("s2", value)} pre="$" ph="auto" /></div>
        {d1 > 1 && d2 > 1 && (
          <div style={{ marginTop: 12 }}>
            {!s2 && s2n > 0 && <div style={{ ...S.note(K.ac), marginBottom: 8 }}>Auto-computed Side B stake: ${f(s2n)}.</div>}
            {bothPos && <div style={{ ...S.note(K.rd), marginBottom: 8 }}>Both sides are favorites. Verify you are betting opposite outcomes.</div>}
            {bothNeg && <div style={{ ...S.note(K.yl), marginBottom: 8 }}>Both sides are underdogs. Verify you are betting opposite outcomes.</div>}
            <div style={{ ...S.res(isValidHedge), marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Odds Relationship</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: ipSum > 100 && ipSum < 110 ? K.gn : ipSum >= 110 && ipSum <= 120 ? K.yl : ipSum < 100 ? K.gn : K.rd }}>
                {ipSum < 100 ? "Possible arb opportunity" : ipSum < 110 ? "Plausible market" : ipSum < 120 ? "High vig market" : "Unusual - double-check these lines"} ({f(ipSum, 1)}% combined implied)
              </div>
              {gProfit !== null && <div style={{ marginTop: 8 }}><span style={S.big(gProfit >= 0 ? K.gn : K.rd)}>{gProfit >= 0 ? "+" : ""}${f(gProfit)}</span><span style={{ fontSize: 12, color: K.dm, marginLeft: 8 }}>{gProfit >= 0 ? "guaranteed profit" : "loss if either outcome"}</span></div>}
              {pBW !== null && <RR l="If Side A wins" v={`${pBW >= 0 ? "+" : ""}$${f(pBW)}`} c={pBW >= 0 ? K.gn : K.rd} />}
              {pHW !== null && <RR l="If Side B wins" v={`${pHW >= 0 ? "+" : ""}$${f(pHW)}`} c={pHW >= 0 ? K.gn : K.rd} />}
              {gProfit !== null && gProfit < -0.5 && <Nt c={K.rd}>Invalid hedge. Adjust stakes before placing either side.</Nt>}
              {gProfit !== null && gProfit >= 0 && <Nt c={K.gn}>Valid hedge. Profit is protected across both outcomes.</Nt>}
            </div>
          </div>
        )}
      </div>
      <Help entries={[
        ["What is a hedge", "A bet on the opposite outcome at a different sportsbook to protect profit regardless of who wins."],
        ["Common mistake", "Wrong stake amounts turn a good promo into a hidden loss. Leave Side B blank to auto-compute the hedge stake."],
      ]} />
    </div>
  );
};

export const PromoGuarantee = () => {
  const [promoType, setPromoType] = useState("bonus-bet");
  const [promoSize, setPromoSize] = useState("200");
  const [userState, setUserState] = useState(() => {
    try { return localStorage.getItem("pg_user_state") || ""; } catch { return ""; }
  });
  const promoTypes = [
    { id: "bonus-bet", label: "Bonus Bet", rate: [0.70, 0.75], conf: "HIGH", steps: 3, calc: "bonus-bet" },
    { id: "first-bet-insurance", label: "First Bet Insurance", rate: [0.65, 0.70], conf: "HIGH", steps: 4, calc: "first-bet" },
    { id: "profit-boost-50pct", label: "Profit Boost (50%)", rate: [0.40, 0.55], conf: "MEDIUM", steps: 2, calc: "profit-boost" },
    { id: "reload-match-20pct", label: "Reload Match (20%)", rate: [0.55, 0.65], conf: "MEDIUM", steps: 2, calc: "rollover" },
    { id: "deposit-match-100pct", label: "Deposit Match (100%)", rate: [0.50, 0.60], conf: "MEDIUM", steps: 3, calc: "deposit-match" },
  ];
  const selected = promoTypes.find((promo) => promo.id === promoType) || promoTypes[0];
  const size = Number.parseFloat(promoSize) || 0;
  const loEst = promoType === "reload-match-20pct" ? size * 0.20 * 0.60 : size * selected.rate[0];
  const hiEst = promoType === "reload-match-20pct" ? size * 0.20 * 0.65 : size * selected.rate[1];
  const relatedPromos = PROMO_SCHED.filter((promo) => !userState || US_BOOK_STATES[promo.book]?.includes(userState) || !US_BOOK_STATES[promo.book])
    .filter((promo) => {
      const text = promo.promo.toLowerCase();
      if (promoType === "bonus-bet" && text.includes("bonus") && text.includes("bet")) return true;
      if (promoType === "profit-boost-50pct" && text.includes("boost")) return true;
      if (promoType === "reload-match-20pct" && text.includes("reload")) return true;
      return false;
    })
    .slice(0, 4);
  const confColor = { HIGH: K.gn, MEDIUM: K.yl, LOW: K.rd };

  return (
    <div>
      <div style={S.card}>
        <Tl t="Promo Profit Guarantee" badge="CONVERSION EST." bc={K.gn} shareable />
        <div style={S.row}>
          <div style={S.col}><label style={S.label}>Promo Type</label><select style={S.input} value={promoType} onChange={(event) => setPromoType(event.target.value)}>{promoTypes.map((promo) => <option key={promo.id} value={promo.id}>{promo.label}</option>)}</select></div>
          <div style={S.col}><label style={S.label}>Promo Size</label><input style={S.input} value={promoSize} onChange={(event) => setPromoSize(event.target.value)} placeholder="200" /></div>
          <div style={S.col}><label style={S.label}>Your State</label><select style={S.input} value={userState} onChange={(event) => {
            setUserState(event.target.value);
            try { localStorage.setItem("pg_user_state", event.target.value); } catch {}
          }}><option value="">All States</option>{US_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></div>
        </div>
        {size > 0 && (
          <div style={S.res(true)}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}><span style={S.big(K.gn)}>${f(loEst)} - ${f(hiEst)}</span></div>
            <div style={{ fontSize: 11, color: K.dm, marginBottom: 8 }}>Estimated guaranteed profit range</div>
            <RR l="Conversion rate range" v={`${Math.round(selected.rate[0] * 100)}% - ${Math.round(selected.rate[1] * 100)}%`} c={K.yl} />
            <RR l="Confidence" v={selected.conf || "MEDIUM"} c={confColor[selected.conf || "MEDIUM"]} b />
            <RR l="Steps to convert" v={`${selected.steps} steps`} c={K.ac} />
            <Nt c={K.ac}>Use the {selected.label} calculator to run exact math for your odds.</Nt>
            {relatedPromos.length > 0 && <div style={{ marginTop: 8 }}><div style={{ fontSize: 10, color: K.mt, marginBottom: 4 }}>Books with this promo type:</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{relatedPromos.map((promo) => <span key={promo.book + promo.promo} style={S.tag(K.ac)}>{promo.book}</span>)}</div></div>}
          </div>
        )}
      </div>
      <Help entries={[
        ["Bonus Bet", "A free bet credit where only profit is returned. Good conversions usually land near 70-75% at ideal odds."],
        ["Profit Boost", "A percentage increase to winnings. The extractable value depends on boost cap, odds, and whether the hedge line is efficient."],
      ]} />
    </div>
  );
};

export const GutCheck = () => {
  const [mem, setMem] = useCalcMemory("gut-check", { o1: "+200", o2: "-220" });
  const { o1, o2 } = mem;
  const d1 = toD(o1);
  const d2 = toD(o2);
  const ipSum = ((d1 > 1 ? 1 / d1 : 0) + (d2 > 1 ? 1 / d2 : 0)) * 100;
  const isPlausible = d1 > 1 && d2 > 1;
  const bothPlus = (o1.startsWith("+") || toD(o1) > 2) && (o2.startsWith("+") || toD(o2) > 2);
  const oppositeSides = !!(d1 > 1 && d2 > 1 && ((o1.startsWith("+") || toD(o1) > 2) && (o2.startsWith("-") || (toD(o2) < 2 && !o2.startsWith("+")))));
  const arb = isPlausible ? calcArb2(o1, o2, 100) : null;

  return (
    <div>
      <div style={S.card}>
        <Tl t="Gut Check Validator" badge="QUICK CHECK" bc={K.ac} shareable />
        <div style={S.row}><In l="Line 1 Odds" v={o1} set={(value) => setMem("o1", value)} ph="+200" /><In l="Line 2 Odds" v={o2} set={(value) => setMem("o2", value)} ph="-220" /></div>
        {isPlausible && <div style={S.res(ipSum < 110)}>
          <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, color: K.mt, textTransform: "uppercase", letterSpacing: "1px" }}>Odds Relationship: </span><span style={{ fontSize: 12, fontWeight: 700, color: oppositeSides ? K.gn : bothPlus ? K.yl : K.mt }}>{oppositeSides ? GUT_CHECK_UI.valid : bothPlus ? GUT_CHECK_UI.maybe : GUT_CHECK_UI.manual}</span></div>
          <RR l="Combined implied probability" v={`${f(ipSum, 1)}%`} c={ipSum < 100 ? K.gn : ipSum < 110 ? K.gn : ipSum < 120 ? K.yl : K.rd} />
          <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: ipSum < 100 ? K.gn : ipSum < 110 ? K.gn : ipSum < 120 ? K.yl : K.rd }}>{ipSum < 100 ? "Possible arb opportunity" : ipSum < 110 ? "Plausible market" : ipSum < 120 ? "High vig market" : "Unusual - double-check these lines"}</div>
          {arb && <><RR l="Hedge math check ($100 total)" v={arb.ok ? `ARB: +$${arb.pr}` : "No arb"} c={arb.ok ? K.gn : K.rd} b />{arb.ok && <Nt c={K.gn}>These lines contain an arb. Use the 2-Way Arb calculator for exact stakes.</Nt>}{!arb.ok && <Nt c={K.yl}>No arb. Best side to exploit: {toD(o1) > toD(o2) ? `Line 1 (${o1})` : `Line 2 (${o2})`}.</Nt>}</>}
        </div>}
      </div>
      <Help entries={[
        ["Use this for", "Quickly sanity-check two lines before running full calculations. It catches same-side bets and obvious relationship errors."],
        ["Implied probability sum", "Under 100% is an arb. 100-110% is a normal range. Over 120% means the lines need review."],
      ]} />
    </div>
  );
};

const KNOWN_STACKABLE = [
  { book1: "DraftKings", book2: "FanDuel", desc: "DK Stepped-Up Parlay + FD SGP Insurance on same slate", value: "Stack same-slate SGP for double coverage" },
  { book1: "Caesars", book2: "BetMGM", desc: "Caesars 100% Profit Boost + BetMGM Safety Net on same game", value: "Hedge both outcomes with bonus protection" },
  { book1: "DraftKings", book2: "BetRivers", desc: "DK Profit Boost + BetRivers 2nd Chance Parlay", value: "Boost + refund on same event" },
  { book1: "FanDuel", book2: "ESPN BET", desc: "FD No Sweat SGP + ESPN BET Profit Boost on same game", value: "Insurance + boosted payout combo" },
];

export const PromoArbFinder = () => {
  const [bookAOdds, setBookAOdds] = useState("+200");
  const [boostPct, setBoostPct] = useState("50");
  const [bookBOdds, setBookBOdds] = useState("-220");
  const [stake, setStake] = useState("100");
  const result = useMemo(() => {
    const stakeNumber = Number.parseFloat(stake);
    const da = toD(bookAOdds);
    const db = toD(bookBOdds);
    const boost = Number.parseFloat(boostPct) / 100;
    if (!stakeNumber || da <= 1 || db <= 1) return null;
    const normalProfit = stakeNumber * (da - 1);
    const boostedPayout = stakeNumber + normalProfit + normalProfit * boost;
    const hedgeStake = boostedPayout / db;
    const netWin = boostedPayout - stakeNumber - hedgeStake;
    const netLoseSide2 = hedgeStake * (db - 1) - stakeNumber;
    const bothProfit = Math.min(netWin, netLoseSide2);
    return { hedgeStake: f(hedgeStake), netWin: f(netWin), netLoseSide2: f(netLoseSide2), bothProfit: f(bothProfit), ok: bothProfit > 0 };
  }, [bookAOdds, boostPct, bookBOdds, stake]);

  return (
    <div style={S.card}>
      <Tl t="Promo Arb Finder" badge="CROSS-BOOK" bc={K.pp} />
      <div style={{ fontSize: 12, color: K.dm, marginBottom: 16, lineHeight: 1.6 }}>Stack a profit boost from Book A with a hedge at Book B on the same event to lock in profit regardless of outcome.</div>
      <div style={S.row}><In l="Book A Odds (boosted bet)" v={bookAOdds} set={setBookAOdds} ph="+200" /><In l="Book A Boost %" v={boostPct} set={setBoostPct} ph="50" /><In l="Book B Hedge Odds" v={bookBOdds} set={setBookBOdds} ph="-220" /><In l="Stake at Book A" v={stake} set={setStake} pre="$" ph="100" /></div>
      {result && <div style={S.res(result.ok)}><div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}><span style={S.big(result.ok ? K.gn : K.rd)}>{result.ok ? "+" : ""}${result.bothProfit}</span><span style={{ fontSize: 12, color: K.dm }}>guaranteed profit</span></div><RR l="Hedge stake at Book B" v={`$${result.hedgeStake}`} c={K.ac} b /><RR l="Net if Book A wins (boosted)" v={`+$${result.netWin}`} c={K.gn} /><RR l="Net if Book B wins (hedge)" v={`${Number.parseFloat(result.netLoseSide2) >= 0 ? "+" : ""}$${result.netLoseSide2}`} c={Number.parseFloat(result.netLoseSide2) >= 0 ? K.gn : K.rd} />{!result.ok && <Nt c={K.yl}>No arb at these odds. Try a higher boost percentage or better hedge odds.</Nt>}</div>}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: K.ac, marginBottom: 10, textTransform: "uppercase", letterSpacing: "1.5px" }}>Known Stackable Combos</div>
        {KNOWN_STACKABLE.map((combo) => <div key={`${combo.book1}-${combo.book2}`} style={{ ...S.card, background: K.s2, padding: "12px 14px", marginBottom: 8 }}><div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}><span style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{combo.book1}</span><span style={{ fontSize: 10, color: K.mt }}>+</span><span style={{ fontSize: 12, fontWeight: 700, color: K.tx }}>{combo.book2}</span></div><div style={{ fontSize: 11, color: K.dm, marginBottom: 2 }}>{combo.desc}</div><div style={{ fontSize: 10, color: K.pp }}>{combo.value}</div></div>)}
      </div>
    </div>
  );
};
