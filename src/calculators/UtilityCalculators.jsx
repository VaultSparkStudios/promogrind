import React, { useMemo, useState } from "react";
import AccessibleToggle from "../components/AccessibleToggle.jsx";
import { toD, toA, toP, toF, f, calcMid, calcRO, K } from "../lib/shared.js";
import { S, In, RR, Tl, Nt, Help, useCalcMemory } from "../ui.jsx";

const MiddleBet = () => {
  const [mem,setMem]=useCalcMemory('middle',{o1:"-110",o2:"-110",l1:"220.5",l2:"200.5",s:"100"});
  const {o1,o2,l1,l2,s}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setL1=v=>setMem('l1',v),setL2=v=>setMem('l2',v),setS=v=>setMem('s',v);
  const r = useMemo(()=>calcMid(o1,o2,l1,l2,parseFloat(s)),[o1,o2,l1,l2,s]);
  return (<div><div style={S.card}><Tl t="Middle Bet Calculator" badge="MIDDLE" bc={K.ac} shareable/>
    <div style={S.row}><In l="Under Odds (Book A)" v={o1} set={setO1}/><In l="Line 1 (Under)" v={l1} set={setL1}/><In l="Over Odds (Book B)" v={o2} set={setO2}/><In l="Line 2 (Over)" v={l2} set={setL2}/></div>
    <div style={S.row}><In l="Stake (Side 1)" v={s} set={setS} pre="$"/></div>
    {r&&<div role="status" aria-live="polite" aria-atomic="false" style={S.res(true)}><RR l="Side 2 Stake" v={`$${r.s2}`} c={K.ac} b/><RR l="Total Risked" v={`$${r.ts}`}/><RR l="Worst Case" v={`$${r.wc}`} c={parseFloat(r.wc)>=0?K.gn:K.rd}/><RR l="Middle Width" v={`${r.w} points`} c={K.pp}/><RR l="If Middle Hits (BOTH WIN)" v={`+$${r.mw}`} c={K.gn} b/></div>}
  </div>
  <Help entries={[
    ["Middle Bet","When two sportsbooks have DIFFERENT lines on the same game, you can bet opposite sides and potentially win BOTH if the result lands in the 'middle'. Example: Book A has passing yards Under 220.5, Book B has Over 200.5. If the player throws 210 yards, both bets win."],
    ["The Risk","If the result falls outside the middle, one side wins and one loses. With -110 juice, you'll lose about $5-$10 on a $100 stake. The middle itself might pay $180+. It's a risk/reward calculation."],
    ["Best for","Player props where books disagree by 5+ points. Total points/goals where books have 3+ point gaps. The wider the middle, the more likely it hits."],
  ]}/></div>);
};

const OddsConvert = () => {
  const [mem,setMem]=useCalcMemory('odds-convert',{v:"-110",mode:"american"});
  const {v,mode}=mem;
  const setV=x=>setMem('v',x),setMode=x=>setMem('mode',x);
  const dec = mode==="american"?toD(v):mode==="decimal"?parseFloat(v):(()=>{const[n,d]=v.split("/").map(Number);return d?n/d+1:0;})();
  return (<div><div style={S.card}><Tl t="Odds Format Converter" badge="UTILITY" bc={K.dm} shareable/>
    <div style={S.row}><div style={S.col}><label style={S.label}>Input Format</label><select style={S.input} value={mode} onChange={e=>setMode(e.target.value)}><option value="american">American (+/- odds)</option><option value="decimal">Decimal (e.g. 2.10)</option><option value="fractional">Fractional (e.g. 11/10)</option></select></div><In l="Enter Odds" v={v} set={setV}/></div>
    {dec>0&&<div role="status" aria-live="polite" aria-atomic="false" style={{...S.res(true),display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,textAlign:"center"}}>
      {[["American",toA(dec),K.ac],["Decimal",f(dec,3),K.pp],["Fractional",toF(dec),K.yl],["Implied Prob",f(toP(dec),1)+"%",K.gn]].map(([l,vv,c])=>(<div key={l}><div style={{fontSize:10,color:K.mt,marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:700,color:c}}>{vv}</div></div>))}
    </div>}
  </div>
  <Help entries={[
    ["American Odds","The US standard. + means underdog: +200 means bet $100 to win $200. - means favorite: -150 means bet $150 to win $100. The number always relates to $100."],
    ["Decimal Odds","Used in Europe/Australia. Your total return per $1 bet. Decimal 3.00 = bet $1, get $3 back ($2 profit + $1 stake). To convert: -150 American = 100/150 + 1 = 1.667 decimal."],
    ["Fractional Odds","Used in UK. Shows profit relative to stake. 5/1 means win $5 for every $1 bet. 1/2 means win $1 for every $2 bet."],
    ["Implied Probability","What the odds suggest about the likelihood of winning. -200 = 66.7% implied probability. +200 = 33.3%. Useful for comparing what a book thinks vs. what you think."],
  ]}/></div>);
};

