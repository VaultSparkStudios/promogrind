import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BOOKS } from "./books.js";
import { checkAuth, getSubscription, startCheckout, supabase } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, onDailyLogin } from "./sync.js";

/*
═══════════════════════════════════════════════════════════════
  PROMO ENGINE v3 — Complete Sportsbook Profit Extraction System
  
  LEGAL STATUS:
  This is an educational calculator tool — like a tax calculator 
  or mortgage calculator. It performs math on numbers you input.
  
  - Matched betting is legal in all US states where online sports 
    betting is legal (30+ states as of March 2026)
  - This tool does not place bets, access sportsbook APIs, or 
    handle any money
  - It is a math calculator with educational content
  - Sharing it with friends is no different than sharing a 
    spreadsheet or calculator app
  - ProfitDuel, OddsJam, DarkHorse Odds, and dozens of similar 
    tools operate legally as paid subscription services
  - This tool is FREE. Affiliate links in src/books.js support development.
  
  GAMBLING DISCLAIMER:
  Must be 21+ (18+ in some states). Only bet in states where 
  sports betting is legal. All gambling winnings are taxable. 
  Gamble responsibly. If you or someone you know has a gambling 
  problem, call 1-800-GAMBLER.
═══════════════════════════════════════════════════════════════
*/

// ═══ MATH ENGINE ═══
const toD = (am) => { const o = parseFloat(am); if (isNaN(o) || o === 0) return 0; return o > 0 ? o/100+1 : 100/Math.abs(o)+1; };
const toA = (d) => { if (d >= 2) return "+"+Math.round((d-1)*100); if (d > 1) return ""+Math.round(-100/(d-1)); return "0"; };
const toP = (d) => d > 0 ? (1/d*100) : 0;
const toF = (d) => { if (d <= 1) return "0/1"; const n = Math.round((d-1)*100), dn = 100, g = gcd(n, dn); return `${n/g}/${dn/g}`; };
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
const f = (n, dp=2) => (typeof n === "number" ? n.toFixed(dp) : parseFloat(n||0).toFixed(dp));

const calcBonus = (sz, bO, hO) => { const bd=toD(bO), hd=toD(hO); if (bd<=1||hd<=1||!sz) return null; const wp=sz*(bd-1), hs=wp/hd, pBW=wp-hs, pHW=hs*(hd-1), g=Math.min(pBW,pHW); return {hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),r:f(g/sz*100,1)}; };
const calcFirst = (s, o, hO) => { const d=toD(o), hd=toD(hO); if (d<=1||hd<=1||!s) return null; const p=s*d, hs=p/hd, pOW=p-s-hs, pHW=hs*hd-hs-s; return {hs:f(hs),pOW:f(pOW),pHW:f(pHW),g:f(Math.min(pOW,pHW))}; };
const calcBoost = (s, o, bp, mx, hO) => { const d=toD(o), hd=toD(hO), b=parseFloat(bp)/100; if (d<=1||hd<=1||!s||!b) return null; const np=s*(d-1), ba=Math.min(np*b,parseFloat(mx)||Infinity), tp=s+np+ba, ed=tp/s, hs=tp/hd, pBW=tp-s-hs, pHW=hs*hd-hs-s, g=Math.min(pBW,pHW); return {eo:toA(ed),ed2:f(ed,4),bv:f(ba),hs:f(hs),pBW:f(pBW),pHW:f(pHW),g:f(g),tp:f(tp)}; };
const calcArb2 = (o1, o2, t) => { const d1=toD(o1), d2=toD(o2); if (d1<=1||d2<=1||!t) return null; const m=1/d1+1/d2, s1=t*(1/d1)/m, s2=t*(1/d2)/m, p=s1*d1; return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),p:f(p),pr:f(p-t),roi:f((p-t)/t*100)}; };
const calcArb3 = (o1, o2, o3, t) => { const d1=toD(o1),d2=toD(o2),d3=toD(o3); if(d1<=1||d2<=1||d3<=1||!t) return null; const m=1/d1+1/d2+1/d3, s1=t*(1/d1)/m, s2=t*(1/d2)/m, s3=t*(1/d3)/m, p=s1*d1; return {ok:m<1,mg:f((1-m)*100),s1:f(s1),s2:f(s2),s3:f(s3),pr:f(p-t),roi:f((p-t)/t*100)}; };
const calcNV = (o1, o2) => { const d1=toD(o1), d2=toD(o2); if(d1<=1||d2<=1) return null; const p1=1/d1, p2=1/d2, t=p1+p2, v=(t-1)*100, f1=p1/t, f2=p2/t; return {v:f(v,1),ip1:f(p1*100,1),ip2:f(p2*100,1),fp1:f(f1*100,1),fp2:f(f2*100,1),fo1:toA(1/f1),fo2:toA(1/f2)}; };
const calcEV = (yo, fo, s) => { const yd=toD(yo), fd=toD(fo); if(yd<=1||fd<=1||!s) return null; const fp=1/fd, ev=(fp*(yd-1)*s)-((1-fp)*s); return {ev:f(ev),roi:f(ev/s*100,1),fp:f(fp*100,1),edge:f((yd-fd)/fd*100,1),ok:ev>0}; };
const calcPH = (pp, hO, os) => { const hd=toD(hO); if(hd<=1||!pp||!os) return null; const hs=pp/hd, pPW=pp-os-hs, pHW=hs*hd-hs-os; return {hs:f(hs),pPW:f(pPW),pHW:f(pHW),g:f(Math.min(pPW,pHW))}; };
const calcMid = (o1, o2, l1, l2, s) => { const d1=toD(o1), d2=toD(o2); if(d1<=1||d2<=1||!s) return null; const s2=(s*d1)/d2, ts=s+s2, wc=Math.max(s*d1,s2*d2)-ts, mw=s*d1+s2*d2-ts, w=Math.abs(parseFloat(l1)-parseFloat(l2)); return {s2:f(s2),ts:f(ts),wc:f(wc),mw:f(mw),w:f(w,1)}; };
const calcRO = (b, m, v) => { const bn=parseFloat(b),mn=parseFloat(m),vn=parseFloat(v)/100; if(!bn||!mn) return null; const tw=bn*mn, ec=tw*(vn||0.045), nv=bn-ec; return {tw:f(tw),ec:f(ec),nv:f(nv),nb:Math.ceil(tw/50),ok:nv>0}; };

// BOOKS imported from ./books.js — edit affiliate links there

// ═══ COLORS ═══
const K = { bg:"#0a0e17", s1:"#0f1520", s2:"#161d2a", s3:"#1c2536", bd:"#1e293b", bd2:"#334155", ac:"#60a5fa", gn:"#4ade80", rd:"#f87171", yl:"#fbbf24", pp:"#c084fc", tx:"#e2e8f0", dm:"#94a3b8", mt:"#64748b", wh:"#ffffff" };

// Storage helpers are now in src/sync.js (cloud-backed)