const RolloverCalc = () => {
  const [mem,setMem]=useCalcMemory('rollover',{b:"500",m:"5",v:"4.5"});
  const {b,m,v}=mem;
  const setB=x=>setMem('b',x),setM=x=>setMem('m',x),setV=x=>setMem('v',x);
  const r = useMemo(()=>calcRO(b,m,v),[b,m,v]);
  return (<div><div style={S.card}><Tl t="Rollover / Playthrough Calculator" badge="DEPOSIT MATCH" bc={K.yl} shareable/>
    <div style={S.row}><In l="Bonus Amount" v={b} set={setB} pre="$"/><In l="Rollover Multiplier" v={m} set={setM} ph="5"/><In l="Average Vig %" v={v} set={setV} ph="4.5"/></div>
    {r&&<div role="status" aria-live="polite" aria-atomic="false" style={S.res(r.ok)}><RR l="Total You Must Wager" v={`$${r.tw}`} b/><RR l="Expected Cost (lost to vig)" v={`-$${r.ec}`} c={K.rd}/><RR l="Net Value of This Bonus" v={`${r.ok?"+":""}$${r.nv}`} c={r.ok?K.gn:K.rd} b/><RR l="Approximate Bets Needed (~$50 avg)" v={r.nb}/>
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"Worth clearing. The bonus exceeds vig cost.":"Warning: Vig cost exceeds bonus. Lower-vig markets or skip."}</Nt></div>}
  </div>
  <Help entries={[
    ["Rollover / Playthrough","Some deposit match bonuses require you to wager a certain multiple of the bonus before you can withdraw it. A '5x playthrough' on a $500 bonus means you must bet $2,500 total before the bonus becomes real cash."],
    ["Vig Cost","Every bet you place loses a tiny amount to the sportsbook's margin (the vig). At a standard 4.5% vig, betting $2,500 total costs you about $112.50. If the bonus is $500, the net value is $500 - $112.50 = $387.50."],
    ["When to skip","If the rollover multiplier is 10x or higher, or if the vig on the required markets is above 6%, the bonus might not be worth clearing. This calculator tells you the break-even point."],
    ["How to minimize vig cost","Bet on low-vig markets: NFL/NBA spreads and totals at -110/-110 (4.5% vig). Avoid player props (8-12% vig) and parlays (compounded vig). Just bet normally on main markets until the rollover is cleared."],
  ]}/></div>);
};