// ═══ STYLES ═══
const font = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const fontD = "'Space Grotesk','SF Pro Display',sans-serif";
const S = {
  card: { background: K.s1, border: `1px solid ${K.bd}`, borderRadius: 10, padding: 20, marginBottom: 16 },
  label: { display:"block", fontSize:10, color:K.mt, marginBottom:4, textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:600 },
  input: { width:"100%", padding:"8px 10px", background:K.s2, border:`1px solid ${K.bd2}`, borderRadius:6, color:K.tx, fontFamily:font, fontSize:13, outline:"none", boxSizing:"border-box" },
  row: { display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 },
  col: { flex:1, minWidth:120 },
  res: (ok) => ({ background: ok ? `${K.gn}08` : `${K.rd}08`, border:`1px solid ${ok?K.gn:K.rd}25`, borderRadius:8, padding:16, marginTop:12 }),
  big: (c) => ({ fontSize:28, fontWeight:700, color:c||K.gn, fontFamily:fontD, lineHeight:1 }),
  tag: (c) => ({ display:"inline-block", padding:"2px 8px", borderRadius:50, fontSize:10, fontWeight:600, background:`${c}15`, color:c }),
  rr: { display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${K.bd}` },
  note: (c) => ({ marginTop:10, padding:10, background:`${c||K.yl}0d`, borderRadius:6, fontSize:12, color:c||K.yl, lineHeight:1.6 }),
  help: { fontSize:12, lineHeight:1.7, color:K.dm, marginTop:12 },
  helpH: { fontSize:14, fontWeight:600, color:K.tx, margin:"16px 0 6px", fontFamily:fontD },
  helpTerm: { color:K.ac, fontWeight:600 },
  meter: (pct, c) => (<div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:K.mt}}>QUALITY</span><span style={{fontSize:10,color:c,fontWeight:600}}>{pct>=70?"EXCELLENT":pct>=60?"GOOD":pct>=50?"FAIR":"POOR"} ({pct}%)</span></div><div style={{height:4,borderRadius:2,background:K.s3}}><div style={{height:4,borderRadius:2,background:c,width:`${Math.min(100,pct)}%`,transition:"width 0.4s"}}/></div></div>),
};

// ═══ UI ATOMS ═══
const In = ({l,v,set,ph,pre}) => (<div style={S.col}><label style={S.label}>{l}</label><div style={{position:"relative"}}>{pre&&<span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:K.mt,fontSize:12}}>{pre}</span>}<input style={{...S.input,...(pre?{paddingLeft:22}:{})}} value={v} onChange={e=>set(e.target.value)} placeholder={ph}/></div></div>);
const RR = ({l,v,c,b}) => (<div style={S.rr}><span style={{fontSize:12,color:K.dm}}>{l}</span><span style={{fontSize:13,fontWeight:b?700:500,color:c||K.tx}}>{v}</span></div>);
const Tl = ({t,badge,bc}) => (<div style={{fontSize:16,fontWeight:600,color:K.tx,marginBottom:14,display:"flex",alignItems:"center",fontFamily:fontD}}>{t}{badge&&<span style={{...S.tag(bc||K.ac),marginLeft:8}}>{badge}</span>}</div>);
const Nt = ({children,c}) => (<div style={S.note(c)}>{children}</div>);

// ═══ INLINE HELP COMPONENT ═══
const Help = ({entries}) => (<div style={{...S.card,background:K.s2,borderColor:K.bd,marginTop:12}}><div style={{fontSize:12,fontWeight:600,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>How This Works</div><div style={S.help}>{entries.map((e,i)=><div key={i} style={{marginBottom:10}}><span style={S.helpTerm}>{e[0]}:</span> {e[1]}</div>)}</div></div>);

// ═══════════════════════════════════════════
// TOOL COMPONENTS
// ═══════════════════════════════════════════

const BonusBet = () => {
  const [sz,setSz]=useState("200"),[bo,setBo]=useState("+300"),[ho,setHo]=useState("-350");
  const r = useMemo(()=>calcBonus(parseFloat(sz),bo,ho),[sz,bo,ho]);
  return (<div><div style={S.card}><Tl t="Bonus Bet Converter" badge="STAKE NOT RETURNED" bc={K.gn}/>
    <div style={S.row}><In l="Bonus Bet Size" v={sz} set={setSz} pre="$" ph="200"/><In l="Bonus Bet Odds" v={bo} set={setBo} ph="+300"/><In l="Hedge Odds" v={ho} set={setHo} ph="-350"/></div>
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span></div>
      <RR l="Hedge Bet Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Bonus Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Bet Wins" v={`+$${r.pHW}`} c={K.gn}/><RR l="Conversion Rate" v={`${r.r}%`} c={parseFloat(r.r)>=70?K.gn:K.yl} b/>
      {S.meter(parseFloat(r.r),parseFloat(r.r)>=70?K.gn:parseFloat(r.r)>=50?K.yl:K.rd)}</div>}
  </div>
  <Help entries={[
    ["Bonus Bet","A free bet credit given by a sportsbook. If it wins, you only get the PROFIT — the original bonus amount is NOT returned. For example, a $200 bonus bet at +300 odds that wins pays you $600 in profit, but the $200 credit disappears."],
    ["Underdog / Favorite","The underdog is the team expected to lose (shown with + odds like +300). The favorite is expected to win (shown with - odds like -350). For conversions, you always place your bonus on the underdog and hedge with cash on the favorite."],
    ["Hedge","A second bet on the opposite outcome at a DIFFERENT sportsbook. By betting both sides, you guarantee profit regardless of who wins."],
    ["Conversion Rate","The percentage of the bonus you extract as real cash. 70%+ is considered excellent — meaning a $200 bonus bet becomes $140+ in your pocket. The wider the odds gap, the better the conversion."],
    ["Why +250 to +400 odds?","Higher + odds on the bonus side means more potential profit to hedge against. Below +200, conversion rates drop below 60%. Above +500, finding close hedge lines becomes harder."],
    ["Step-by-Step","1) Get your bonus bets from a sportsbook promo. 2) Find a game with an underdog at +250 to +400. 3) Place your bonus bet on the underdog at Book A. 4) Use this calculator to find the hedge amount. 5) Place a CASH bet for that amount on the favorite at Book B. 6) No matter who wins, you profit."],
  ]}/></div>);
};

const ProfitBoost = () => {
  const [s,setS]=useState("50"),[o,setO]=useState("+200"),[bp,setBp]=useState("50"),[mx,setMx]=useState("250"),[ho,setHo]=useState("-220");
  const r = useMemo(()=>calcBoost(parseFloat(s),o,parseFloat(bp),mx,ho),[s,o,bp,mx,ho]);
  return (<div><div style={S.card}><Tl t="Profit Boost Converter" badge="DAILY RECURRING $$$" bc={K.yl}/>
    <div style={S.row}><In l="Your Stake (cash)" v={s} set={setS} pre="$" ph="50"/><In l="Original Odds" v={o} set={setO} ph="+200"/><In l="Boost Percentage" v={bp} set={setBp} ph="50"/></div>
    <div style={S.row}><In l="Max Extra Winnings" v={mx} set={setMx} pre="$" ph="250"/><In l="Hedge Odds (other book)" v={ho} set={setHo} ph="-220"/></div>
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span></div>
      <RR l="Effective Boosted Odds" v={`${r.eo} (${r.ed2} decimal)`} c={K.pp} b/><RR l="Boost Value Added" v={`+$${r.bv}`} c={K.yl}/><RR l="Total Boosted Payout (if win)" v={`$${r.tp}`}/><RR l="Hedge Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Boosted Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn}/>
      <Nt c={K.yl}>This is your long-term money machine. Sportsbooks offer 2-5 boosts daily. At $5-$15 profit per boost × 30 days = $300-$1,000/month recurring.</Nt></div>}
  </div>
  <Help entries={[
    ["Profit Boost","A sportsbook promo that adds a percentage to your winnings IF your bet wins. A 50% profit boost on a bet that would win $100 now wins $150 instead. Unlike bonus bets, you're using your OWN money — the boost just sweetens the payout."],
    ["How the math works","The boost changes your 'effective odds' — the real payout you'd get. We calculate those effective odds, then figure out the exact hedge amount at another book that locks in profit regardless of outcome."],
    ["Max Extra Winnings","Most boosts have a cap. A '50% boost, max $250 extra' means even if your normal winnings would be $600, the boost only adds up to $250. Always enter this cap — it affects the hedge calculation."],
    ["Why this is the big money","Welcome promos are one-time. But profit boosts appear DAILY. DraftKings alone offers 2-3 per day. Across 5-6 sportsbook apps, you can find 5-10 boosts daily. Even at $5 per conversion, that's $150-$300/month from one activity."],
    ["Step-by-Step","1) Check your sportsbook apps each morning for profit boosts. 2) Find the boost, note the odds, percentage, and max extra winnings. 3) Find the opposing line at another book. 4) Enter everything here. 5) Place the boosted bet at Book A. 6) Place the hedge at Book B for the calculated amount. 7) Profit either way."],
  ]}/></div>);
};

const FirstBet = () => {
  const [s,setS]=useState("500"),[o,setO]=useState("+150"),[ho,setHo]=useState("-170");
  const r = useMemo(()=>calcFirst(parseFloat(s),o,ho),[s,o,ho]);
  return (<div><div style={S.card}><Tl t="First Bet Safety Net Hedge" badge="CASH BET" bc={K.ac}/>
    <div style={S.row}><In l="First Bet Stake" v={s} set={setS} pre="$"/><In l="Your Odds" v={o} set={setO}/><In l="Hedge Odds" v={ho} set={setHo}/></div>
    {r&&<div style={S.res(true)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>from hedge math</span></div>
      <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b/><RR l="If Original Wins" v={`$${r.pOW}`} c={parseFloat(r.pOW)>=0?K.gn:K.rd}/><RR l="If Hedge Wins" v={`$${r.pHW}`} c={parseFloat(r.pHW)>=0?K.gn:K.rd}/>
      <Nt c={K.yl}>If your first bet LOSES → you get ${s} in bonus bets. Convert those at ~70% using the Bonus Bet tab = ~${f(parseFloat(s)*0.7,0)} more profit!</Nt></div>}
  </div>
  <Help entries={[
    ["Safety Net Promo","Books like BetMGM ($1,500), bet365 ($1,000), and BetRivers ($500) refund your first bet as bonus bets if it loses. This is different from a bonus bet — you're wagering your own real cash."],
    ["The Strategy","Place your first bet at Book A. Immediately hedge at Book B. If your bet wins: you profit from the hedge math. If it loses: you get bonus bets back, which you convert using the Bonus Bet Converter tab. Either outcome is profitable."],
    ["Why hedge immediately?","If you don't hedge, you're just gambling. The hedge locks in a small profit from the math, and MORE IMPORTANTLY, it means when you lose (and get the bonus bets), those bonus bets are pure profit to convert — you haven't actually lost anything."],
  ]}/></div>);
};

const NoVig = () => {
  const [o1,setO1]=useState("-110"),[o2,setO2]=useState("-110");
  const r = useMemo(()=>calcNV(o1,o2),[o1,o2]);
  return (<div><div style={S.card}><Tl t="No-Vig Fair Odds Calculator" badge="DEVIG" bc={K.pp}/>
    <div style={S.row}><In l="Side 1 Odds" v={o1} set={setO1} ph="-110"/><In l="Side 2 Odds" v={o2} set={setO2} ph="-110"/></div>
    {r&&<div style={S.res(true)}><RR l="Sportsbook Vig (Juice)" v={`${r.v}%`} c={K.rd} b/>
      <div style={{marginTop:8,marginBottom:2,fontSize:10,color:K.mt}}>SIDE 1</div>
      <RR l="Implied Probability (with vig)" v={`${r.ip1}%`} c={K.dm}/><RR l="True Probability (no vig)" v={`${r.fp1}%`} c={K.gn}/><RR l="Fair Odds" v={r.fo1} c={K.pp} b/>
      <div style={{marginTop:8,marginBottom:2,fontSize:10,color:K.mt}}>SIDE 2</div>
      <RR l="Implied Probability (with vig)" v={`${r.ip2}%`} c={K.dm}/><RR l="True Probability (no vig)" v={`${r.fp2}%`} c={K.gn}/><RR l="Fair Odds" v={r.fo2} c={K.pp} b/>
      <Nt c={K.ac}>If any sportsbook offers BETTER than these fair odds on either side, that bet has positive expected value (+EV).</Nt></div>}
  </div>
  <Help entries={[
    ["Vig (Vigorish) / Juice","The sportsbook's built-in profit margin. It's why both sides of a coin flip aren't +100 — they're typically -110 each. That gap is the vig. Standard vig is about 4.5% (called 'the juice'). The book keeps this regardless of who wins."],
    ["Why -110/-110 doesn't add to 100%","At -110 odds, each side has an implied probability of 52.4%. That's 104.8% total — the extra 4.8% is the vig. The true probability of each side is 50/50, but the book charges you extra for the privilege of betting."],
    ["No-Vig / Fair Odds","What the odds WOULD be if the sportsbook took zero profit. These represent the 'true' probability of each outcome based on market consensus. If you can bet at odds BETTER than the fair odds, you have an edge."],
    ["How to use this","Enter odds from a sharp sportsbook (one known for accurate lines — Pinnacle, Circa, or the average of several major books). The fair odds become your benchmark. Then check other books — if any offer better odds than the fair line, use the +EV calculator."],
  ]}/></div>);
};

const PlusEV = () => {
  const [yo,setYo]=useState("+120"),[fo,setFo]=useState("+105"),[s,setS]=useState("100");
  const r = useMemo(()=>calcEV(yo,fo,parseFloat(s)),[yo,fo,s]);
  return (<div><div style={S.card}><Tl t="Expected Value Calculator" badge="+EV" bc={K.gn}/>
    <div style={S.row}><In l="Sportsbook's Odds" v={yo} set={setYo} ph="+120"/><In l="Fair (No-Vig) Odds" v={fo} set={setFo} ph="+105"/><In l="Bet Size" v={s} set={setS} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value per bet</span></div>
      <RR l="ROI per bet" v={`${r.roi}%`} c={r.ok?K.gn:K.rd} b/><RR l="True Win Probability" v={`${r.fp}%`}/><RR l="Your Edge" v={`${r.edge}%`} c={r.ok?K.gn:K.rd}/>
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"This bet is +EV. Over hundreds of bets at this edge, you WILL profit mathematically — individual bets can still lose.":"This bet is -EV. The sportsbook has the edge. Skip it."}</Nt></div>}
  </div>
  <Help entries={[
    ["Expected Value (EV)","The average profit or loss per bet if you made this exact bet thousands of times. +EV means profitable long-term. -EV means the house wins long-term. It's the single most important concept in profitable betting."],
    ["Example","Fair odds say a team has a 50% chance to win (fair odds: +100). A sportsbook offers +120 on that team. You're getting paid $120 for a $100 bet on something that's actually a coin flip. Over 100 such bets, you'd expect to win 50 of them at +120 = $6,000 in winnings, while losing 50 × $100 = $5,000. Net: +$1,000. That's +EV."],
    ["This is NOT guaranteed per bet","A +EV bet can absolutely lose TODAY. It's like a casino — the house has an edge, but sometimes the player wins. You're the house now, and your edge plays out over VOLUME. You need 100+ bets for the math to smooth out."],
    ["Where to get Fair Odds","Use the No-Vig calculator with odds from a sharp book, or use the market consensus (average of 5+ major books with the vig removed)."],
  ]}/></div>);
};

const Arb2Way = () => {
  const [o1,setO1]=useState("+110"),[o2,setO2]=useState("+105"),[t,setT]=useState("500");
  const r = useMemo(()=>calcArb2(o1,o2,parseFloat(t)),[o1,o2,t]);
  return (<div><div style={S.card}><Tl t="2-Way Arbitrage" badge="SUREBET" bc={K.pp}/>
    <div style={S.row}><In l="Outcome 1 (Book A)" v={o1} set={setO1}/><In l="Outcome 2 (Book B)" v={o2} set={setO2}/><In l="Total Stake" v={t} set={setT} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?`ARB: +$${r.pr}`:"NO ARB"}</span>
      {r.ok&&<><RR l="Stake Side 1" v={`$${r.s1}`} c={K.ac} b/><RR l="Stake Side 2" v={`$${r.s2}`} c={K.ac} b/><RR l="ROI" v={`${r.roi}%`} c={K.gn}/></>}
      {!r.ok&&<Nt c={K.rd}>No arb exists. Both sides need + odds at different books. Typical arb margins are 1-5%. Use OddsJam or BetBurger to scan automatically.</Nt>}</div>}
  </div>
  <Help entries={[
    ["Arbitrage","Betting both sides of the same event at different sportsbooks where the combined odds guarantee a profit. It works because different books set different odds. When the gap is big enough, you can bet both sides and win no matter what."],
    ["How to spot one","You need both sides to be + odds (or the implied probabilities to add up to LESS than 100%). Example: Book A has Team 1 at +110, Book B has Team 2 at +105. Each side implies ~48.8% and ~48.8% = 97.6% total. The missing 2.4% is your profit."],
    ["Why it's rare","Books monitor each other and adjust quickly. Arb opportunities last seconds to minutes. That's why people use scanning tools — humans can't check fast enough."],
  ]}/></div>);
};

const Arb3Way = () => {
  const [o1,setO1]=useState("+180"),[o2,setO2]=useState("+250"),[o3,setO3]=useState("+320"),[t,setT]=useState("500");
  const r = useMemo(()=>calcArb3(o1,o2,o3,parseFloat(t)),[o1,o2,o3,t]);
  return (<div><div style={S.card}><Tl t="3-Way Arbitrage" badge="SOCCER / HOCKEY" bc={K.pp}/>
    <div style={S.row}><In l="Home Win (Book A)" v={o1} set={setO1}/><In l="Draw (Book B)" v={o2} set={setO2}/><In l="Away Win (Book C)" v={o3} set={setO3}/><In l="Total Stake" v={t} set={setT} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?`ARB: +$${r.pr}`:"NO ARB"}</span>
      {r.ok&&<><RR l="Stake Home" v={`$${r.s1}`} c={K.ac} b/><RR l="Stake Draw" v={`$${r.s2}`} c={K.ac} b/><RR l="Stake Away" v={`$${r.s3}`} c={K.ac} b/><RR l="ROI" v={`${r.roi}%`} c={K.gn}/></>}</div>}
  </div>
  <Help entries={[
    ["3-Way Markets","Soccer and hockey (regulation time) have three possible outcomes: Home Win, Draw, Away Win. With three outcomes across multiple books, pricing inefficiencies are MORE common than 2-way markets because it's harder for books to price all three perfectly."],
    ["You need 3 sportsbooks","Each outcome should be at a different book for the best odds. Same-book arbs are essentially impossible due to correlated odds."],
  ]}/></div>);
};

const ParlayHedge = () => {
  const [pp,setPp]=useState("2500"),[ho,setHo]=useState("+150"),[os,setOs]=useState("25");
  const r = useMemo(()=>calcPH(parseFloat(pp),ho,parseFloat(os)),[pp,ho,os]);
  return (<div><div style={S.card}><Tl t="Parlay Hedge" badge="LAST LEG" bc={K.yl}/>
    <div style={S.row}><In l="Parlay Potential Payout" v={pp} set={setPp} pre="$"/><In l="Final Leg Opposing Odds" v={ho} set={setHo}/><In l="Original Parlay Stake" v={os} set={setOs} pre="$"/></div>
    {r&&<div style={S.res(true)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed minimum</span></div>
      <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b/><RR l="If Parlay Hits" v={`+$${r.pPW}`} c={K.gn}/><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn}/></div>}
  </div>
  <Help entries={[
    ["Parlay","A bet combining multiple games where ALL must win for the bet to pay out. High risk, high reward. A 6-leg parlay at +9000 turns $25 into $2,500 — but all 6 must hit."],
    ["The Last Leg Situation","You hit 5 of 6 legs. Your parlay now depends on one final game. Instead of sweating it, hedge the other side of that game at another book. You lock in profit regardless."],
    ["Potential Payout","This is the TOTAL amount you'd receive if the parlay hits (check your bet slip). Not the profit — the full payout including your original stake."],
  ]}/></div>);
};

const MiddleBet = () => {
  const [o1,setO1]=useState("-110"),[o2,setO2]=useState("-110"),[l1,setL1]=useState("220.5"),[l2,setL2]=useState("200.5"),[s,setS]=useState("100");
  const r = useMemo(()=>calcMid(o1,o2,l1,l2,parseFloat(s)),[o1,o2,l1,l2,s]);
  return (<div><div style={S.card}><Tl t="Middle Bet Calculator" badge="MIDDLE" bc={K.ac}/>
    <div style={S.row}><In l="Under Odds (Book A)" v={o1} set={setO1}/><In l="Line 1 (Under)" v={l1} set={setL1}/><In l="Over Odds (Book B)" v={o2} set={setO2}/><In l="Line 2 (Over)" v={l2} set={setL2}/></div>
    <div style={S.row}><In l="Stake (Side 1)" v={s} set={setS} pre="$"/></div>
    {r&&<div style={S.res(true)}><RR l="Side 2 Stake" v={`$${r.s2}`} c={K.ac} b/><RR l="Total Risked" v={`$${r.ts}`}/><RR l="Worst Case" v={`$${r.wc}`} c={parseFloat(r.wc)>=0?K.gn:K.rd}/><RR l="Middle Width" v={`${r.w} points`} c={K.pp}/><RR l="If Middle Hits (BOTH WIN)" v={`+$${r.mw}`} c={K.gn} b/></div>}
  </div>
  <Help entries={[
    ["Middle Bet","When two sportsbooks have DIFFERENT lines on the same game, you can bet opposite sides and potentially win BOTH if the result lands in the 'middle'. Example: Book A has passing yards Under 220.5, Book B has Over 200.5. If the player throws 210 yards, both bets win."],
    ["The Risk","If the result falls outside the middle, one side wins and one loses. With -110 juice, you'll lose about $5-$10 on a $100 stake. The middle itself might pay $180+. It's a risk/reward calculation."],
    ["Best for","Player props where books disagree by 5+ points. Total points/goals where books have 3+ point gaps. The wider the middle, the more likely it hits."],
  ]}/></div>);
};

const OddsConvert = () => {
  const [v,setV]=useState("-110"),[mode,setMode]=useState("american");
  const dec = mode==="american"?toD(v):mode==="decimal"?parseFloat(v):(()=>{const[n,d]=v.split("/").map(Number);return d?n/d+1:0;})();
  return (<div><div style={S.card}><Tl t="Odds Format Converter" badge="UTILITY" bc={K.dm}/>
    <div style={S.row}><div style={S.col}><label style={S.label}>Input Format</label><select style={S.input} value={mode} onChange={e=>setMode(e.target.value)}><option value="american">American (+/- odds)</option><option value="decimal">Decimal (e.g. 2.10)</option><option value="fractional">Fractional (e.g. 11/10)</option></select></div><In l="Enter Odds" v={v} set={setV}/></div>
    {dec>0&&<div style={{...S.res(true),display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,textAlign:"center"}}>
      {[["American",toA(dec),K.ac],["Decimal",f(dec,3),K.pp],["Fractional",toF(dec),K.yl],["Implied Prob",f(toP(dec),1)+"%",K.gn]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:10,color:K.mt,marginBottom:4}}>{l}</div><div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div></div>))}
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
  const [b,setB]=useState("500"),[m,setM]=useState("5"),[v,setV]=useState("4.5");
  const r = useMemo(()=>calcRO(b,m,v),[b,m,v]);
  return (<div><div style={S.card}><Tl t="Rollover / Playthrough Calculator" badge="DEPOSIT MATCH" bc={K.yl}/>
    <div style={S.row}><In l="Bonus Amount" v={b} set={setB} pre="$"/><In l="Rollover Multiplier" v={m} set={setM} ph="5"/><In l="Average Vig %" v={v} set={setV} ph="4.5"/></div>
    {r&&<div style={S.res(r.ok)}><RR l="Total You Must Wager" v={`$${r.tw}`} b/><RR l="Expected Cost (lost to vig)" v={`-$${r.ec}`} c={K.rd}/><RR l="Net Value of This Bonus" v={`${r.ok?"+":""}$${r.nv}`} c={r.ok?K.gn:K.rd} b/><RR l="Approximate Bets Needed (~$50 avg)" v={r.nb}/>
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"Worth clearing. The bonus exceeds vig cost.":"Warning: Vig cost exceeds bonus. Lower-vig markets or skip."}</Nt></div>}
  </div>
  <Help entries={[
    ["Rollover / Playthrough","Some deposit match bonuses require you to wager a certain multiple of the bonus before you can withdraw it. A '5x playthrough' on a $500 bonus means you must bet $2,500 total before the bonus becomes real cash."],
    ["Vig Cost","Every bet you place loses a tiny amount to the sportsbook's margin (the vig). At a standard 4.5% vig, betting $2,500 total costs you about $112.50. If the bonus is $500, the net value is $500 - $112.50 = $387.50."],
    ["When to skip","If the rollover multiplier is 10x or higher, or if the vig on the required markets is above 6%, the bonus might not be worth clearing. This calculator tells you the break-even point."],
    ["How to minimize vig cost","Bet on low-vig markets: NFL/NBA spreads and totals at -110/-110 (4.5% vig). Avoid player props (8-12% vig) and parlays (compounded vig). Just bet normally on main markets until the rollover is cleared."],
  ]}/></div>);
};

// ═══ TRACKER ═══
const Tracker = () => {
  const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3'))||{}; } catch { return {}; } });
  useEffect(() => { loadData().then(d => setData(d)); }, []);
  const done = data.done || {};
  const profits = data.profits || {};
  const toggle = n => { const d = {...data, done:{...done,[n]:!done[n]}}; setData(d); saveData(d); };
  const setP = (n, v) => { const d = {...data, profits:{...profits,[n]:v}}; setData(d); saveData(d); };
  const total = Object.values(profits).reduce((s,v)=>s+(parseFloat(v)||0),0);
  const cnt = Object.values(done).filter(Boolean).length;
  return (<div style={S.card}><Tl t="Sportsbook Promo Tracker"/>
    <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>EXTRACTED</div><div style={S.big(K.gn)}>${f(total)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>COMPLETED</div><div style={S.big(K.ac)}>{cnt}/{BOOKS.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>REMAINING</div><div style={S.big(K.yl)}>~${f(BOOKS.filter(b=>!done[b.name]).reduce((s,b)=>s+b.bonus*0.7,0),0)}</div></div>
    </div>
    <Nt c={K.ac}>Your tracker syncs across all your devices. Data also saves locally as a backup.</Nt>
    <div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["","Book","Promo","Value","Daily Promos","Profit",""].map(h=><th key={h} style={{textAlign:"left",padding:"8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px"}}>{h}</th>)}</tr></thead>
        <tbody>{BOOKS.map(b=><tr key={b.name} style={{opacity:done[b.name]?0.4:1}}>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><div role="checkbox" aria-checked={!!done[b.name]} aria-label={`Mark ${b.name} as completed`} tabIndex={0} onClick={()=>toggle(b.name)} onKeyDown={e=>(e.key===" "||e.key==="Enter")&&toggle(b.name)} style={{width:16,height:16,borderRadius:3,border:`2px solid ${done[b.name]?K.gn:K.bd2}`,background:done[b.name]?K.gn:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none"}} onFocus={e=>e.currentTarget.style.boxShadow=`0 0 0 2px ${K.gn}55`} onBlur={e=>e.currentTarget.style.boxShadow="none"}>{done[b.name]&&<span style={{color:K.bg,fontSize:10,fontWeight:700}}>✓</span>}</div></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{b.name}<span style={{...S.tag(K.ac),marginLeft:6}}>{b.type}</span></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:200}}>{b.detail}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600,whiteSpace:"nowrap"}}>{b.value}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontSize:11,color:K.dm,maxWidth:180}}>{b.recurring}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...S.input,width:80,padding:"5px 8px"}} placeholder="$0" value={profits[b.name]||""} onChange={e=>setP(b.name,e.target.value)}/></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap"}}>
            <a href={b.link} target="_blank" rel="noopener noreferrer sponsored" style={{display:"inline-block",padding:"5px 12px",background:K.gn,color:K.bg,borderRadius:5,fontSize:11,fontWeight:700,textDecoration:"none",opacity:done[b.name]?0.4:1}}>Sign Up →</a>
          </td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>);
};

// ═══ LEDGER ═══
const Ledger = () => {
  const [data, setData] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3'))||{}; } catch { return {}; } });
  useEffect(() => { loadData().then(d => setData(d)); }, []);
  const entries = data.ledger || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",type:"Bonus Conversion",bonus:"",hedge:"",profit:"",notes:""});
  const save = (newEntries) => { const d = {...data, ledger: newEntries}; setData(d); saveData(d); };
  const add = () => { if(!form.profit) return; save([{...form,id:Date.now()},...entries]); setForm(f=>({...f,bonus:"",hedge:"",profit:"",notes:""})); onLedgerEntry(); };
  const del = id => save(entries.filter(e=>e.id!==id));
  const total = entries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const exportCSV = () => {
    const headers = ["Date","Book","Type","Bonus","Hedge","Profit","Notes"];
    const rows = entries.map(e=>[e.date,e.book,e.type,e.bonus||"",e.hedge||"",e.profit,e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`promogrind-ledger-${new Date().toISOString().split("T")[0]}.csv`});
    a.click(); URL.revokeObjectURL(a.href);
  };
  return (<div style={S.card}><Tl t="Profit & Loss Ledger" badge="CLOUD SYNC" bc={K.gn}/>
    <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(total>=0?K.gn:K.rd)}>${f(total)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>ENTRIES</div><div style={S.big(K.ac)}>{entries.length}</div></div>
      {entries.length>0&&<button onClick={exportCSV} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↓ Export CSV</button>}
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:160}}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <In l="Bonus $" v={form.bonus} set={v=>setForm(f=>({...f,bonus:v}))} pre="$"/>
      <In l="Hedge $" v={form.hedge} set={v=>setForm(f=>({...f,hedge:v}))} pre="$"/>
      <In l="Net Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$"/>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    <Nt c={K.yl}>Keep records for taxes. All gambling winnings are taxable income. This ledger saves to your browser — export periodically.</Nt>
    {entries.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Type","Bonus","Hedge","Profit",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{entries.map(e=><tr key={e.id}>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.bonus?`$${e.bonus}`:"—"}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.hedge?`$${e.hedge}`:"—"}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(e.profit)>=0?K.gn:K.rd,fontWeight:600}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</td>
          <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>✕</span></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>);
};

// ═══ KNOWLEDGE BASE ═══
const KB = () => (<div style={S.card}>
  <Tl t="Complete Knowledge Base"/>
  <div style={{fontSize:13,lineHeight:1.8,color:K.dm}}>

    <div style={{...S.tag(K.gn),marginBottom:12,fontSize:12}}>START HERE IF YOU'RE NEW</div>

    <div style={S.helpH}>What Is This Tool?</div>
    <p>This is a math calculator for sports betting promotions. Sportsbooks (like DraftKings, FanDuel, BetMGM) give away free money through promotions to attract new customers. This tool calculates exactly how to turn those promotions into guaranteed cash — no sports knowledge needed, no gambling involved.</p>

    <div style={S.helpH}>Is This Legal?</div>
    <p>Yes. Matched betting and promo conversion are completely legal in every US state where online sports betting is legal (30+ states). This tool is a calculator — like a mortgage calculator or tax calculator. It doesn't place bets, access any sportsbook, or handle money. Companies like ProfitDuel, OddsJam, and DarkHorse Odds charge $49-$99/month for similar tools. This one is free. You can share it with anyone.</p>

    <div style={S.helpH}>How Much Can I Make?</div>
    <p>Welcome promos (one-time, across 8-10 books): $1,000-$2,500. Daily profit boosts (recurring, 15 min/day): $300-$1,000/month. These are realistic numbers based on current sportsbook promos. This is a side hustle, not a get-rich-quick scheme.</p>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>GLOSSARY — EVERY TERM EXPLAINED</div>

    <div style={S.helpH}>Odds Formats</div>
    <p><span style={S.helpTerm}>American Odds (+/-)</span> — The standard US format. <strong>Positive (+200)</strong>: how much you WIN on a $100 bet. +200 means bet $100, win $200 profit. <strong>Negative (-150)</strong>: how much you must BET to win $100. -150 means bet $150 to win $100 profit. The bigger the + number, the less likely the outcome. The bigger the - number, the more likely.</p>
    <p><span style={S.helpTerm}>Decimal Odds (2.50)</span> — Your total return per $1. Decimal 2.50 means bet $1, get $2.50 back ($1.50 profit + $1 stake). Used in Europe.</p>
    <p><span style={S.helpTerm}>Implied Probability</span> — What the odds suggest about the chance of winning. -200 odds = 66.7% chance. +200 odds = 33.3% chance. Important: because of the vig, implied probabilities from a sportsbook always add up to MORE than 100%.</p>

    <div style={S.helpH}>Key Betting Terms</div>
    <p><span style={S.helpTerm}>Vig (Vigorish) / Juice</span> — The sportsbook's built-in profit margin on every bet. Think of it as a service fee. Standard vig is about 4.5%. This is why a "fair" coin flip isn't +100/+100 — it's -110/-110. That extra $10 you have to risk on each side is the vig. The sportsbook collects it regardless of who wins.</p>
    <p><span style={S.helpTerm}>Moneyline</span> — A bet on which team wins. No point spread. Just pick the winner. Example: Chiefs -200 / Bills +170. Bet the Chiefs at -200 = bet $200 to win $100. Bet the Bills at +170 = bet $100 to win $170.</p>
    <p><span style={S.helpTerm}>Spread</span> — A bet on the margin of victory. Chiefs -3.5 means they must win by 4+ points for your bet to win. Bills +3.5 means they can lose by up to 3 points and you still win.</p>
    <p><span style={S.helpTerm}>Total (Over/Under)</span> — A bet on the combined score of both teams. Over 47.5 means both teams must score 48+ combined points. Under means 47 or fewer.</p>
    <p><span style={S.helpTerm}>Parlay</span> — Combining multiple bets into one. ALL legs must win for the parlay to pay. Higher potential payout, higher risk. A 4-leg parlay might pay +1000 but all 4 must hit.</p>
    <p><span style={S.helpTerm}>Player Props</span> — Bets on individual player stats. "Patrick Mahomes Over 275.5 passing yards" is a player prop. These are where middle bet opportunities are most common because books often disagree on player lines.</p>

    <div style={S.helpH}>Promo Types</div>
    <p><span style={S.helpTerm}>Bonus Bet / Free Bet</span> — A bet credit from the sportsbook. If it wins, you get the PROFIT only — the bonus credit disappears. A $200 bonus bet at +300 that wins pays you $600 (not $800). The stake is NOT returned. This is the most important thing to understand for conversions.</p>
    <p><span style={S.helpTerm}>Profit Boost</span> — A percentage increase on your winnings. A 50% profit boost on a bet that would normally win $100 now wins $150. You're using your OWN money — the boost just increases the payout. These are recurring (daily) and are the long-term income source.</p>
    <p><span style={S.helpTerm}>First Bet Safety Net</span> — Your first cash bet at a book is "insured." If it loses, you get the amount back as bonus bets. BetMGM offers up to $1,500, bet365 up to $1,000. This is the highest-value welcome promo type.</p>
    <p><span style={S.helpTerm}>Deposit Match</span> — The sportsbook matches a percentage of your deposit with bonus funds. A "20% match up to $1,000" means deposit $5,000, get $1,000 in bonus funds. Usually comes with rollover requirements.</p>
    <p><span style={S.helpTerm}>Rollover / Playthrough</span> — The amount you must wager before bonus funds become withdrawable cash. A 5x rollover on $500 means you must place $2,500 in total bets. Each bet costs you a tiny amount (the vig), so the true value of the bonus is less than face value.</p>

    <div style={S.helpH}>Strategy Terms</div>
    <p><span style={S.helpTerm}>Hedge</span> — Placing a second bet on the opposite outcome to guarantee profit (or limit loss) regardless of who wins. Always at a DIFFERENT sportsbook from your original bet.</p>
    <p><span style={S.helpTerm}>Arbitrage (Arb)</span> — Betting both sides of an event at different books where the combined odds guarantee profit. Requires both sides to be priced favorably at different books simultaneously.</p>
    <p><span style={S.helpTerm}>+EV (Positive Expected Value)</span> — A bet where the true probability of winning is higher than the odds suggest. Over many such bets, you profit. Unlike arbing, individual +EV bets can lose — the edge plays out over volume.</p>
    <p><span style={S.helpTerm}>Conversion Rate</span> — The percentage of a bonus bet you extract as real cash. 70%+ is excellent. A $200 bonus at 75% conversion = $150 real cash in your pocket.</p>
    <p><span style={S.helpTerm}>Middle</span> — Betting opposite sides at different lines where both bets can win if the result lands in the gap between the lines.</p>
    <p><span style={S.helpTerm}>Closing Line Value (CLV)</span> — Whether the odds you bet at were better than the final odds when the game starts. Consistently beating the closing line is the strongest indicator of long-term profitability.</p>
    <p><span style={S.helpTerm}>Getting Limited / Promo Banned</span> — Sportsbooks can reduce your maximum bet size or exclude you from promotions if they suspect you're purely converting promos. To avoid this: place some small "normal" bets, don't withdraw too often, stick to main lines, and vary your bet amounts.</p>

    <div style={{...S.tag(K.yl),marginBottom:12,marginTop:24,fontSize:12}}>STEP-BY-STEP WALKTHROUGH</div>

    <div style={S.helpH}>Phase 1: Setup (Day 1-3)</div>
    <p>1) Download 6-10 sportsbook apps (DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers). 2) Create an account at each — you'll need your SSN and ID for verification. 3) Deposit the minimum required at each ($5-$10). 4) Do NOT place any bets yet. Get all accounts funded first so you can move fast when hedging.</p>

    <div style={S.helpH}>Phase 2: Welcome Promos (Day 3-14)</div>
    <p>Start with "Safety Net" books (BetMGM, bet365, BetRivers). Use the First Bet Hedge calculator. Place your qualifying bet and IMMEDIATELY hedge at another book. Win = profit from hedge. Lose = get bonus bets back, which you convert in Phase 3. Then do the "Bet & Get" books (DraftKings, FanDuel, Fanatics, ESPN BET). These give bonus bets after a small qualifying wager.</p>

    <div style={S.helpH}>Phase 3: Convert Everything (Day 7-14)</div>
    <p>Use the Bonus Bet Converter for every bonus bet you've accumulated. Place each bonus on an underdog (+250 to +400 odds), hedge the other side at a different book. Target 70%+ conversion rate. Log every conversion in the P/L Ledger.</p>

    <div style={S.helpH}>Phase 4: Daily Profit Boosts (Ongoing)</div>
    <p>After welcome promos are done, check your sportsbook apps each morning for profit boosts. Use the Profit Boost Converter. DraftKings, FanDuel, and Caesars offer 2-5 boosts daily. At $5-$15 per conversion, that's $300-$1,000/month. This is 15-20 minutes of work per day.</p>

    <div style={S.helpH}>Phase 5: Advanced — +EV Betting (Optional)</div>
    <p>Use the No-Vig calculator to find true probabilities. Compare against sportsbook odds with the +EV calculator. Unlike hedging/arbing, +EV betting involves risk per bet but is profitable over hundreds of bets. Track your Closing Line Value to verify you have an edge.</p>

    <div style={{...S.tag(K.rd),marginBottom:12,marginTop:24,fontSize:12}}>IMPORTANT WARNINGS</div>
    <p><strong>This is not gambling advice.</strong> This is a math education tool. You must be 21+ in most states. Only bet where sports betting is legal in your state. All winnings are taxable — keep records. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
    <p><strong>Account longevity:</strong> 1) Never hedge at the same sportsbook. 2) Place some small "recreational" bets between conversions. 3) Don't withdraw too frequently. 4) Stick to main lines (moneyline, spread, totals) — player props get you limited faster. 5) Vary your bet amounts (don't always bet round numbers).</p>
  </div>
</div>);

// ═══ TAB SYSTEM ═══
// ═══ LIVE SCANNER (Pro) ═══
const SPORTS_LIST = [
  { key:"americanfootball_nfl",  label:"NFL"  },
  { key:"basketball_nba",        label:"NBA"  },
  { key:"baseball_mlb",          label:"MLB"  },
  { key:"icehockey_nhl",         label:"NHL"  },
  { key:"americanfootball_ncaaf",label:"NCAAF"},
  { key:"soccer_usa_mls",        label:"MLS"  },
];

const detectArbs = (games) => {
  const opps = [];
  for (const game of games) {
    const best = {};
    for (const bm of (game.bookmakers||[])) {
      for (const mkt of (bm.markets||[])) {
        if (mkt.key!=="h2h") continue;
        for (const o of mkt.outcomes) {
          if (!best[o.name] || o.price > best[o.name].price) best[o.name] = { price:o.price, book:bm.title };
        }
      }
    }
    const entries = Object.entries(best);
    if (entries.length!==2) continue;
    const [[n1,l1],[n2,l2]] = entries;
    const d1=toD(l1.price), d2=toD(l2.price);
    if (d1<=1||d2<=1) continue;
    const margin=1/d1+1/d2;
    if (margin<1) {
      const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
      opps.push({ game:`${game.home_team} vs ${game.away_team}`, sport:game.sport_title,
        start:game.commence_time, n1, b1:l1.book, p1:l1.price, n2, b2:l2.book, p2:l2.price,
        s1, s2, roi:f((1-margin)*100,2) });
    }
  }
  return opps.sort((a,b)=>parseFloat(b.roi)-parseFloat(a.roi));
};

const detectEV = (games) => {
  const opps = [], seen = new Set();
  for (const game of games) {
    for (const bm of (game.bookmakers||[])) {
      for (const mkt of (bm.markets||[])) {
        if (mkt.key!=="h2h") continue;
        for (const outcome of mkt.outcomes) {
          const allPrices = (game.bookmakers||[])
            .map(b=>b.markets?.find(m=>m.key==="h2h")?.outcomes?.find(o=>o.name===outcome.name)?.price)
            .filter(Boolean).map(toD).filter(d=>d>1);
          if (allPrices.length<2) continue;
          const avgProb = allPrices.reduce((s,d)=>s+1/d,0)/allPrices.length;
          const bd=toD(outcome.price); if(bd<=1) continue;
          const ev=(avgProb*(bd-1)-(1-avgProb))*100;
          const key=`${game.id}-${outcome.name}-${bm.title}`;
          if (ev>2&&!seen.has(key)) { seen.add(key);
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, sport:game.sport_title,
              start:game.commence_time, outcome:outcome.name, book:bm.title, price:outcome.price,
              fairPct:f(avgProb*100,1), bookPct:f(100/bd,1), ev:f(ev,1) });
          }
        }
      }
    }
  }
  return opps.sort((a,b)=>parseFloat(b.ev)-parseFloat(a.ev)).slice(0,30);
};

const LiveScanner = ({ proStatus, mode }) => {
  const [sport, setSport] = useState("americanfootball_nfl");
  const [activeTab, setActiveTab] = useState(mode==="ev-scanner"?"ev":"arb");
  const [games, setGames] = useState([]);
  const [arbs, setArbs] = useState([]);
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const intervalRef = useRef(null);
  const isActive = proStatus?.status==="active";

  const fetchOdds = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/odds?sport=${sport}&markets=h2h`;
      const resp = await fetch(url, { headers:{ Authorization:`Bearer ${session.access_token}` } });
      if (!resp.ok) { const e=await resp.json(); throw new Error(e.error||`HTTP ${resp.status}`); }
      const data = await resp.json();
      setGames(data); setArbs(detectArbs(data)); setEvs(detectEV(data)); setUpdated(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    if(!isActive) return;
    fetchOdds();
    intervalRef.current=setInterval(fetchOdds,120_000);
    return ()=>clearInterval(intervalRef.current);
  },[sport,isActive]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    await startCheckout();
    setUpgrading(false);
  };

  if (proStatus===null) return (
    <div style={{...S.card,textAlign:"center",padding:40}}>
      <div style={{color:K.mt,fontSize:11,letterSpacing:"2px",textTransform:"uppercase"}}>Loading...</div>
    </div>
  );

  if (!isActive) return (
    <div style={S.card}>
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{...S.tag(K.yl),fontSize:12,marginBottom:16,display:"inline-block"}}>PRO MEMBERS ONLY</div>
        <div style={{fontFamily:fontD,fontSize:22,fontWeight:700,color:K.tx,marginBottom:8}}>Live Odds Scanner</div>
        <div style={{fontSize:13,color:K.dm,maxWidth:440,margin:"0 auto 24px",lineHeight:1.7}}>
          Real-time arb and +EV opportunities across every major US sportsbook, updated every 2 minutes. Finds what competitors charge $99–$199/month to show you.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,maxWidth:400,margin:"0 auto 28px",textAlign:"left"}}>
          {[["Live Arb Scanner","Auto-detects 2-way arbs across all books"],["+ EV Scanner","Finds where books are mispriced vs fair value"],["Auto-Refresh","Updates every 2 min — never miss an opportunity"],["All Major Sports","NFL, NBA, MLB, NHL, NCAAF, MLS and more"]].map(([t,d])=>(
            <div key={t} style={{padding:"10px 12px",background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
              <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:2}}>{t}</div>
              <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <button onClick={handleUpgrade} disabled={upgrading} style={{padding:"12px 28px",background:K.yl,border:"none",borderRadius:8,color:K.bg,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:fontD,opacity:upgrading?0.7:1}}>
            {upgrading?"Redirecting to checkout…":"Upgrade to Pro — $29/month"}
          </button>
        </div>
        <div style={{fontSize:11,color:K.mt}}>Cancel anytime. Free calculators always free.</div>
      </div>
    </div>
  );

  const results = activeTab==="arb" ? arbs : evs;

  return (
    <div style={S.card}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:K.tx}}>Live Scanner</div>
        <span style={S.tag(K.yl)}>PRO</span>
        <select style={{...S.input,width:100,padding:"5px 8px",fontSize:11}} value={sport} onChange={e=>setSport(e.target.value)}>
          {SPORTS_LIST.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div style={{display:"flex",gap:0,marginLeft:"auto"}}>
          {["arb","+ev"].map(t=>(
            <button key={t} onClick={()=>setActiveTab(t==="arb"?"arb":"ev")} style={{padding:"5px 12px",fontSize:11,fontWeight:600,border:`1px solid ${K.bd2}`,background:activeTab===(t==="arb"?"arb":"ev")?K.ac:"transparent",color:activeTab===(t==="arb"?"arb":"ev")?K.bg:K.dm,cursor:"pointer",fontFamily:font,borderRadius:t==="arb"?"6px 0 0 6px":"0 6px 6px 0"}}>
              {t==="arb"?"Arb":"+ EV"}
            </button>
          ))}
        </div>
        <button onClick={fetchOdds} disabled={loading} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font}}>
          {loading?"…":"↻"}
        </button>
      </div>
      {updated&&<div style={{fontSize:10,color:K.mt,marginBottom:8}}>Updated {updated.toLocaleTimeString()} · Auto-refreshes every 2 min</div>}
      {error&&<div style={{...S.res(false),marginBottom:12,fontSize:12}}>{error}</div>}
      {loading&&!results.length&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Scanning live odds…</div>}
      {!loading&&!error&&results.length===0&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>No {activeTab==="arb"?"arb opportunities":"+ EV spots"} found right now — try another sport or check back in a few minutes.</div>}
      {results.map((r,i)=>(
        activeTab==="arb"
          ? <div key={i} style={{...S.res(true),marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>
                <span style={{...S.tag(K.gn),fontSize:12}}>+{r.roi}% ROI</span>
              </div>
              <div style={{fontSize:11,color:K.mt,marginBottom:10}}>{r.sport} · {new Date(r.start).toLocaleDateString()}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[[r.n1,r.b1,r.p1,r.s1],[r.n2,r.b2,r.p2,r.s2]].map(([name,book,price,stake])=>(
                  <div key={name} style={{padding:"8px 10px",background:K.s3,borderRadius:6}}>
                    <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>{name}</div>
                    <div style={{fontSize:13,fontWeight:700,color:K.ac}}>{price>0?"+":""}{price}</div>
                    <div style={{fontSize:11,color:K.dm}}>{book}</div>
                    <div style={{fontSize:11,color:K.gn,fontWeight:600}}>Stake ${stake} of $100</div>
                  </div>
                ))}
              </div>
            </div>
          : <div key={i} style={{...S.res(true),marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>
                <div style={{fontSize:11,color:K.dm,marginTop:2}}>{r.outcome} · {r.book} · {r.price>0?"+":""}{r.price}</div>
                <div style={{fontSize:10,color:K.mt}}>{r.sport} · {new Date(r.start).toLocaleDateString()}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{...S.big(K.gn),fontSize:20}}>+{r.ev}% EV</div>
                <div style={{fontSize:10,color:K.mt}}>Fair: {r.fairPct}% · Book: {r.bookPct}%</div>
              </div>
            </div>
      ))}
    </div>
  );
};

const TABS = [
  { group:"Convert", items:[
    {n:"Bonus Bet",slug:"bonus-bet",c:BonusBet},
    {n:"Profit Boost",slug:"profit-boost",c:ProfitBoost},
    {n:"First Bet",slug:"first-bet",c:FirstBet},
  ]},
  { group:"Calculate", items:[
    {n:"No-Vig",slug:"no-vig",c:NoVig},
    {n:"+EV",slug:"ev",c:PlusEV},
    {n:"2-Way Arb",slug:"arb-2way",c:Arb2Way},
    {n:"3-Way Arb",slug:"arb-3way",c:Arb3Way},
    {n:"Parlay Hedge",slug:"parlay-hedge",c:ParlayHedge},
    {n:"Middle",slug:"middle",c:MiddleBet},
    {n:"Odds Convert",slug:"odds-convert",c:OddsConvert},
    {n:"Rollover",slug:"rollover",c:RolloverCalc},
  ]},
  { group:"Track", items:[
    {n:"Sportsbooks",slug:"sportsbooks",c:Tracker},
    {n:"P/L Ledger",slug:"ledger",c:Ledger},
  ]},
  { group:"Live", items:[
    {n:"Arb Scanner",slug:"arb-scanner",c:LiveScanner,pro:true},
    {n:"+EV Scanner",slug:"ev-scanner",c:LiveScanner,pro:true},
  ]},
  { group:"Learn", items:[
    {n:"Knowledge Base",slug:"knowledge-base",c:KB},
  ]},
];