const IncomeEstimator = () => {
  const [numBooks, setNumBooks] = useState("6");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [hasBoosts, setHasBoosts] = useState(true);
  const [boostsPerDay, setBoostsPerDay] = useState("5");

  const nb = Math.min(parseInt(numBooks)||0, 12);
  const hpw = parseFloat(hoursPerWeek)||0;

  // Welcome promo estimates per book (conservative)
  const BOOK_VALUES = [1200, 900, 700, 600, 500, 400, 350, 300, 250, 200, 150, 100];
  const welcomePromos = BOOK_VALUES.slice(0, nb).reduce((s,v)=>s+v, 0) * 0.7; // 70% conversion

  // Daily boost income
  const dailyBoosts = parseFloat(boostsPerDay)||0;
  const boostPerConversion = hpw >= 7 ? 12 : hpw >= 4 ? 9 : 6; // more time = better lines
  const monthlyBoosts = hasBoosts ? dailyBoosts * boostPerConversion * 22 : 0; // ~22 trading days/mo
  const annualBoosts = monthlyBoosts * 12;

  const annualTotal = welcomePromos + annualBoosts;
  const hourlyRate = hpw > 0 ? annualTotal / (hpw * 52) : 0;

  return (<div><div style={S.card}><Tl t="Annual Income Estimator" badge="PROJECTION" bc={K.gn} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Sportsbooks Available in Your State</label>
        <select style={S.input} value={numBooks} onChange={e=>setNumBooks(e.target.value)}>
          {["2","3","4","5","6","7","8","9","10","11","12"].map(n=><option key={n} value={n}>{n} books</option>)}
        </select>
      </div>
      <div style={S.col}><label style={S.label}>Hours Per Week Available</label>
        <select style={S.input} value={hoursPerWeek} onChange={e=>setHoursPerWeek(e.target.value)}>
          {[["1","~1 hr/week (minimal)"],["3","~3 hrs/week (casual)"],["5","~5 hrs/week (regular)"],["7","~7 hrs/week (dedicated)"],["10","10+ hrs/week (full grind)"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Daily Profit Boosts Available</label>
        <select style={S.input} value={boostsPerDay} onChange={e=>setBoostsPerDay(e.target.value)}>
          {[["2","2/day (1-2 books)"],["5","5/day (3-5 books)"],["8","8/day (6-8 books)"],["12","12/day (all books, multiple daily)"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{...S.col,display:"flex",alignItems:"center",gap:10,paddingTop:20}}>
        <label style={{...S.label,margin:0}}>Has Recurring Boosts</label>
        <AccessibleToggle
          checked={hasBoosts}
          onChange={setHasBoosts}
          label="Include recurring boosts"
          compact
        />
      </div>
    </div>

    <div role="status" aria-live="polite" aria-atomic="false" style={{...S.res(true),marginTop:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16,textAlign:"center"}}>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Welcome Promos</div>
          <div style={{fontSize:22,fontWeight:700,color:K.yl,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(welcomePromos).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>one-time, ~{nb} books</div>
        </div>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Annual Boosts</div>
          <div style={{fontSize:22,fontWeight:700,color:K.ac,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(annualBoosts).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>${Math.round(monthlyBoosts).toLocaleString()}/month recurring</div>
        </div>
        <div>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Year 1 Total</div>
          <div style={{fontSize:22,fontWeight:700,color:K.gn,fontFamily:"'Space Grotesk',sans-serif"}}>${Math.round(annualTotal).toLocaleString()}</div>
          <div style={{fontSize:9,color:K.mt}}>~${Math.round(hourlyRate)}/hr effective rate</div>
        </div>
      </div>
      <div style={{height:1,background:K.bd,marginBottom:16}}/>
      <RR l="Welcome promo season (first 2-4 weeks)" v={`$${Math.round(welcomePromos).toLocaleString()}`} c={K.yl}/>
      <RR l={`Daily boost income (${boostsPerDay} boosts × ~$${boostPerConversion} each × 22 days)`} v={`$${Math.round(monthlyBoosts).toLocaleString()}/month`} c={K.ac}/>
      <RR l="Year 1 estimate (conservative)" v={`$${Math.round(annualTotal * 0.8).toLocaleString()} – $${Math.round(annualTotal * 1.1).toLocaleString()}`} c={K.gn} b/>
      <RR l="Effective hourly rate" v={`~$${Math.round(hourlyRate)}/hr`} c={K.pp}/>
      <Nt c={K.yl}>These are estimates based on current sportsbook promo values (2026). Welcome promos assume 70% conversion rate. Boost income varies by available lines and sportsbook generosity. Your actual results may be higher or lower.</Nt>
      <Nt c={K.ac}>Later-period estimates depend mostly on recurring boosts because welcome promos are one-time. Treat the output as scenario planning, not expected income.</Nt>
    </div>
  </div>
  <Help entries={[
    ["Welcome promo estimates","Based on current sportsbook offers: DraftKings ~$200 effective, FanDuel ~$200, BetMGM ~$180, Caesars ~$150, bet365 ~$125, ESPN BET ~$100, Fanatics ~$90, BetRivers ~$80. Assumes 70% conversion rate on bonus bets."],
    ["Boost income","Profit boosts appear daily across most sportsbooks. At 5 boosts per day averaging $9 each, that's $45/day, ~$990/month. More active grinders running all 8 books can see $200+/day on peak event days."],
    ["Hourly rate","Based on your selected hours per week. Include research, account management, line movement, voids, limits, and settlement time when judging whether the workflow is worthwhile."],
    ["State matters","More legal sportsbooks in your state = more promos = more income. NJ, PA, CO, MI have the most books. Some states only have 2-3."],
  ]}/></div>);
};

// ═══ PROMO FINDER WIZARD ═══

export { MiddleBet, OddsConvert, RolloverCalc, IncomeEstimator };