const DEFAULT_SLUG = "bonus-bet";
const slugMap = {};
TABS.forEach((g,gi)=>g.items.forEach((item,ti)=>{slugMap[item.slug]={gi,ti};}));

// ═══ FOOTER ═══
const Footer = () => (
  <div style={{borderTop:`1px solid ${K.bd}`,padding:"28px 20px",marginTop:8}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Affiliate Disclosure:</span> Some links on this page are affiliate links. If you sign up at a sportsbook through these links, we may earn a commission at no extra cost to you. This does not influence our calculator results or editorial content.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        Must be 21+ (18+ in some states). Sports betting available only where legal. Gambling winnings are taxable income. This is an educational math tool — not gambling advice. If you or someone you know has a gambling problem, call <span style={{color:K.rd,fontWeight:600}}>1-800-GAMBLER</span>.
      </p>
      <p style={{fontSize:10,color:K.bd2,marginTop:12}}>
        © {new Date().getFullYear()} VaultSpark Studios · PromoGrind is a free educational calculator tool.
      </p>
    </div>
  </div>
);

// ═══ MAIN APP ═══
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [proStatus, setProStatus] = useState(null);
  const prevSlugRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auth + subscription load
  useEffect(() => {
    checkAuth().then(async ok => {
      if (ok) {
        setAuthReady(true);
        onDailyLogin();
        getSubscription().then(setProStatus);
      }
    });
  }, []);

  const slug = pathname.replace(/^\/+/, "") || DEFAULT_SLUG;
  const { gi=0, ti=0 } = slugMap[slug] || slugMap[DEFAULT_SLUG];
  const g = TABS[gi];
  const item = g.items[ti];
  const Comp = item?.c || (() => null);
  const isLiveTool = !!item?.pro;

  // Fire vault calc event on tab navigation (Convert + Calculate groups)
  useEffect(() => {
    if (!authReady || slug === prevSlugRef.current) return;
    prevSlugRef.current = slug;
    if (gi === 0 || gi === 1) onCalculation(slug);
  }, [slug, authReady, gi]);

  const goTo = (newGi, newTi) => navigate("/" + TABS[newGi].items[newTi].slug);

  if (!authReady) {
    return (
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",color:K.mt}}>
          <div style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase"}}>Checking Vault access...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh"}}>
      <div style={{background:`linear-gradient(135deg,${K.s1},${K.s2})`,borderBottom:`1px solid ${K.bd}`,padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{cursor:"pointer"}} onClick={()=>navigate("/"+DEFAULT_SLUG)}>
            <div style={{fontFamily:fontD,fontSize:20,fontWeight:700,color:K.gn}}>PROMOGRIND</div>
            <div style={{fontSize:10,color:K.mt,letterSpacing:"2px",textTransform:"uppercase",marginTop:2}}>Free Sportsbook Promo Conversion Tools</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {proStatus?.status === "active" && (
              <div style={{fontSize:10,fontWeight:700,color:K.pp,background:`${K.pp}15`,padding:"3px 10px",borderRadius:50,letterSpacing:"1px"}}>PRO</div>
            )}
            <div style={{fontSize:10,color:K.mt,textAlign:"right",lineHeight:1.6}}>Free educational tool. Not gambling advice.<br/>21+ only. Gamble responsibly. 1-800-GAMBLER</div>
          </div>
        </div>
      </div>
      <div style={{background:K.s1,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto"}}>
        <div style={{display:"flex",maxWidth:1100,width:"100%"}}>{TABS.map((t,i)=>(
          <button key={t.group} onClick={()=>goTo(i,0)} style={{padding:"11px 18px",fontSize:11,fontWeight:gi===i?700:400,color:gi===i?K.gn:K.mt,background:gi===i?`${K.gn}08`:"transparent",border:"none",borderBottom:gi===i?`2px solid ${K.gn}`:"2px solid transparent",cursor:"pointer",fontFamily:font,textTransform:"uppercase",letterSpacing:"1px"}}>{t.group}</button>
        ))}</div>
      </div>
      <div style={{background:K.s2,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto"}}>
        <div style={{display:"flex",maxWidth:1100,width:"100%",gap:2}}>{g.items.map((t,i)=>(
          <button key={t.n} onClick={()=>goTo(gi,i)} style={{padding:"9px 14px",fontSize:11,fontWeight:ti===i?600:400,color:ti===i?K.ac:K.dm,background:"transparent",border:"none",borderBottom:ti===i?`2px solid ${K.ac}`:"2px solid transparent",cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>{t.n}</button>
        ))}</div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>
        {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
      </div>
      <Footer/>
    </div>
  );
}
