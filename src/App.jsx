import React, { useState, useMemo, useEffect, useRef, Component, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BOOKS, getBookUrl } from "./books.js";
import { tryAuth, getSubscription, startCheckout, startTrial, supabase } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, onDailyLogin, readSyncDiagnostics, triggerQueueFlush } from "./sync.js";
import { flagCalcUsed } from "./lib/missions.js";
import { subscribeToPush, enableDailyBriefPush, disableDailyBriefPush, isDailyBriefEnabled } from "./sw-register.js";
import { toD, toA, toP, toF, f, calcROI, downloadFile, bestOdds, calcBonus, calcFirst, calcBoost, calcArb2, calcArb3, calcNV, calcNV3, calcEV, calcPH, calcMid, calcRO, calcDeposit, calcKelly, calcInsurance, calcTeaser, calcRR, calcParlay, calcSGP, calcHold, sensitivityBonus, sensitivityBoost, sensitivityFirst, KD, KL, K, font, fontD } from "./lib/shared.js";
import { computeStreak } from "./lib/streaks.js";
import SensitivityChip from "./components/SensitivityChip.jsx";
import { usePromoAppShell } from "./app/usePromoAppShell.js";
import { CANONICAL_APP_URL, FEATURE_FLAGS, getProjectAuthHref, getProjectAuthMode } from "./launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick, trackFeatureGateSeen, trackLaunchEvent } from "./launchTelemetry.js";
import { trackEvent, trackPage, identifyUser } from "./analytics.js";
import { ToastCtx, useToast, ToastProvider, AppDataCtx, CompactCtx, FX, CurrencyCtx } from "./contexts.jsx";
import { S, In, RR, Tl, Nt, FeatureUnavailableCard, useCalcMemory, shouldShowTrigger, dismissTrigger, Help, LoadingState } from "./ui.jsx";
import { PROMO_SCHED, DAYS_ORDER } from "./data/promoSchedule.js";
import { getDashboardSnapshot } from "./dashboard/today.js";
import ResultFeedbackCard from "./components/ResultFeedbackCard.jsx";
import CalculatorTrustBadge from "./components/CalculatorTrustBadge.jsx";
// Heavy tab components â€” lazy loaded so they don't block initial render
const Tracker = lazy(() => import("./components/Tracker.jsx"));
const Ledger = lazy(() => import("./components/Ledger.jsx"));
const LiveScanner = lazy(() => import("./components/LiveScanner.jsx"));
const TaxesEstimatorWrapper = lazy(() => import("./components/TaxesEstimator.jsx"));
const AIActionPlan = lazy(() => import("./components/AIActionPlan.jsx").then(m => ({ default: m.AIActionPlan })));
const StackBuilder = lazy(() => import("./components/StackBuilder.jsx").then(m => ({ default: m.StackBuilder })));
const PricingPage = lazy(() => import("./components/PricingPage.jsx").then(m => ({ default: m.PricingPage })));
const PromoChat = lazy(() => import("./components/PromoChat.jsx"));
const PromoAdvisorPanel = lazy(() => import("./components/PromoAdvisorPanel.jsx").then(m => ({ default: m.PromoAdvisorPanel })));
const PromoIntakeRoute = lazy(() => import("./routes/PromoIntakeRoute.jsx"));
const LandingRoute = lazy(() => import("./routes/LandingRoute.jsx"));
const FeatureFlagAdmin = lazy(() => import("./components/FeatureFlagAdmin.jsx"));
const TrackInsights = lazy(() => import("./components/TrackInsights.jsx"));
const PromoWalkthrough = lazy(() => import("./components/PromoWalkthrough.jsx"));
const DailyBriefPage = lazy(() => import("./components/dashboard/DailyBriefPage.jsx"));
const LaunchCommandCenterPanel = lazy(() => import("./components/dashboard/LaunchCommandCenterPanel.jsx"));
const ActivationNextAction = lazy(() => import("./components/dashboard/ActivationNextAction.jsx"));
const DashboardHero = lazy(() => import("./components/dashboard/DashboardHero.jsx"));
const TodayDashboardPanel = lazy(() => import("./components/dashboard/TodayDashboardPanel.jsx"));
const CommunityPromoBoard = lazy(() => import("./components/CommunityPromoBoard.jsx"));
const CommunityWinsWall = lazy(() => import("./components/dashboard/CommunityWinsWall.jsx"));
const SmartPromoRecommender = lazy(() => import("./components/dashboard/SmartPromoRecommender.jsx"));
const DailyMissionsPanel = lazy(() => import("./components/dashboard/DailyMissionsPanel.jsx"));
const BonusBet = lazy(() => import("./calculators/BonusBet.jsx"));
const ProfitBoost = lazy(() => import("./calculators/ProfitBoost.jsx"));
const FirstBet = lazy(() => import("./calculators/FirstBet.jsx"));
const DepositMatch = lazy(() => import("./calculators/DepositMatch.jsx"));
const NoVig = lazy(() => import("./calculators/NoVig.jsx"));
const NoVig3Way = lazy(() => import("./calculators/NoVig3Way.jsx"));
const PlusEV = lazy(() => import("./calculators/PlusEV.jsx"));
const Arb2Way = lazy(() => import("./calculators/Arb2Way.jsx"));
const Arb3Way = lazy(() => import("./calculators/Arb3Way.jsx"));
const KellyCriterion = lazy(() => import("./calculators/KellyCriterion.jsx"));
const InsurancePromo = lazy(() => import("./calculators/InsurancePromo.jsx"));
const TeaserCalc = lazy(() => import("./calculators/TeaserCalc.jsx"));
const RoundRobinCalc = lazy(() => import("./calculators/RoundRobinCalc.jsx"));
const ParlayBuilder = lazy(() => import("./calculators/ParlayBuilder.jsx"));
const SGPEstimator = lazy(() => import("./calculators/SGPEstimator.jsx"));
const HoldCalc = lazy(() => import("./calculators/HoldCalc.jsx"));
const BetSizingAdvisor = lazy(() => import("./calculators/BetSizingAdvisor.jsx"));
const LineShop = lazy(() => import("./calculators/LineShop.jsx"));
const GetStartedRoute = lazy(() => import("./routes/HomeRoutes.jsx").then(m => ({ default: m.GetStartedRoute })));
const WhatsNewRoute = lazy(() => import("./routes/HomeRoutes.jsx").then(m => ({ default: m.WhatsNewRoute })));
const AboutRoute = lazy(() => import("./routes/HomeRoutes.jsx").then(m => ({ default: m.AboutRoute })));
import AgeGate, { isAgeVerified } from "./components/AgeGate.jsx";
import UserMenu from "./components/UserMenu.jsx";
import AuthDialog from "./components/AuthDialog.jsx";
import BookCTA from "./components/BookCTA.jsx";
import ShareCard from "./components/ShareCard.jsx";
import { getQuickCalcFallbackSlug } from "./workflows/actionGraph.js";

/*
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  PROMO ENGINE v3 â€” Complete Sportsbook Profit Extraction System
  
  LEGAL STATUS:
  This is an educational calculator tool â€” like a tax calculator 
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
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
*/

// Math, colors, styles from ./lib/shared.js â€” S (with JSX meter) from ./ui.jsx

// Toast, contexts, UI atoms, useCalcMemory, FeatureUnavailableCard â†’ ./contexts.jsx + ./ui.jsx

// â•â•â• BOOK CTA (shown at profitable calc results) â•â•â•
// promoType: "bonus"|"boost"|"safety"|"arb"|null â€” sorts most relevant books first
// Listens for checkout-unavailable events fired by auth.js when Stripe is in test mode
const CheckoutListener = () => {
  const toast = useToast();
  useEffect(()=>{
    const handler = () => toast && toast('Paid upgrades launching soon â€” stay tuned!');
    window.addEventListener('pg:checkout-unavailable', handler);
    return () => window.removeEventListener('pg:checkout-unavailable', handler);
  }, []);
  return null;
};

const TrustStrip = () => (
  <div style={{background:`${K.gn}08`,borderBottom:`1px solid ${K.bd}`,padding:"8px 20px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:14,flexWrap:"wrap",fontSize:10,color:K.dm,letterSpacing:"0.4px"}}>
      <span><strong style={{color:K.gn}}>Free PromoGrind account</strong> unlocks sync and access across all devices.</span>
      <span>Educational math only.</span>
      <span>21+ where legal.</span>
      <span>Not betting or financial advice.</span>
      <span>Gamble responsibly: 1-800-GAMBLER.</span>
    </div>
  </div>
);

const MembershipBanner = () => (
  <div style={{...S.note(K.ac),marginBottom:12}}>
    PromoGrind is free to use. Create a free account to unlock cloud sync, referrals, and access across devices â€” the same account works across all VaultSpark Studio tools.
  </div>
);

// FeatureUnavailableCard â†’ ./ui.jsx

// CommunityWinsWall, SmartPromoRecommender extracted to src/components/dashboard/

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOOL COMPONENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// BonusBet, ProfitBoost, FirstBet extracted to src/calculators/ (lazy-loaded above)
// BookCTA, ShareCard extracted to src/components/ (imported above)

// TeaserCalc, RoundRobinCalc, ParlayBuilder, SGPEstimator, HoldCalc, BetSizingAdvisor, LineShop extracted to src/calculators/

const BetTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const bets = data.bets || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",type:"Moneyline",odds:"+110",stake:"",toWin:"",status:"open",notes:""});
  const [showImport, setShowImport] = useState(false);
  const [showPasteSlip, setShowPasteSlip] = useState(false);
  const [slipText, setSlipText] = useState("");
  const [slipParsed, setSlipParsed] = useState(null);
  const calcToWin = (odds, stake) => { const d=toD(odds), s=parseFloat(stake); if(d<=1||!s) return ""; return f(s*(d-1)); };
  const save = (newBets) => syncAppData({...data, bets: newBets});
  const toast = useToast();
  const add = () => {
    if(!form.stake||!form.odds) return;
    const toWin = calcToWin(form.odds, form.stake);
    save([{...form,toWin,id:Date.now()},...bets]);
    setForm(f=>({...f,stake:"",odds:"+110",toWin:"",notes:""}));
    if(toast) toast('âœ“ Bet added');
  };
  const setStatus = (id, status) => save(bets.map(b=>b.id===id?{...b,status}:b));
  const del = id => { const snapshot=[...bets]; save(bets.filter(b=>b.id!==id)); if(toast) toast('Bet deleted',K.rd,{label:'UNDO',fn:()=>save(snapshot)}); };
  const exportBets = () => {
    const headers = ["Date","Book","Type","Odds","Stake","To Win","Status","Notes"];
    const rows = bets.map(e=>[e.date,e.book,e.type,e.odds,e.stake,e.toWin||"",e.status,e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-bets-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  };
  const betGrade = (bet) => {
    if(bet.status==="open"||bet.status==="void") return null;
    const d=toD(bet.odds);
    if(bet.status==="won"&&d>toD("+100")) return {g:"A",c:K.gn};
    if(bet.status==="won") return {g:"B",c:K.ac};
    if(bet.status==="lost"&&d>=toD("-110")) return {g:"C",c:K.yl};
    return {g:"D",c:K.rd};
  };
  const open = bets.filter(b=>b.status==="open");
  const atRisk = open.reduce((s,b)=>s+(parseFloat(b.stake)||0),0);
  const potentialWin = open.reduce((s,b)=>s+(parseFloat(b.toWin)||0),0);
  const settled = bets.filter(b=>b.status==="won"||b.status==="lost");
  const winRate = settled.length ? (bets.filter(b=>b.status==="won").length/settled.length*100) : null;
  const statusColor = {open:K.yl,won:K.gn,lost:K.rd,void:K.mt};
  return (<div style={S.card}><Tl t="Pending Bet Tracker" badge="OPEN BETS" bc={K.yl}/>
    <div style={{display:"flex",gap:20,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>OPEN BETS</div><div style={S.big(K.yl)}>{open.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>AT RISK</div><div style={S.big(K.rd)}>${f(atRisk)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>TO WIN</div><div style={S.big(K.gn)}>${f(potentialWin)}</div></div>
      {winRate!==null&&<div><div style={{fontSize:10,color:K.mt}}>WIN RATE</div><div style={S.big(winRate>=55?K.gn:winRate>=45?K.yl:K.rd,{fontSize:22})}>{f(winRate,1)}%</div><div style={{fontSize:9,color:K.mt}}>{settled.length} settled</div></div>}
      {open.length>0&&(()=>{
        const ev=open.reduce((s,b)=>{
          const d=toD(b.odds); if(d<=1) return s;
          const p=1/d;
          return s+(parseFloat(b.toWin)||0)*p-(parseFloat(b.stake)||0)*(1-p);
        },0);
        return <div><div style={{fontSize:10,color:K.mt}}>PORTFOLIO EV</div><div style={{...S.big(ev>=0?K.gn:K.rd),fontSize:22}}>{ev>=0?"+":""}${f(ev)}</div><div style={{fontSize:9,color:K.mt}}>book-implied</div></div>;
      })()}
      <button onClick={()=>setShowPasteSlip(s=>!s)} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>ðŸ“‹ Paste Slip</button>
      <button onClick={()=>setShowImport(true)} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>â†‘ Import CSV</button>
      {bets.length>0&&<button onClick={exportBets} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>â†“ Export CSV</button>}
      {showPasteSlip&&<div style={{width:"100%",marginTop:8,padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
        <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:8}}>Paste Bet Slip Text</div>
        <textarea style={{...S.input,height:80,resize:"vertical",marginBottom:8,fontSize:11}} value={slipText} onChange={e=>setSlipText(e.target.value)} placeholder="Paste bet slip text hereâ€¦&#10;e.g. DraftKings Â· Chiefs Moneyline Â· +150 Â· $50"/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{const p=parseBetSlip(slipText);setSlipParsed(p);}} style={{padding:"6px 14px",background:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11}}>Parse</button>
          {slipParsed&&<button onClick={()=>{setForm(prev=>({...prev,...slipParsed,toWin:slipParsed.stake&&slipParsed.odds?f((parseFloat(slipParsed.stake||0))*(toD(slipParsed.odds||"+100")-1)):""}));setShowPasteSlip(false);setSlipParsed(null);setSlipText("");}} style={{padding:"6px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11}}>Use Parsed Values</button>}
        </div>
        {slipParsed&&<div style={{fontSize:10,color:K.gn,marginTop:6}}>Parsed: {Object.entries(slipParsed).map(([k,v])=>`${k}=${v}`).join(", ")}</div>}
      </div>}
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Bet Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Moneyline","Spread","Total","Parlay","Prop","Bonus Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <In l="Odds" v={form.odds} set={v=>{setForm(f=>({...f,odds:v,toWin:calcToWin(v,f.stake)}));}} ph="+110"/>
      <In l="Stake" v={form.stake} set={v=>{setForm(f=>({...f,stake:v,toWin:calcToWin(f.odds,v)}));}} pre="$" ph="100"/>
      <In l="To Win (auto)" v={form.toWin} set={v=>setForm(f=>({...f,toWin:v}))} pre="$" ph="auto"/>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.yl,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {bets.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>ðŸ“‹</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No bets tracked yet</div>
      <div style={{fontSize:11,color:K.mt}}>Add your first pending bet above to track your open action.</div>
    </div>}
    {bets.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Type","Odds","Stake","To Win","Status","Grade",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{bets.map(e=>{const gr=betGrade(e);return(
          <tr key={e.id} style={{opacity:e.status==="void"?0.4:1}}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.pp,fontWeight:600}}>{e.odds}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>${e.stake}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{e.toWin?`$${e.toWin}`:"â€”"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
              <select value={e.status} onChange={ev=>setStatus(e.id,ev.target.value)} style={{...S.input,width:80,padding:"3px 6px",fontSize:10,color:statusColor[e.status]||K.tx}}>
                {["open","won","lost","void"].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{gr?<span style={S.tag(gr.c)}>{gr.g}</span>:<span style={{color:K.mt}}>â€”</span>}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>âœ•</span></td>
          </tr>
        );})}</tbody>
      </table>
    </div>}
    {showImport&&<CSVImportModal onImport={rows=>{save([...rows,...bets]); if(toast) toast(`âœ“ Imported ${rows.length} bets`,K.gn);}} onClose={()=>setShowImport(false)}/>}
  </div>);
};

// Tracker â†’ ./components/Tracker.jsx
// Ledger (+ ShareWeekBtn, ReportCard, BetHeatmap) â†’ ./components/Ledger.jsx
// â•â•â• FAQ ACCORDION â•â•â•
const FaqAccordion = () => {
  const [open, setOpen] = useState(null);
  const faqs = [
    ["Is this legal in my state?","Yes, if your state has legal online sports betting. As of 2026, 30+ states allow it. This tool is a math calculator â€” it doesn't place bets or access sportsbook systems. It's no different from a spreadsheet. The only legal question is whether online sports betting is legal in your state, not whether you can use a calculator."],
    ["Can I get banned from sportsbooks?","You can't get 'banned' outright for matched betting â€” but books can limit your maximum bet size or exclude you from specific promotions. This typically happens to accounts that ONLY place hedging bets with no recreational activity. To stay under the radar: place some small normal bets, don't always withdraw immediately after a bonus, vary your bet amounts, and stick to main lines rather than props."],
    ["How much can I realistically make?","Welcome promos across 8-10 books: $1,000-$2,500 one-time. Daily profit boosts ongoing: $300-$1,000/month. These numbers assume you're in a state with 6-8 books and you're consistent with daily boosts. Some power users in NJ or PA who run all books aggressively see $1,500+/month ongoing. The income estimator in the Calculate tab gives you personalized projections."],
    ["Do I need to know anything about sports?","No. This is pure math. You don't need to know the teams, the players, or anything about sports. You're just placing bets on both sides of the same event â€” the outcome doesn't matter. Many of the most successful promo grinders have no sports knowledge at all."],
    ["Is this gambling?","Not in the traditional sense. Traditional gambling means taking a risk for the chance of reward. Matched betting eliminates the risk by betting both sides. When done correctly, the math guarantees a profit regardless of the outcome. You're exploiting the bonus value, not the game result. The +EV betting approach (Live Scanner) does involve variance, but even that is profitable over large sample sizes."],
    ["What if I lose a bet?","With hedging (Bonus Bet, First Bet, Profit Boost), you can't 'lose' in the traditional sense â€” both sides are covered. Your worst case is a smaller profit than expected (if the hedge math doesn't work out perfectly). The only risk is if you forget to place the hedge, or place it at the wrong book or wrong amount. Always set up both bets before either game starts."],
  ];
  return (<div style={{marginTop:16,marginBottom:8}}>
    <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Frequently Asked Questions</div>
    {faqs.map(([q,a],i)=>(
      <div key={i} style={{borderBottom:`1px solid ${K.bd}`,marginBottom:0}}>
        <button onClick={()=>setOpen(o=>o===i?null:i)} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 0",color:K.tx,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:font,fontSize:12,fontWeight:600}}>
          <span>{q}</span>
          <span style={{color:K.mt,fontSize:10,marginLeft:12}}>{open===i?"â–²":"â–¼"}</span>
        </button>
        {open===i&&<div style={{fontSize:12,color:K.dm,lineHeight:1.7,paddingBottom:12}}>{a}</div>}
      </div>
    ))}
  </div>);
};

// â•â•â• KNOWLEDGE BASE â•â•â•
const KB = () => (<div style={S.card}>
  <Tl t="Complete Knowledge Base"/>
  <div style={{fontSize:13,lineHeight:1.8,color:K.dm}}>

    <div style={{...S.tag(K.gn),marginBottom:12,fontSize:12}}>START HERE IF YOU'RE NEW</div>

    <div style={S.helpH}>What Is This Tool?</div>
    <p>This is a math calculator for sports betting promotions. Sportsbooks (like DraftKings, FanDuel, BetMGM) give away free money through promotions to attract new customers. This tool calculates exactly how to turn those promotions into guaranteed cash â€” no sports knowledge needed, no gambling involved.</p>

    <div style={S.helpH}>Is This Legal?</div>
    <p>Yes. Matched betting and promo conversion are completely legal in every US state where online sports betting is legal (30+ states). This tool is a calculator â€” like a mortgage calculator or tax calculator. It doesn't place bets, access any sportsbook, or handle money. Companies like ProfitDuel, OddsJam, and DarkHorse Odds charge $49â€“$199/month for similar tools. This one is free. You can share it with anyone.</p>

    <div style={S.helpH}>How Much Can I Make?</div>
    <p>Welcome promos (one-time, across 8-10 books): $1,000-$2,500. Daily profit boosts (recurring, 15 min/day): $300-$1,000/month. These are realistic numbers based on current sportsbook promos. This is a side hustle, not a get-rich-quick scheme.</p>

    <FaqAccordion/>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>GLOSSARY â€” EVERY TERM EXPLAINED</div>

    <div style={S.helpH}>Odds Formats</div>
    <p><span style={S.helpTerm}>American Odds (+/-)</span> â€” The standard US format. <strong>Positive (+200)</strong>: how much you WIN on a $100 bet. +200 means bet $100, win $200 profit. <strong>Negative (-150)</strong>: how much you must BET to win $100. -150 means bet $150 to win $100 profit. The bigger the + number, the less likely the outcome. The bigger the - number, the more likely.</p>
    <p><span style={S.helpTerm}>Decimal Odds (2.50)</span> â€” Your total return per $1. Decimal 2.50 means bet $1, get $2.50 back ($1.50 profit + $1 stake). Used in Europe.</p>
    <p><span style={S.helpTerm}>Implied Probability</span> â€” What the odds suggest about the chance of winning. -200 odds = 66.7% chance. +200 odds = 33.3% chance. Important: because of the vig, implied probabilities from a sportsbook always add up to MORE than 100%.</p>

    <div style={S.helpH}>Key Betting Terms</div>
    <p><span style={S.helpTerm}>Vig (Vigorish) / Juice</span> â€” The sportsbook's built-in profit margin on every bet. Think of it as a service fee. Standard vig is about 4.5%. This is why a "fair" coin flip isn't +100/+100 â€” it's -110/-110. That extra $10 you have to risk on each side is the vig. The sportsbook collects it regardless of who wins.</p>
    <p><span style={S.helpTerm}>Moneyline</span> â€” A bet on which team wins. No point spread. Just pick the winner. Example: Chiefs -200 / Bills +170. Bet the Chiefs at -200 = bet $200 to win $100. Bet the Bills at +170 = bet $100 to win $170.</p>
    <p><span style={S.helpTerm}>Spread</span> â€” A bet on the margin of victory. Chiefs -3.5 means they must win by 4+ points for your bet to win. Bills +3.5 means they can lose by up to 3 points and you still win.</p>
    <p><span style={S.helpTerm}>Total (Over/Under)</span> â€” A bet on the combined score of both teams. Over 47.5 means both teams must score 48+ combined points. Under means 47 or fewer.</p>
    <p><span style={S.helpTerm}>Parlay</span> â€” Combining multiple bets into one. ALL legs must win for the parlay to pay. Higher potential payout, higher risk. A 4-leg parlay might pay +1000 but all 4 must hit.</p>
    <p><span style={S.helpTerm}>Player Props</span> â€” Bets on individual player stats. "Patrick Mahomes Over 275.5 passing yards" is a player prop. These are where middle bet opportunities are most common because books often disagree on player lines.</p>

    <div style={S.helpH}>Promo Types</div>
    <p><span style={S.helpTerm}>Bonus Bet / Free Bet</span> â€” A bet credit from the sportsbook. If it wins, you get the PROFIT only â€” the bonus credit disappears. A $200 bonus bet at +300 that wins pays you $600 (not $800). The stake is NOT returned. This is the most important thing to understand for conversions.</p>
    <p><span style={S.helpTerm}>Profit Boost</span> â€” A percentage increase on your winnings. A 50% profit boost on a bet that would normally win $100 now wins $150. You're using your OWN money â€” the boost just increases the payout. These are recurring (daily) and are the long-term income source.</p>
    <p><span style={S.helpTerm}>First Bet Safety Net</span> â€” Your first cash bet at a book is "insured." If it loses, you get the amount back as bonus bets. BetMGM offers up to $1,500, bet365 up to $1,000. This is the highest-value welcome promo type.</p>
    <p><span style={S.helpTerm}>Deposit Match</span> â€” The sportsbook matches a percentage of your deposit with bonus funds. A "20% match up to $1,000" means deposit $5,000, get $1,000 in bonus funds. Usually comes with rollover requirements.</p>
    <p><span style={S.helpTerm}>Rollover / Playthrough</span> â€” The amount you must wager before bonus funds become withdrawable cash. A 5x rollover on $500 means you must place $2,500 in total bets. Each bet costs you a tiny amount (the vig), so the true value of the bonus is less than face value.</p>

    <div style={S.helpH}>Strategy Terms</div>
    <p><span style={S.helpTerm}>Hedge</span> â€” Placing a second bet on the opposite outcome to guarantee profit (or limit loss) regardless of who wins. Always at a DIFFERENT sportsbook from your original bet.</p>
    <p><span style={S.helpTerm}>Arbitrage (Arb)</span> â€” Betting both sides of an event at different books where the combined odds guarantee profit. Requires both sides to be priced favorably at different books simultaneously.</p>
    <p><span style={S.helpTerm}>+EV (Positive Expected Value)</span> â€” A bet where the true probability of winning is higher than the odds suggest. Over many such bets, you profit. Unlike arbing, individual +EV bets can lose â€” the edge plays out over volume.</p>
    <p><span style={S.helpTerm}>Conversion Rate</span> â€” The percentage of a bonus bet you extract as real cash. 70%+ is excellent. A $200 bonus at 75% conversion = $150 real cash in your pocket.</p>
    <p><span style={S.helpTerm}>Middle</span> â€” Betting opposite sides at different lines where both bets can win if the result lands in the gap between the lines.</p>
    <p><span style={S.helpTerm}>Closing Line Value (CLV)</span> â€” Whether the odds you bet at were better than the final odds when the game starts. Consistently beating the closing line is the strongest indicator of long-term profitability.</p>
    <p><span style={S.helpTerm}>Getting Limited / Promo Banned</span> â€” Sportsbooks can reduce your maximum bet size or exclude you from promotions if they suspect you're purely converting promos. To avoid this: place some small "normal" bets, don't withdraw too often, stick to main lines, and vary your bet amounts.</p>

    <div style={{...S.tag(K.yl),marginBottom:12,marginTop:24,fontSize:12}}>STEP-BY-STEP WALKTHROUGH</div>

    <div style={S.helpH}>Phase 1: Setup (Day 1-3)</div>
    <p>1) Download 6-10 sportsbook apps (DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers). 2) Create an account at each â€” you'll need your SSN and ID for verification. 3) Deposit the minimum required at each ($5-$10). 4) Do NOT place any bets yet. Get all accounts funded first so you can move fast when hedging.</p>
    <div style={{background:"#161d2a",border:"1px dashed #1e293b",borderRadius:8,padding:16,margin:"12px 0",textAlign:"center"}}><div style={{fontSize:11,color:"#64748b"}}>ðŸ“¹ Video walkthrough: Setting up accounts â€” coming soon</div></div>

    <div style={S.helpH}>Phase 2: Welcome Promos (Day 3-14)</div>
    <p>Start with "Safety Net" books (BetMGM, bet365, BetRivers). Use the First Bet Hedge calculator. Place your qualifying bet and IMMEDIATELY hedge at another book. Win = profit from hedge. Lose = get bonus bets back, which you convert in Phase 3. Then do the "Bet & Get" books (DraftKings, FanDuel, Fanatics, ESPN BET). These give bonus bets after a small qualifying wager.</p>
    <div style={S.helpH}>Phase 3: Convert Everything (Day 7-14)</div>
    <p>Use the Bonus Bet Converter for every bonus bet you've accumulated. Place each bonus on an underdog (+250 to +400 odds), hedge the other side at a different book. Target 70%+ conversion rate. Log every conversion in the P/L Ledger.</p>

    <div style={S.helpH}>Phase 4: Daily Profit Boosts (Ongoing)</div>
    <p>After welcome promos are done, check your sportsbook apps each morning for profit boosts. Use the Profit Boost Converter. DraftKings, FanDuel, and Caesars offer 2-5 boosts daily. At $5-$15 per conversion, that's $300-$1,000/month. This is 15-20 minutes of work per day.</p>

    <div style={S.helpH}>Phase 5: Advanced â€” +EV Betting (Optional)</div>
    <p>Use the No-Vig calculator to find true probabilities. Compare against sportsbook odds with the +EV calculator. Unlike hedging/arbing, +EV betting involves risk per bet but is profitable over hundreds of bets. Track your Closing Line Value to verify you have an edge.</p>

    <div style={{...S.tag(K.rd),marginBottom:12,marginTop:24,fontSize:12}}>IMPORTANT WARNINGS</div>
    <p><strong>This is not gambling advice.</strong> This is a math education tool. You must be 21+ in most states. Only bet where sports betting is legal in your state. All winnings are taxable â€” keep records. Never bet more than you can afford to lose. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
    <p><strong>Account longevity:</strong> 1) Never hedge at the same sportsbook. 2) Place some small "recreational" bets between conversions. 3) Don't withdraw too frequently. 4) Stick to main lines (moneyline, spread, totals) â€” player props get you limited faster. 5) Vary your bet amounts (don't always bet round numbers).</p>

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>TAX GUIDE</div>

    <div style={S.helpH}>Reporting Your Winnings</div>
    <p>All gambling winnings are taxable ordinary income in the US, regardless of amount. You must report them even if you don't receive a W-2G form. Sportsbooks issue W-2Gs for winnings of $600+ that are 300x the wager or more, and for any winnings of $5,000+. Report everything on Schedule 1 (Form 1040), Line 8b.</p>

    <div style={S.helpH}>Deducting Losses</div>
    <p>You can deduct gambling losses â€” but only up to the amount of your winnings, and only if you itemize deductions (Schedule A). You cannot net losses against winnings and report only the difference. If you won $2,000 and lost $1,500, you report $2,000 in income and may deduct $1,500 separately. The P/L Ledger on this app is designed to track exactly this â€” export it at tax time.</p>

    <div style={S.helpH}>Quarterly Estimated Taxes</div>
    <p>If you expect to owe more than $1,000 in federal taxes from gambling, consider making quarterly estimated payments (Form 1040-ES) to avoid underpayment penalties. Quarterly deadlines are typically April 15, June 15, September 15, and January 15. The Tax Estimate section in the P/L Ledger gives you a running estimate.</p>

    <div style={S.helpH}>Professional Gambler Status</div>
    <p>If gambling is your primary source of income and you treat it like a business (records, regular activity, profit motive), you may qualify as a professional gambler. This allows you to deduct expenses (software, travel, data subscriptions) on Schedule C, but subjects your income to self-employment tax. Consult a CPA familiar with gambling income before claiming this status.</p>

    <div style={{...S.tag(K.pp),marginBottom:12,marginTop:24,fontSize:12}}>STATE AVAILABILITY GUIDE</div>

    <div style={S.helpH}>Which Sportsbooks Operate Where</div>
    <p>Online sports betting is legal in 30+ US states as of 2026. Not all sportsbooks operate in every legal state. Here are the major books and their general availability:</p>
    <p><span style={S.helpTerm}>DraftKings</span> â€” Available in most legal states (20+). One of the widest footprints.</p>
    <p><span style={S.helpTerm}>FanDuel</span> â€” Available in most legal states (20+). Typically matches DraftKings availability.</p>
    <p><span style={S.helpTerm}>BetMGM</span> â€” Available in 15+ states. Strong presence in NJ, PA, MI, CO, TN, VA, IN, WV, AZ, NV.</p>
    <p><span style={S.helpTerm}>Caesars</span> â€” Available in 15+ states. Strong in states where Caesars has casino properties.</p>
    <p><span style={S.helpTerm}>bet365</span> â€” Available in NJ, CO, IA, OH, VA, KY, and expanding. Smaller US footprint but excellent odds quality.</p>
    <p><span style={S.helpTerm}>ESPN BET (PENN)</span> â€” Available in 15+ states.</p>
    <p><span style={S.helpTerm}>Fanatics</span> â€” Rapidly expanding, now 15+ states after acquiring PointsBet US.</p>
    <p><span style={S.helpTerm}>BetRivers</span> â€” Available in 10+ states. Strongest in PA, IL, MI, IN, CO, VA, AZ, NY.</p>
    <p><span style={S.helpTerm}>States with the most books (best for promo grinding)</span>: New Jersey, Pennsylvania, Colorado, Michigan, Virginia, Ohio, Indiana, Arizona, New York.</p>
    <p><span style={S.helpTerm}>Check current availability</span>: Each sportsbook&apos;s app or website will tell you if they operate in your state during account creation. Availability changes as new states legalize.</p>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>STAKING PLAN GUIDE</div>

    <div style={S.helpH}>Flat Betting</div>
    <p>Bet the same dollar amount every time â€” typically 1-2% of bankroll. $1,000 bankroll = $10-$20 per bet. Simple, safe, and appropriate when you are not sure of your exact edge. You can absorb 50-100 consecutive losses without busting. Best for matched betting and promo conversions where every bet has roughly the same structure.</p>

    <div style={S.helpH}>Kelly Criterion</div>
    <p>Bets proportional to your edge: <span style={{fontFamily:font,color:K.ac}}>bet% = (p Ã— b â€“ q) / b</span> where p = win probability, b = net odds, q = loss probability. Full Kelly maximizes long-term bankroll growth but causes large drawdowns. Most professional +EV bettors use 20â€“33% (Quarter Kelly) to reduce variance while capturing most of the growth benefit.</p>

    <div style={S.helpH}>Proportional (% of bankroll)</div>
    <p>Bet a fixed percentage of your CURRENT bankroll each time. As the bankroll grows, bets grow. As it shrinks, bets shrink â€” protecting you from ruin. Common rule: 1% per unit, 2 units on strong plays, 0.5 units on weaker spots. Requires discipline to scale down after losses.</p>

    <table style={{width:"100%",borderCollapse:"collapse",marginTop:12,fontSize:11}}>
      <thead><tr>{["Style","Risk Level","Best For","Avg Bet ($1000 BR)"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}>{h}</th>)}</tr></thead>
      <tbody>{[
        ["Flat 1%","Low","All bettors, beginners","$10"],
        ["Quarter Kelly","Medium","Verified +EV bettors","$5-25 (varies)"],
        ["Half Kelly","Med-High","Experienced, high confidence","$10-50 (varies)"],
        ["Full Kelly","High","Experts only, high-volume","Variable"],
      ].map(([s,r,b,a])=><tr key={s}><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.tx,fontWeight:600}}>{s}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{r}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{b}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{a}</td></tr>)}</tbody>
    </table>

    <div style={{...S.tag(K.yl),marginBottom:12,marginTop:24,fontSize:12}}>PROMO CALENDAR</div>

    <div style={S.helpH}>Best Times of Year for Promo Grinding</div>
    <p>Sportsbooks spend the most on promos during high-profile events when they compete hardest for new depositors. Plan your promo calendar around these windows:</p>

    <table style={{width:"100%",borderCollapse:"collapse",marginTop:12,fontSize:11}}>
      <thead><tr>{["Period","Event","Why It's Big","Typical Promos"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}>{h}</th>)}</tr></thead>
      <tbody>{[
        ["Early September","NFL Kickoff","Biggest betting week of year","Profit boosts, reload bonuses, enhanced parlays"],
        ["Late January","Super Bowl","Single biggest sportsbook event","Massive first-bet offers, odds boosts, prop specials"],
        ["March","March Madness","Weeks of high-volume betting","Parlay insurance, bracket contests, daily boosts"],
        ["October","MLB Playoffs / NBA Tip-off","Dual-sport overlap = more promos","Multi-sport boosts, loyalty promos"],
        ["June","NBA Finals / NHL Playoffs","Overlap period","Series price boosts, game specials"],
        ["Late March","Opening Day MLB","New season deposits","Reload promos, first-bet offers"],
      ].map(([period,event,why,promos])=><tr key={period}><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.yl,fontWeight:600}}>{period}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.tx}}>{event}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.dm}}>{why}</td><td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.mt}}>{promos}</td></tr>)}</tbody>
    </table>
    <p>Books also run promos for: NBA All-Star Weekend, Masters golf, Kentucky Derby, World Cup (if applicable), college football bowl season. Check your apps weekly â€” daily boosts run year-round regardless of calendar.</p>

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>BOOK-SPECIFIC GUIDES</div>

    <div style={S.helpH}>DraftKings</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily profit boost tokens (2-3/day), stepped-up parlays, SGP profit boosts. Welcome offer: Bet $5, Get $200 in bonus bets. Conversion rate on DK bonus bets: 65-72%. Promos reset daily around 8am ET â€” check the Promotions tab each morning. DK has the widest variety of daily boosts across all sports. Account longevity tip: place occasional small recreational bets on main lines.</p>

    <div style={S.helpH}>FanDuel</div>
    <p><span style={S.helpTerm}>Best promos:</span> "No Sweat" first SGP of the day, daily profit boost tokens, parlay insurance. Welcome offer: Up to $300/day Bet Reset for 10 days. FanDuel No Sweat bets work like First Bet Insurance â€” if it loses, you get the stake back as bonus bets (up to the limit). Conversion: 65-72%. FD tends to offer more SGP-specific boosts than other books.</p>

    <div style={S.helpH}>BetMGM</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly deposit bonus (25% up to $100), daily odds boosts, one-game parlays. Welcome offer: Up to $1,500 First Bet Safety Net â€” the highest-value safety net on the market. Conversion on $1,500 bonus bets at 70%: ~$1,050 real cash. BetMGM tends to limit aggressive bonus converters faster than other books â€” vary your bet amounts and mix in recreational bets.</p>

    <div style={S.helpH}>Caesars</div>
    <p><span style={S.helpTerm}>Best promos:</span> Rotating 100% profit boost tokens ($25 max each), odds boosts, parlay insurance. Welcome offer: Bet $1, Get 10Ã— 100% Profit Boost Tokens. Caesars Rewards points accumulate with every bet â€” these convert to real cash or hotel/resort value. Caesars has some of the strictest account limitation policies; be conservative with conversion amounts.</p>

    <div style={S.helpH}>bet365</div>
    <p><span style={S.helpTerm}>Best promos:</span> Early payout offers, multi-sport parlay boosts. Welcome offer: Choose between Bet $10 Get $365 Bonus Bets OR a $1K Safety Net. bet365 tends to have sharper lines than US-focused books, making it excellent for line shopping and +EV betting. Available in fewer US states (NJ, CO, IA, OH, VA, KY and expanding).</p>

    <div style={S.helpH}>ESPN BET</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly profit boost tokens, featured parlay boosts, ESPN+ integration specials. Welcome offer: Bet $5, Get $200 + Deposit Match up to $300. ESPN BET is newer (launched late 2023) and tends to be more aggressive with promos to gain market share. Conversion: 65-70%. Check the ESPN app daily â€” promos are often tied to featured games.</p>

    <div style={S.helpH}>Fanatics</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily FanCash bonuses, loyalty rewards tied to Fanatics purchases, profit boosts. Welcome offer: Bet $5/day for 10 days, Get $200 FanCash. FanCash is Fanatics' bonus currency â€” it can be converted to cash at ~70% via the hedge method or spent on Fanatics merchandise. Uniquely, Fanatics integrates with your Fanatics shopping account for additional rewards.</p>

    <div style={S.helpH}>BetRivers</div>
    <p><span style={S.helpTerm}>Best promos:</span> iRush Rewards points (high earn rate), 2nd chance parlays, weekly profit boosts. Welcome offer: Up to $500 Second Chance Bet. BetRivers has the best loyalty program in US sports betting â€” iRush points earn fast and convert to bonus cash. Available in 10+ states with strong presence in PA, IL, MI. Generally less aggressive about account limitations than larger books.</p>
  </div>
</div>);

// â•â•â• PROFIT CERTIFICATE â•â•â•
const ProfitCertificate = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const toast = useToast();
  const entries = data.ledger || [];
  const [period, setPeriod] = useState('month');
  const [copied, setCopied] = useState(false);
  const now = new Date();
  const cutoff = period === 'week' ? new Date(now - 7 * 86400000) : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const filtered = entries.filter(e => e.date >= cutoffStr);
  const total = filtered.reduce((s, e) => s + (parseFloat(e.profit) || 0), 0);
  const count = filtered.length;
  const books = [...new Set(filtered.map(e => e.book).filter(Boolean))];
  const bestDay = filtered.reduce((best, e) => { const p = parseFloat(e.profit) || 0; return p > best.p ? { d: e.date, p } : best; }, { d: '', p: 0 });
  const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : String(now.getFullYear());

  const shareText = () => {
    const lines = [
      `Profit Certificate â€” ${periodLabel}`,
      `Total Profit: $${f(total)}`,
      `${count} conversions across ${books.length} book${books.length !== 1 ? 's' : ''}`,
      bestDay.d ? `Best day: ${bestDay.d} (+$${f(bestDay.p)})` : '',
      '',
      'Tracked with PromoGrind â€” free sportsbook promo tools',
      CANONICAL_APP_URL,
    ].filter(Boolean).join('\n');
    return lines;
  };

  const copy = () => {
    try { navigator.clipboard.writeText(shareText()); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (toast) toast('Certificate copied!', K.gn);
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: 'PromoGrind Profit Certificate', text: shareText() }).catch(() => {});
    } else {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}`;
      window.open(url, '_blank');
    }
  };

  const addToWinsWall = async () => {
    const entry = {
      id: `${period}-${Date.now()}`,
      period,
      periodLabel,
      total: f(total),
      count,
      books: books.length,
    };
    // Local fallback
    try {
      const prev = JSON.parse(localStorage.getItem('pg_wins_wall') || '[]');
      const next = [entry, ...prev.filter((item) => item.period !== period)].slice(0, 12);
      localStorage.setItem('pg_wins_wall', JSON.stringify(next));
    } catch {}
    // Server opt-in (if authenticated)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('wins_wall').upsert({
          user_id: session.user.id,
          period,
          period_label: periodLabel,
          total: parseFloat(f(total)) || 0,
          entry_count: count,
          book_count: books.length,
          metadata: { best_day: bestDay.d || null, best_day_profit: bestDay.p || 0 },
        }, { onConflict: 'user_id,period,period_label' });
      }
    } catch {}
    trackLaunchEvent('wins_wall_opt_in', { period, total: f(total) });
    if (toast) toast('Added to Wins Wall', K.pp);
  };

  if (entries.length === 0) return (
    <div style={S.card}>
      <div style={{fontSize:14,fontWeight:700,color:K.tx,fontFamily:fontD,marginBottom:8}}>Profit Certificate</div>
      <div style={{fontSize:12,color:K.mt}}>Log entries in the P/L Ledger to generate your shareable profit certificate.</div>
    </div>
  );

  return (
    <div style={S.card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:K.tx,fontFamily:fontD}}>Profit Certificate</div>
        <div style={{display:'flex',gap:4}}>
          {['week','month','year'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{padding:'3px 10px',background:period===p?K.gn:'transparent',border:`1px solid ${period===p?K.gn:K.bd2}`,borderRadius:50,color:period===p?K.bg:K.dm,fontSize:9,cursor:'pointer',fontFamily:font,textTransform:'uppercase'}}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{background:`linear-gradient(135deg,${K.s2},${K.s1})`,border:`1px solid ${K.bd}`,borderRadius:12,padding:24,textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${K.gn},${K.ac},${K.pp})`}}/>
        <div style={{fontSize:10,color:K.mt,textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Verified by PromoGrind</div>
        <div style={{fontFamily:fontD,fontSize:36,fontWeight:800,color:total>=0?K.gn:K.rd,lineHeight:1}}>${f(Math.abs(total))}</div>
        <div style={{fontSize:11,color:K.mt,marginTop:6}}>{total>=0?'PROFIT':'LOSS'} â€” {periodLabel}</div>
        <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:16}}>
          <div><div style={{fontSize:18,fontWeight:700,color:K.ac,fontFamily:fontD}}>{count}</div><div style={{fontSize:9,color:K.mt,textTransform:'uppercase'}}>Conversions</div></div>
          <div><div style={{fontSize:18,fontWeight:700,color:K.pp,fontFamily:fontD}}>{books.length}</div><div style={{fontSize:9,color:K.mt,textTransform:'uppercase'}}>Books</div></div>
          {bestDay.d && <div><div style={{fontSize:18,fontWeight:700,color:K.yl,fontFamily:fontD}}>${f(bestDay.p)}</div><div style={{fontSize:9,color:K.mt,textTransform:'uppercase'}}>Best Day</div></div>}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16}}>
          <button onClick={copy} style={{padding:'6px 14px',background:copied?K.gn:K.ac,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:'pointer',fontFamily:font}}>{copied?'Copied!':'Copy'}</button>
          <button onClick={shareNative} style={{padding:'6px 14px',background:K.pp,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:'pointer',fontFamily:font}}>Share</button>
          <button onClick={addToWinsWall} style={{padding:'6px 14px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontWeight:700,fontSize:10,cursor:'pointer',fontFamily:font}}>Add to Wins Wall</button>
        </div>
      </div>
    </div>
  );
};

// â•â•â• TAB SYSTEM â•â•â•
// LiveScanner (+ SPORTS_LIST, PROP_MARKETS, detectArbs, detectEV) â†’ ./components/LiveScanner.jsx
// â•â•â• LEADERBOARD â•â•â•
const Leaderboard = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [privacyOn, setPrivacyOn] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  useEffect(()=>{
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if(user) { setMyUserId(user.id); setPrivacyOn(user.user_metadata?.leaderboard_visible!==false); }
        let lbData, error;
        ({ data:lbData, error } = await supabase.from('vault_leaderboard').select('user_id,total_points,last_active').order('total_points',{ascending:false}).limit(20));
        if (error) {
          ({ data:lbData } = await supabase.from('vault_events').select('user_id,points').limit(5000));
          if (lbData) {
            const agg = {};
            lbData.forEach(r=>{ agg[r.user_id]=(agg[r.user_id]||0)+(r.points||0); });
            lbData = Object.entries(agg).map(([user_id,total_points])=>({user_id,total_points})).sort((a,b)=>b.total_points-a.total_points).slice(0,20);
          }
        }
        if (lbData) {
          setRows(lbData);
          if (user) { const idx=lbData.findIndex(r=>r.user_id===user.id); setMyRank(idx>=0?idx+1:null); }
        }
      } catch(e) {}
      setLoading(false);
    };
    load();
  },[]);
  const togglePrivacy = async (val) => {
    setPrivacyOn(val);
    setPrivacySaving(true);
    try { await supabase.auth.updateUser({data:{leaderboard_visible:val}}); } catch(e) {}
    setPrivacySaving(false);
  };
  const mask = (uid) => 'Grinder #'+uid.slice(-4).toUpperCase();
  const rankColor = i => i===0?K.yl:i===1?K.dm:i===2?'#cd7f32':K.mt;
  const myLedger = data.ledger||[];
  const myAvgClv = useMemo(()=>{ const clv=myLedger.filter(e=>e.myOdds&&e.closingOdds); return clv.length ? clv.reduce((s,e)=>{const my=toD(e.myOdds),cl=toD(e.closingOdds);return s+(my>1&&cl>1?(my/cl-1)*100:0);},0)/clv.length : null; },[myLedger]);
  return (<div style={S.card}><Tl t="Vault Points Leaderboard" badge="LIVE" bc={K.yl}/>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"10px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,flexWrap:"wrap"}}>
      <span style={{fontSize:11,fontWeight:700,color:K.tx}}>Privacy Settings</span>
      <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:K.dm}}>
        <input type="checkbox" checked={privacyOn} onChange={e=>togglePrivacy(e.target.checked)} style={{cursor:"pointer"}}/>
        Show my account on the public leaderboard
      </label>
      {privacySaving&&<span style={{fontSize:10,color:K.yl}}>Savingâ€¦</span>}
    </div>
    {myRank&&<Nt c={K.gn}>You are ranked #{myRank} on the leaderboard.</Nt>}
    <Nt c={K.ac}>Earn points by using calculators (1-5 pts), logging bets (2 pts), and daily logins (3 pts).</Nt>
    {loading&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Loading leaderboardâ€¦</div>}
    {!loading&&rows.length===0&&<div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:32,marginBottom:8}}>ðŸ†</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>Be the first on the leaderboard</div>
      <div style={{fontSize:11,color:K.mt,marginBottom:14}}>Use calculators and log bets to earn Vault Points and claim your spot.</div>
      <button onClick={()=>{window.location.hash='#/bonus-bet';}} style={{padding:"7px 18px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Start with Bonus Bet Converter â†’</button>
    </div>}
    {!loading&&rows.length>0&&<div style={{marginTop:12}}>
      <div style={{display:"grid",gridTemplateColumns:"24px 1fr auto auto",gap:12,padding:"5px 12px",marginBottom:4}}>
        <div/><div style={{fontSize:9,color:K.mt,textTransform:"uppercase"}}>Grinder</div>
        <div style={{fontSize:9,color:K.mt,textTransform:"uppercase"}}>Pts</div>
        <div style={{fontSize:9,color:K.mt,textTransform:"uppercase"}}>CLV</div>
      </div>
      {rows.map((r,i)=>{
        const isMe=r.user_id===myUserId;
        return (
          <div key={r.user_id} style={{display:"grid",gridTemplateColumns:"24px 1fr auto auto",gap:12,alignItems:"center",padding:"10px 12px",background:isMe?`${K.gn}10`:i<3?`${rankColor(i)}08`:K.s2,borderRadius:6,marginBottom:4,border:`1px solid ${isMe?K.gn:i<3?rankColor(i)+'30':K.bd}`}}>
            <div style={{fontSize:i<3?18:13,fontWeight:700,color:rankColor(i),textAlign:"center"}}>{i===0?'ðŸ¥‡':i===1?'ðŸ¥ˆ':i===2?'ðŸ¥‰':i+1}</div>
            <div style={{fontSize:12,color:K.tx,fontWeight:i<3?600:400}}>{mask(r.user_id)}{isMe&&<span style={{...S.tag(K.gn),marginLeft:6,fontSize:8}}>YOU</span>}</div>
            <div style={{fontSize:13,fontWeight:700,color:K.yl}}>{(r.total_points||0).toLocaleString()}</div>
            <div style={{fontSize:11,color:isMe&&myAvgClv!==null?(myAvgClv>=0?K.gn:K.rd):K.mt}}>
              {isMe&&myAvgClv!==null?`${myAvgClv>=0?"+":""}${f(myAvgClv,2)}%`:"â€”"}
            </div>
          </div>
        );
      })}
    </div>}
    {myAvgClv!==null&&<div style={{marginTop:12,padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>My Stats</div>
      <RR l="My Points" v={`${rows.find(r=>r.user_id===myUserId)?.total_points||0} pts`} c={K.yl}/>
      <RR l="My Avg CLV" v={`${myAvgClv>=0?"+":""}${f(myAvgClv,2)}%`} c={myAvgClv>=0?K.gn:K.rd}/>
      {myRank&&<RR l="My Rank" v={`#${myRank}`} c={K.pp}/>}
    </div>}
  </div>);
};

// â•â•â• COMMUNITY PROMO BOARD â€” extracted to src/components/CommunityPromoBoard.jsx â•â•â•
const PromoBoard = CommunityPromoBoard;

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state={error:null}; }
  static getDerivedStateFromError(e) { return {error:e}; }
  render() {
    if(this.state.error) return (
      <div style={{fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace",padding:32,display:"flex",alignItems:"center",justifyContent:"center",minHeight:240}}>
        <div style={{background:"#0f1520",border:"1px solid #1e293b",borderRadius:10,padding:32,maxWidth:440,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:8}}>âš </div>
          <div style={{fontSize:14,fontWeight:700,color:"#f87171",marginBottom:8}}>This calculator hit an error</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:16}}>Try refreshing, or use the navigation above to switch calculators.</div>
          {import.meta.env.DEV && <div style={{fontSize:10,color:"#64748b",marginBottom:12,textAlign:"left",padding:"8px",background:"#0a0e17",borderRadius:4,wordBreak:"break-all"}}>{this.state.error.message}</div>}
          <button onClick={()=>this.setState({error:null})} style={{padding:"8px 20px",background:"#60a5fa",border:"none",borderRadius:6,color:"#0a0e17",fontWeight:700,cursor:"pointer"}}>Try Again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// â•â•â• DAILY STREAK â•â•â•
const DailyStreak = () => {
  const [streak, setStreak] = useState(null);
  const toast = useToast();
  useEffect(()=>{
    (async()=>{
      try {
        const {data:{user}}=await supabase.auth.getUser();
        if(!user) return;
        // Record today's daily_login if not already done
        const todayStr=new Date().toISOString().slice(0,10);
        const loginKey='pg_streak_today';
        try {
          if(localStorage.getItem(loginKey)!==todayStr){
            await supabase.from('vault_events').insert({user_id:user.id,event_type:'daily_login'});
            localStorage.setItem(loginKey,todayStr);
          }
        } catch {}
        const {data}=await supabase.from('vault_events').select('created_at').eq('user_id',user.id).eq('event_type','daily_login').order('created_at',{ascending:false}).limit(60);
        if(!data?.length){setStreak(0);return;}
        let s=0;
        const today=new Date(); today.setHours(0,0,0,0);
        const days=[...new Set(data.map(e=>new Date(e.created_at).toISOString().split('T')[0]))];
        for(let i=0;i<days.length;i++){
          const d=new Date(days[i]); d.setHours(0,0,0,0);
          const diff=Math.round((today-d)/(1000*60*60*24));
          if(diff===i||(i===0&&diff===1)) s++;
          else break;
        }
        setStreak(s);
        // Award vault points at milestones
        try {
          const milestonesKey='pg_streak_milestones';
          const milestones=JSON.parse(localStorage.getItem(milestonesKey)||'[]');
          const MILESTONES=[[7,50,'ðŸ”¥ 7-day streak! +50 Vault Points earned!'],[30,200,'ðŸ”¥ 30-day streak! +200 Vault Points earned!'],[100,500,'ðŸ”¥ 100-day streak! +500 Vault Points earned!']];
          const eligible=MILESTONES.filter(([days])=>s>=days&&!milestones.includes(String(days)));
          if(eligible.length){
            await Promise.all(eligible.map(([days,points])=>supabase.rpc('award_vault_points',{p_user_id:user.id,p_points:points,p_event_type:`streak_milestone_${days}`})));
            for(const [days,,msg] of eligible){ milestones.push(String(days)); if(toast) toast(msg,K.yl); }
            localStorage.setItem(milestonesKey,JSON.stringify(milestones));
          }
        } catch {}
      } catch(e){}
    })();
  },[]);
  if(streak===null||streak===0) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",background:`${K.yl}15`,borderRadius:50,border:`1px solid ${K.yl}30`}}>
      <span style={{fontSize:14}}>ðŸ”¥</span>
      <span style={{fontSize:11,fontWeight:700,color:K.yl}}>{streak} day streak</span>
    </div>
  );
};

// Achievement evaluation moved to src/lib/achievements.js
import { evaluateAchievements, loadEarned, saveEarned, getNewlyUnlocked, ACHIEVEMENT_MAP } from "./lib/achievements.js";
import { computeMastery } from "./lib/mastery.js";

function useAchievements(data, streak) {
  const toast = useToast();
  useEffect(() => {
    try {
      const mastery = computeMastery(data || {});
      const checks = evaluateAchievements(data || {}, streak, mastery);
      const earned = loadEarned();
      const newly = getNewlyUnlocked(checks, earned);
      if (newly.length > 0) {
        const updated = [...earned, ...newly];
        saveEarned(updated);
        newly.forEach(({ id }) => {
          const a = ACHIEVEMENT_MAP[id];
          if (a && toast) toast(a.icon + " Achievement unlocked: " + a.label, K.yl);
        });
      }
    } catch {}
  }, [data, streak]);
}

// â•â•â• GLOSSARY â•â•â•
const GLOSSARY_TERMS = [
  ["Vig / Juice","The sportsbook's built-in profit margin on every bet. Standard vig is ~4.5% (both sides at -110)."],
  ["Moneyline","Bet on who wins outright. +200 = underdog, -200 = favorite."],
  ["Spread","Bet on margin of victory. -3.5 means team must win by 4+."],
  ["Total / Over-Under","Bet on combined score of both teams."],
  ["Parlay","Multiple bets combined â€” all must win. Higher payout, higher risk."],
  ["Arbitrage","Betting both sides at different books where combined odds guarantee profit."],
  ["+EV","Positive expected value â€” the bet profits over many repetitions."],
  ["Closing Line Value (CLV)","Whether your odds were better than the closing odds. Consistently beating the close = long-term edge."],
  ["Hedge","Placing a second bet on the opposite outcome to lock in profit."],
  ["Bonus Bet","A bet credit â€” only the profit is returned, not the stake."],
  ["Profit Boost","Percentage increase added to your winnings if the bet wins."],
  ["First Bet Insurance","Refund of first bet as bonus bets if it loses."],
  ["Rollover / Playthrough","Must wager XÃ— the bonus before withdrawing."],
  ["Devig / No-Vig","Removing the sportsbook's margin to find true probabilities."],
  ["Kelly Criterion","Formula for optimal bet sizing based on your edge."],
  ["Middle","Betting opposite sides at different lines where both can win."],
  ["Round Robin","Creating all possible sub-parlays from a pool of picks."],
  ["Teaser","Parlay where you move lines in your favor for reduced payout."],
  ["Hold","The total percentage a book profits from both sides of a bet."],
  ["Sharp Book","Sportsbook with low vig and sharp (accurate) lines â€” e.g. Pinnacle."],
  ["Getting Limited","When a book reduces your max bet size due to consistent profiting."],
  ["SGP","Same-Game Parlay â€” all legs must be from the same game."],
];

const Glossary = () => {
  const [search, setSearch] = useState('');
  const filtered = GLOSSARY_TERMS.filter(([t])=>t.toLowerCase().includes(search.toLowerCase()));
  return (<div style={S.card}>
    <Tl t="Betting Glossary" badge="QUICK REF" bc={K.ac}/>
    <div style={{marginBottom:12}}><input style={S.input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search terms..."/></div>
    {filtered.map(([term,def])=>(
      <div key={term} style={{padding:"10px 0",borderBottom:`1px solid ${K.bd}`}}>
        <div style={{fontSize:13,fontWeight:600,color:K.ac,marginBottom:3}}>{term}</div>
        <div style={{fontSize:12,color:K.dm,lineHeight:1.6}}>{def}</div>
      </div>
    ))}
    {!filtered.length&&<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No terms found.</div>}
  </div>);
};

// â•â•â• ONBOARDING WIZARD â•â•â•
const ONBOARDING_KEY = 'pg_onboarded_v1';

const OnboardingWizard = ({ onDone }) => {
  const [step, setStep] = useState(0);
  const [books, setBooks] = useState([]);
  const [userState, setUserState] = useState(() => { try { return localStorage.getItem('pg_user_state')||''; } catch { return ''; } });
  const BOOK_OPTIONS = ['DraftKings','FanDuel','BetMGM','Caesars','bet365','ESPN BET','Fanatics','BetRivers'];
  const toggleBook = b => setBooks(prev => prev.includes(b) ? prev.filter(x=>x!==b) : [...prev,b]);
  const steps = [
    {
      title: "Welcome to PromoGrind",
      sub: "Turn sportsbook promos into guaranteed cash. No gambling knowledge needed.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:16}}>ðŸ¤‘</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[["Welcome Promos","$1,000â€“$2,500 one-time from 8+ books"],["Profit Boosts","$300â€“$1,000/month recurring, 15 min/day"],["100% Legal","Math calculator, not gambling. Free forever."],["No Sports Knowledge","Pure math. You don't need to know the teams."]].map(([t,d])=>(
              <div key={t} style={{padding:"10px 12px",background:"#161d2a",borderRadius:8,border:"1px solid #1e293b"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",marginBottom:2}}>{t}</div>
                <div style={{fontSize:10,color:"#64748b",lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Which books do you have?",
      sub: "Select the sportsbooks you've already signed up with (or none if you're just starting).",
      content: (
        <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
          {BOOK_OPTIONS.map(b=>(
            <button key={b} onClick={()=>toggleBook(b)} style={{padding:"8px 16px",background:books.includes(b)?"#4ade8020":"transparent",border:`1px solid ${books.includes(b)?"#4ade80":"#1e293b"}`,borderRadius:6,color:books.includes(b)?"#4ade80":"#64748b",fontSize:12,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:books.includes(b)?700:400}}>
              {b}
            </button>
          ))}
          <div style={{width:"100%",textAlign:"center",fontSize:11,color:"#64748b",marginTop:4}}>None yet? No problem â€” you'll start fresh.</div>
        </div>
      )
    },
    {
      title: "What state are you in?",
      sub: "We'll show only sportsbooks available in your state.",
      content: (
        <div style={{textAlign:"center"}}>
          <select style={{...S.input,maxWidth:300,padding:"10px 14px",fontSize:13,margin:"0 auto"}} value={userState} onChange={e=>{setUserState(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
            <option value="">â€” Select your state â€”</option>
            {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{fontSize:11,color:K.mt,marginTop:12}}>
            Sports betting is legal in 35+ states. Select yours to see which books you can use.
          </div>
        </div>
      )
    },
    {
      title: "Start with your first promo",
      sub: books.length > 0 ? `You have ${books.length} book${books.length>1?"s":""} â€” start converting promos immediately.` : "Open one or more sportsbook apps and grab a welcome promo.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.7}}>Your best first move:</div>
          <div style={{display:"grid",gap:8,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[
              ["1","Get a bonus bet promo","DraftKings, FanDuel, Fanatics, ESPN BET â€” all offer bonus bets after a small qualifying wager"],
              ["2","Open Bonus Bet Converter","Enter your bonus bet size and odds â€” the calculator tells you exactly what hedge to place"],
              ["3","Place both bets","Bonus bet at Book A, hedge at Book B. Profit guaranteed no matter the result"],
            ].map(([n,t,d])=>(
              <div key={n} style={{display:"flex",gap:12,padding:"10px 12px",background:"#161d2a",borderRadius:8,border:"1px solid #1e293b"}}>
                <div style={{fontSize:16,fontWeight:700,color:"#4ade80",minWidth:20}}>{n}</div>
                <div><div style={{fontSize:12,fontWeight:600,color:"#e2e8f0",marginBottom:2}}>{t}</div><div style={{fontSize:10,color:"#64748b",lineHeight:1.5}}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];
  const current = steps[step];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0f1520",border:"1px solid #1e293b",borderRadius:12,padding:28,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{current.title}</div>
            <div style={{fontSize:12,color:"#64748b"}}>{current.sub}</div>
          </div>
          <div style={{fontSize:10,color:"#334155",fontFamily:"'JetBrains Mono',monospace"}}>{step+1}/{steps.length}</div>
        </div>
        <div style={{marginBottom:24}}>{current.content}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button onClick={onDone} style={{padding:"6px 14px",background:"transparent",border:"1px solid #1e293b",borderRadius:6,color:"#334155",fontSize:11,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Skip</button>
          <div style={{display:"flex",gap:6}}>{steps.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i===step?"#4ade80":"#1e293b"}}/>)}</div>
          <button onClick={()=>{ if(step<steps.length-1) setStep(s=>s+1); else onDone(); }} style={{padding:"8px 20px",background:"#4ade80",border:"none",borderRadius:6,color:"#0a0e17",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif"}}>
            {step<steps.length-1?"Next â†’":"Let's Go â†’"}
          </button>
        </div>
      </div>
    </div>
  );
};

// â•â•â• ANNUAL INCOME ESTIMATOR â•â•â•
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
        <div role="checkbox" aria-checked={hasBoosts} onClick={()=>setHasBoosts(b=>!b)} style={{width:36,height:20,borderRadius:10,background:hasBoosts?K.gn:K.bd2,cursor:"pointer",display:"flex",alignItems:"center",padding:"0 3px",transition:"background 0.2s"}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:"white",transform:hasBoosts?"translateX(16px)":"translateX(0)",transition:"transform 0.2s"}}/>
        </div>
      </div>
    </div>

    <div style={{...S.res(true),marginTop:16}}>
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
      <RR l={`Daily boost income (${boostsPerDay} boosts Ã— ~$${boostPerConversion} each Ã— 22 days)`} v={`$${Math.round(monthlyBoosts).toLocaleString()}/month`} c={K.ac}/>
      <RR l="Year 1 estimate (conservative)" v={`$${Math.round(annualTotal * 0.8).toLocaleString()} â€“ $${Math.round(annualTotal * 1.1).toLocaleString()}`} c={K.gn} b/>
      <RR l="Effective hourly rate" v={`~$${Math.round(hourlyRate)}/hr`} c={K.pp}/>
      <Nt c={K.yl}>These are estimates based on current sportsbook promo values (2026). Welcome promos assume 70% conversion rate. Boost income varies by available lines and sportsbook generosity. Your actual results may be higher or lower.</Nt>
      <Nt c={K.ac}>Year 2+ income is mostly recurring boosts â€” welcome promos are one-time. This is a long-term side hustle, not a one-off.</Nt>
    </div>
  </div>
  <Help entries={[
    ["Welcome promo estimates","Based on current sportsbook offers: DraftKings ~$200 effective, FanDuel ~$200, BetMGM ~$180, Caesars ~$150, bet365 ~$125, ESPN BET ~$100, Fanatics ~$90, BetRivers ~$80. Assumes 70% conversion rate on bonus bets."],
    ["Boost income","Profit boosts appear daily across most sportsbooks. At 5 boosts per day averaging $9 each, that's $45/day, ~$990/month. More active grinders running all 8 books can see $200+/day on peak event days."],
    ["Hourly rate","Based on your selected hours per week. Note: most of that time is during games â€” you're watching sports and clicking buttons, not at a desk. Many grinders consider this 'free money on top of entertainment.'"],
    ["State matters","More legal sportsbooks in your state = more promos = more income. NJ, PA, CO, MI have the most books. Some states only have 2-3."],
  ]}/></div>);
};

// â•â•â• PROMO FINDER WIZARD â•â•â•
const PromoFinder = () => {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(null);
  const navigate = useNavigate();
  const go = (slug) => navigate('/'+slug);
  const reset = () => { setStep(0); setAnswer(null); };
  const Opt = ({label,sub,onClick}) => (
    <button onClick={onClick} style={{width:"100%",padding:"12px 16px",background:K.s2,border:`1px solid ${K.bd2}`,borderRadius:8,color:K.tx,cursor:"pointer",textAlign:"left",marginBottom:8,fontFamily:font}}>
      <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:2}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:K.mt}}>{sub}</div>}
    </button>
  );
  const Result = ({title,desc,slug}) => (
    <div style={{padding:"16px",background:`${K.gn}08`,border:`1px solid ${K.gn}30`,borderRadius:8}}>
      <div style={{fontSize:14,fontWeight:700,color:K.gn,marginBottom:6}}>{title}</div>
      <div style={{fontSize:12,color:K.dm,marginBottom:12,lineHeight:1.6}}>{desc}</div>
      <button onClick={()=>go(slug)} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Open Calculator â†’</button>
      <button onClick={reset} style={{marginLeft:10,padding:"9px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Start Over</button>
    </div>
  );
  return (<div style={S.card}>
    <Tl t="Promo Finder" badge="WHICH CALCULATOR?" bc={K.ac}/>
    {step===0&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>What kind of promo do you have?</div>
      <Opt label="Bonus Bet / Free Bet" sub="The sportsbook gave you a bet credit (e.g. '$200 bonus bet')" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Profit Boost Token" sub="A token that increases your winnings by a percentage (e.g. '50% profit boost')" onClick={()=>{setAnswer('boost');setStep(10);}}/>
      <Opt label="First Bet Insurance / Safety Net" sub="Your first real-cash bet is refunded if it loses" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
      <Opt label="Deposit Match" sub="The book matches a percentage of your deposit" onClick={()=>{setAnswer('deposit');setStep(10);}}/>
      <Opt label="SGP / Parlay Insurance" sub="Get bonus bets back if your same-game parlay loses" onClick={()=>{setAnswer('insurance');setStep(10);}}/>
      <Opt label="I'm not sure" sub="Answer a few questions to find out" onClick={()=>setStep(1)}/>
    </>}
    {step===1&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>Did the sportsbook give you a credit/token, or boost your winnings on a real bet?</div>
      <Opt label="They gave me a credit or token" sub="Something in my account I can 'use' on a bet" onClick={()=>setStep(2)}/>
      <Opt label="They boost my winnings if I win" sub="I'm betting my own money but get extra if I win" onClick={()=>{setAnswer('boost');setStep(10);}}/>
    </>}
    {step===2&&<>
      <div style={{fontSize:12,color:K.dm,marginBottom:14}}>If your bet using this credit wins, do you get your stake back?</div>
      <Opt label="No â€” I only get the profit, not the credit back" sub="The stake is NOT returned" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Yes â€” I get everything back if it wins" sub="Acts like a real cash bet" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
    </>}
    {step===10&&(()=>{
      const m = {
        bonus: {title:"Use: Bonus Bet Converter",desc:"Enter your bonus bet size, the odds you're placing it at, and the hedge odds. The calculator tells you exactly how much to hedge to lock in profit.",slug:"bonus-bet"},
        boost: {title:"Use: Profit Boost Converter",desc:"Enter your stake, the original odds, the boost percentage, and the max extra winnings. The calculator shows your effective odds and the hedge amount.",slug:"profit-boost"},
        firstbet: {title:"Use: First Bet Safety Net Hedge",desc:"Enter your first bet amount, the odds, and hedge odds. This locks in a small profit if your bet wins â€” and if it loses, you get bonus bets to convert.",slug:"first-bet"},
        deposit: {title:"Use: Deposit Match Calculator",desc:"Enter your deposit amount, match percentage, rollover, and average vig to find the true net value of the bonus.",slug:"deposit-match"},
        insurance: {title:"Use: Promo Insurance Calculator",desc:"Enter your stake, insurance percentage, and bonus conversion rate to find your effective net cost if the bet loses.",slug:"insurance"},
      };
      const res = m[answer];
      return res?<Result {...res}/>:<div style={{color:K.mt,fontSize:12}}>Not sure â€” try the Knowledge Base for a full overview.</div>;
    })()}
  </div>);
};

// â•â•â• QUICK CALC PANEL â•â•â•
const QuickCalcPanel = ({ goTo }) => {
  const [open, setOpen] = useState(false);
  const quickItems = [
    {n:"Bonus Bet",gi:1,ti:0},
    {n:"Profit Boost",gi:1,ti:1},
    {n:"No-Vig",gi:2,ti:0},
    {n:"+EV",gi:2,ti:2},
    {n:"2-Way Arb",gi:2,ti:4},
  ];
  return (
    <div className="pg-quick-calc" style={{position:"fixed",bottom:64,left:12,zIndex:200}}>
      <style>{`@media (min-width: 769px) { .pg-quick-calc { display: none !important; } }`}</style>
      {open&&<div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:10,padding:10,marginBottom:8,boxShadow:"0 4px 16px rgba(0,0,0,0.5)",minWidth:140}}>
        {quickItems.map(item=>(
          <button key={item.n} onClick={()=>{goTo(item.gi,item.ti);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 12px",background:"transparent",border:"none",color:K.tx,cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:font,borderBottom:`1px solid ${K.bd}`,borderRadius:0}}>
            {item.n}
          </button>
        ))}
      </div>}
      <button onClick={()=>setOpen(o=>!o)} style={{padding:"7px 14px",background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:20,color:K.ac,fontSize:11,cursor:"pointer",fontFamily:font,fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>
        {open?"âœ• Close":"âš¡ Quick"}
      </button>
    </div>
  );
};

// â•â•â• CALC SEARCH (keyboard ?) â•â•â•
const CalcSearch = ({ allCalcs, onNavigate, onClose }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{
    const handler = e => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[onClose]);
  const filtered = q.trim() ? allCalcs.filter(c=>c.n.toLowerCase().includes(q.toLowerCase())||c.group.toLowerCase().includes(q.toLowerCase())) : allCalcs;
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80,padding:"80px 16px 16px"}}>
      <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:20,width:"100%",maxWidth:480,maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search calculatorsâ€¦" style={{...S.input,fontSize:14,marginBottom:12}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.map(c=>(
            <button key={c.slug} onClick={()=>{onNavigate(c.slug);onClose();}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"10px 12px",background:"transparent",border:"none",borderBottom:`1px solid ${K.bd}`,color:K.tx,cursor:"pointer",textAlign:"left",fontFamily:font}}>
              <span style={{fontSize:13,fontWeight:500}}>{c.n}</span>
              <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>{c.group}</span>
            </button>
          ))}
          {!filtered.length&&<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No matches</div>}
        </div>
        <div style={{fontSize:10,color:K.mt,marginTop:8,textAlign:"center"}}>Press Esc to close Â· Press ? anywhere to reopen</div>
      </div>
    </div>
  );
};

// â•â•â• MOBILE BOTTOM NAV â•â•â•
const MobileBottomNav = ({ gi, goTo }) => {
  const icons = ["ðŸ ","âš¡","ðŸ“Š","ðŸ“ˆ","ðŸ”´","ðŸ“š"];
  const labels = ["Home","Convert","Calc","Track","Live","Learn"];
  return (
    <div className="pg-mobile-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:K.s1,borderTop:`1px solid ${K.bd}`,display:"flex",zIndex:100,padding:"4px 0 env(safe-area-inset-bottom,0px)"}}>
      <style>{`@media (min-width: 769px) { .pg-mobile-nav { display: none !important; } } @media (max-width: 768px) { .pg-main-content { padding-bottom: 72px !important; } }`}</style>
      {TABS.map((t,i)=>(
        <button key={t.group} onClick={()=>goTo(i,0)} style={{flex:1,padding:"6px 4px",background:"none",border:"none",color:gi===i?K.gn:K.mt,cursor:"pointer",fontSize:9,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:font,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:18}}>{icons[i]}</span>
          <span style={{fontWeight:gi===i?700:400}}>{labels[i]}</span>
        </button>
      ))}
    </div>
  );
};

// â•â•â• CSV IMPORT MODAL â•â•â•
const CSVImportModal = ({ onImport, onClose }) => {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const parse = () => {
    try {
      const lines = raw.trim().split('\n').filter(Boolean);
      if(lines.length<2) { setError('Need at least a header row and one data row'); return; }
      const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
      const rows = lines.slice(1).map(line=>{
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)||[];
        const obj = {};
        headers.forEach((h,i)=>{ obj[h]=(cols[i]||'').replace(/"/g,'').trim(); });
        return obj;
      });
      const mapped = rows.map((r,i)=>({
        id: Date.now()+i,
        date: r.date||r['settled date']||r['place date']||new Date().toISOString().split('T')[0],
        book: r.book||r.sportsbook||'Imported',
        type: r.type||r['bet type']||'Moneyline',
        odds: r.odds||r.price||r['bet odds']||'+100',
        stake: (r.stake||r['risk']||r['wager']||'0').replace('$',''),
        toWin: (r['to win']||r.towin||r.profit||'0').replace('$',''),
        status: (r.status||r.result||'open').toLowerCase().replace('win','won').replace('loss','lost'),
        notes: r.description||r.notes||r.event||'',
      }));
      setPreview(mapped.slice(0,5));
      setError(null);
    } catch(e) { setError('Parse error: '+e.message); }
  };
  const confirm = () => {
    try {
      const lines = raw.trim().split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h=>h.replace(/"/g,'').trim().toLowerCase());
      const rows = lines.slice(1).map((line,i)=>{
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g)||[];
        const obj={};
        headers.forEach((h,j)=>{ obj[h]=(cols[j]||'').replace(/"/g,'').trim(); });
        return {
          id:Date.now()+i,
          date:obj.date||obj['settled date']||obj['place date']||new Date().toISOString().split('T')[0],
          book:obj.book||obj.sportsbook||'Imported',
          type:obj.type||obj['bet type']||'Moneyline',
          odds:obj.odds||obj.price||obj['bet odds']||'+100',
          stake:(obj.stake||obj['risk']||obj['wager']||'0').replace('$',''),
          toWin:(obj['to win']||obj.towin||obj.profit||'0').replace('$',''),
          status:(obj.status||obj.result||'open').toLowerCase().replace('win','won').replace('loss','lost'),
          notes:obj.description||obj.notes||obj.event||'',
        };
      });
      onImport(rows);
      onClose();
    } catch(e) { setError('Import failed: '+e.message); }
  };
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:24,width:"100%",maxWidth:560,maxHeight:"80vh",overflow:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
        <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:4,fontFamily:fontD}}>Import Bets from CSV</div>
        <div style={{fontSize:11,color:K.dm,marginBottom:16}}>Paste your DraftKings, FanDuel, or any sportsbook CSV export below. Headers are auto-detected.</div>
        <textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder={"date,book,odds,stake,status\n2026-03-01,DraftKings,+150,50,won"} style={{...S.input,height:120,resize:"vertical",marginBottom:8,fontFamily:"monospace",fontSize:11}}/>
        {error&&<div style={{fontSize:11,color:K.rd,marginBottom:8}}>{error}</div>}
        {preview.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:K.mt,marginBottom:6,textTransform:"uppercase",letterSpacing:"1.5px"}}>Preview ({preview.length} of {raw.trim().split('\n').length-1} rows)</div>
          {preview.map((r,i)=><div key={i} style={{fontSize:11,color:K.dm,padding:"4px 0",borderBottom:`1px solid ${K.bd}`}}>{r.date} Â· {r.book} Â· {r.odds} Â· ${r.stake} Â· <span style={{color:r.status==="won"?K.gn:r.status==="lost"?K.rd:K.yl}}>{r.status}</span></div>)}
        </div>}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={parse} style={{flex:1,padding:"9px",background:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Parse CSV</button>
          {preview.length>0&&<button onClick={confirm} style={{flex:1,padding:"9px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Import {raw.trim().split('\n').length-1} Bets</button>}
          <button onClick={onClose} style={{padding:"9px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font}}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// US_BOOK_STATES â†’ ./components/Tracker.jsx
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// PROMO_SCHED + DAYS_ORDER â†’ ./data/promoSchedule.js
const PromoAlertPrefs = () => {
  const [alertEmail,setAlertEmail]=useState("");
  const [alertPrefs,setAlertPrefs]=useState(()=>{try{return JSON.parse(localStorage.getItem('pg_alert_prefs')||'null')||{aGradeOnly:false,allPromos:true,dailyDigest:true,books:{}};}catch{return {aGradeOnly:false,allPromos:true,dailyDigest:true,books:{}};}});
  const [alertSaved,setAlertSaved]=useState(false);
  const saveAlertPrefs=()=>{
    try{localStorage.setItem('pg_alert_prefs',JSON.stringify({...alertPrefs,email:alertEmail}));}catch(e){}
    setAlertSaved(true); setTimeout(()=>setAlertSaved(false),3000);
  };
  return (<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:4}}>
    <div style={{fontSize:12,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Get Promo Alerts</div>
    <div style={{marginBottom:10}}><label style={S.label}>Email (optional)</label><input style={{...S.input,maxWidth:300}} type="email" value={alertEmail} onChange={e=>setAlertEmail(e.target.value)} placeholder="your@email.com"/></div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>
      {[["aGradeOnly","A-Grade promos only"],["allPromos","All promos"],["dailyDigest","Daily digest"]].map(([k,l])=>(
        <label key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:K.dm,cursor:"pointer"}}>
          <input type="checkbox" checked={alertPrefs[k]||false} onChange={e=>setAlertPrefs(p=>({...p,[k]:e.target.checked}))} style={{accentColor:K.ac}}/>
          {l}
        </label>
      ))}
    </div>
    <div style={{marginBottom:10}}>
      <div style={S.label}>Books</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[...new Set(PROMO_SCHED.map(p=>p.book))].map(b=>(
          <label key={b} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:K.dm,cursor:"pointer"}}>
            <input type="checkbox" checked={alertPrefs.books?.[b]||false} onChange={e=>setAlertPrefs(p=>({...p,books:{...p.books,[b]:e.target.checked}}))} style={{accentColor:K.ac}}/>
            {b}
          </label>
        ))}
      </div>
    </div>
    <button onClick={saveAlertPrefs} style={{padding:"7px 16px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Save Alert Preferences</button>
    {alertSaved&&<div style={{fontSize:11,color:K.gn,marginTop:8}}>âœ“ Alerts configured â€” you&apos;ll be notified when high-value promos are available</div>}
    <Nt c={K.mt}>Email alerts coming soon â€” your preferences are saved and will activate when the feature launches.</Nt>
  </div>);
};
const PromoROITable = ({ promoValueHistory }) => {
  const [open, setOpen] = useState(false);
  const rows = useMemo(()=>{
    const entries = Object.entries(promoValueHistory||{});
    if(!entries.length) return [];
    return entries.map(([key,hist])=>{
      const vals = hist.map(h=>h.value);
      const avg = vals.reduce((s,v)=>s+v,0)/vals.length;
      const best = Math.max(...vals);
      const last = vals[vals.length-1];
      return {name:key,avg:f(avg),best:f(best),last:f(last),count:vals.length};
    }).sort((a,b)=>parseFloat(b.avg)-parseFloat(a.avg));
  },[promoValueHistory]);
  return (
    <div style={{...S.card,marginTop:12}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",textAlign:"left",color:K.ac,fontSize:11,fontWeight:700,cursor:"pointer",padding:0,fontFamily:font,display:"flex",justifyContent:"space-between",alignItems:"center",textTransform:"uppercase",letterSpacing:"1.5px"}}>
        Promo Performance Table <span style={{color:K.mt,fontSize:10}}>{open?"â–²":"â–¼"}</span>
      </button>
      {open&&<div style={{marginTop:12}}>
        {rows.length===0
          ?<div style={{fontSize:11,color:K.mt}}>Click <strong style={{color:K.ac}}>ðŸ“ˆ Track Value</strong> on any promo in the calendar to start building this table.</div>
          :<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Rank","Promo","Avg Value","Reports","Best"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.name}>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:i<3?K.yl:K.mt,fontWeight:700}}>#{i+1}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600,color:K.tx,maxWidth:200}}>{r.name.replace(/-/g,' ')}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700}}>${r.avg}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{r.count}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.yl}}>${r.best}</td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>}
    </div>
  );
};

const PromoCalendar = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const [filterBook, setFilterBook] = useState("All");
  const [filterDay, setFilterDay] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [filterComplexity, setFilterComplexity] = useState("All");
  const [marketFilter, setMarketFilter] = useState("All");
  const [now, setNow] = useState(()=>Date.now());
  useEffect(()=>{
    const id=setInterval(()=>setNow(Date.now()),60000);
    return ()=>clearInterval(id);
  },[]);
  const [historyOpen, setHistoryOpen] = useState({});
  const [alertPrefs, setAlertPrefs] = useState(()=>{ try{return JSON.parse(localStorage.getItem('pg_alert_prefs')||'{}');}catch{return {};} });
  const toggleAlert = async (p) => {
    const key=`${p.book}-${p.promo}`;
    const current=alertPrefs[key]?.alert||false;
    if(!current&&typeof Notification!=='undefined'&&Notification.permission!=='granted') {
      await Notification.requestPermission().catch(()=>{});
    }
    const next={...alertPrefs,[key]:{alert:!current,targetDate:p.expires||''}};
    setAlertPrefs(next);
    try{localStorage.setItem('pg_alert_prefs',JSON.stringify(next));}catch{}
  };
  const UK_BOOKS_SET = new Set(["bet365 UK","Betway UK","William Hill","Paddy Power","Sky Bet"]);
  const filtered = useMemo(()=>PROMO_SCHED.filter(p=>{
    if(marketFilter==="US"&&UK_BOOKS_SET.has(p.book)) return false;
    if(marketFilter==="UK"&&!UK_BOOKS_SET.has(p.book)) return false;
    return (filterBook==="All"||p.book===filterBook)&&(filterDay==="All"||p.day===filterDay)&&(filterGrade==="All"||p.grade===filterGrade)&&(filterComplexity==="All"||p.complexity===filterComplexity);
  }),[marketFilter,filterBook,filterDay,filterGrade,filterComplexity]);
  const typeColor={Recurring:K.gn,Weekly:K.ac,Weekend:K.pp};
  const complexityColor={Easy:K.gn,Medium:K.yl,Hard:K.rd};
  const trackValue = (promo, value) => {
    const key = `${promo.book}-${promo.promo}`;
    const history = data.promoValueHistory||{};
    const prev = history[key]||[];
    syncAppData({...data, promoValueHistory:{...history,[key]:[...prev,{date:new Date().toISOString().split('T')[0],value}].slice(-6)}});
  };
  const exportICS = () => {
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PromoGrind//EN","CALSCALE:GREGORIAN"];
    const today2=new Date();
    const ymd=(d)=>`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const dayMap={Monday:"MO",Tuesday:"TU",Wednesday:"WE",Thursday:"TH",Friday:"FR",Saturday:"SA",Sunday:"SU"};
    filtered.forEach((p,i)=>{
      const dtstart=`${ymd(today2)}T080000`;
      const dtend=`${ymd(today2)}T090000`;
      let rrule="RRULE:FREQ=DAILY";
      if(p.day==="Weekend") rrule="RRULE:FREQ=WEEKLY;BYDAY=SA,SU";
      else if(dayMap[p.day]) rrule=`RRULE:FREQ=WEEKLY;BYDAY=${dayMap[p.day]}`;
      lines.push("BEGIN:VEVENT",`UID:promogrind-${i}-${Date.now()}@vaultsparkstudios.com`,`DTSTART;TZID=America/New_York:${dtstart}`,`DTEND;TZID=America/New_York:${dtend}`,`SUMMARY:${p.book} - ${p.promo}`,`DESCRIPTION:Est. Value: ${p.value} | Grade: ${p.grade}`,rrule,"END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadFile(lines.join("\r\n"), "promogrind-calendar.ics", "text/calendar");
  };
  return (<div><div style={S.card}><Tl t="Promo Calendar" badge="RECURRING $$$" bc={K.gn} shareable/>
    <div style={{...S.note(K.ac),marginBottom:12}}>These are the predictable recurring promos across all major books. Stack them daily for $150â€“450/mo in passive profit on top of welcome bonuses.</div>
    <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",whiteSpace:"nowrap"}}>Market:</span>
      {["All","US","UK"].map(m=>(
        <button key={m} onClick={()=>{setMarketFilter(m);setFilterBook("All");}} style={{padding:"4px 12px",background:marketFilter===m?K.ac:"transparent",border:`1px solid ${marketFilter===m?K.ac:K.bd2}`,borderRadius:50,color:marketFilter===m?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,fontWeight:600,whiteSpace:"nowrap"}}>
          {m==="UK"?"ðŸ‡¬ðŸ‡§ UK":m==="US"?"ðŸ‡ºðŸ‡¸ US":"ðŸŒŽ All"}
        </button>
      ))}
      {marketFilter==="UK"&&<span style={{fontSize:9,color:K.pp,marginLeft:4}}>bet365 Â· Betway Â· William Hill Â· Paddy Power Â· Sky Bet</span>}
      {marketFilter==="US"&&<span style={{fontSize:9,color:K.ac,marginLeft:4}}>DraftKings Â· FanDuel Â· BetMGM Â· Caesars Â· ESPN BET Â· Fanatics Â· BetRivers</span>}
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(PROMO_SCHED.filter(p=>marketFilter==="All"||(marketFilter==="UK"?UK_BOOKS_SET.has(p.book):!UK_BOOKS_SET.has(p.book))).map(p=>p.book))].map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterDay} onChange={e=>setFilterDay(e.target.value)}>
        <option value="All">All Days</option>
        {DAYS_ORDER.map(d=><option key={d}>{d}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterGrade||"All"} onChange={e=>setFilterGrade(e.target.value)}>
        <option value="All">All Grades</option>
        <option value="A">A â€” Best Value</option>
        <option value="B">B â€” Good Value</option>
        <option value="C">C â€” Situational</option>
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterComplexity} onChange={e=>setFilterComplexity(e.target.value)}>
        <option value="All">All Complexity</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <button onClick={exportICS} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",fontWeight:600}}>ðŸ“… Export to Calendar</button>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Book","Day","Promo","Est. Value","Type","Grade","Complexity","Time","Track","ðŸ””",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map((p,i)=>{
          const key=`${p.book}-${p.promo}`;
          const hist=(data.promoValueHistory||{})[key]||[];
          const showHist=historyOpen[key];
          const alertOn=alertPrefs[key]?.alert||false;
          return (<React.Fragment key={i}>
            <tr>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{p.book}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{p.day}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{p.promo}{p.expires&&(()=>{const ms=new Date(p.expires)-now;if(ms<=0)return<span style={{...S.tag(K.rd),marginLeft:4,fontSize:8}}>EXPIRED</span>;const hrs=Math.floor(ms/3600000);const mins=Math.floor((ms%3600000)/60000);return<span title={`Expires: ${p.expires}`} style={{...S.tag(K.yl),marginLeft:4,fontSize:8}}>{hrs>0?`${hrs}h ${mins}m`:`${mins}m`} left</span>;})()}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{p.value}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(typeColor[p.type]||K.mt)}>{p.type}</span></td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <span style={S.tag(p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)}>{p.grade||"B"}</span>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <span style={S.tag(complexityColor[p.complexity]||K.mt)}>{p.complexity||"Easy"}</span>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.mt,fontSize:11,whiteSpace:"nowrap"}}>{p.timeMin?`~${p.timeMin}m`:"â€”"}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <button onClick={()=>{const val=prompt(`Enter value realized for ${p.promo} (e.g. 12.50):`);if(val&&!isNaN(parseFloat(val)))trackValue(p,parseFloat(val));}} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${K.gn}`,borderRadius:4,color:K.gn,fontSize:9,cursor:"pointer",fontFamily:font}}>Track Value</button>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {typeof Notification!=='undefined'&&<button onClick={()=>toggleAlert(p)} style={{padding:"2px 6px",background:alertOn?`${K.yl}15`:"transparent",border:`1px solid ${alertOn?K.yl:K.bd2}`,borderRadius:4,color:alertOn?K.yl:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{alertOn?"ðŸ”” On":"ðŸ”” Off"}</button>}
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {hist.length>0&&<button onClick={()=>setHistoryOpen(h=>({...h,[key]:!h[key]}))} style={{padding:"2px 6px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{showHist?"â–²":"History"}</button>}
              </td>
            </tr>
            {showHist&&hist.length>0&&<tr><td colSpan={10} style={{padding:"8px 12px",borderBottom:`1px solid ${K.bd}`,background:K.s2}}>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",marginBottom:4}}>
                {hist.map((h,j)=>{
                  const maxV=Math.max(...hist.map(x=>x.value),1);
                  const pct=Math.round(h.value/maxV*32);
                  return (<div key={j} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:16,background:K.gn,height:pct,borderRadius:"2px 2px 0 0",minHeight:2}}/>
                    <div style={{fontSize:8,color:K.mt}}>${h.value}</div>
                  </div>);
                })}
              </div>
              <div style={{fontSize:9,color:K.mt}}>Last {hist.length} tracked values Â· Latest: ${hist[hist.length-1].value} on {hist[hist.length-1].date}</div>
            </td></tr>}
          </React.Fragment>);
        })}</tbody>
      </table>
    </div>
  </div>
  <PromoAlertPrefs/>
  <PromoROITable promoValueHistory={data.promoValueHistory||{}}/>
  <Help entries={[
    ["Why track recurring promos","Welcome bonuses are one-time. Recurring promos are the engine of long-term profit. A serious matched bettor extracts $150-450/mo just from daily boosts across 5-6 books."],
    ["How to use this","Every morning, open each sportsbook app and check for available boosts. Cross-reference this calendar so you know what to look for. Use the Profit Boost converter to calculate each one."],
    ["Profit boosts are the best","They come daily, they require no outcome risk when hedged, and they compound. At $10 profit per boost Ã— 3 boosts/day Ã— 30 days = $900/mo."],
  ]}/></div>);
};

// â•â•â• REFERRAL HUB â•â•â•
// â•â•â• GIFT TRIAL BOX â•â•â•
function GiftTrialBox() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [giftLink, setGiftLink] = React.useState('');
  const send = async () => {
    if (!email.includes('@')) return;
    setStatus('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');
      const { data, error } = await supabase.functions.invoke('gift-trial', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { recipientEmail: email },
      });
      if (error) throw error;
      setGiftLink(data?.giftUrl || '');
      setStatus('sent');
    } catch (e) { setStatus('error'); }
  };
  if (status === 'sent') return (
    <div style={{padding:'10px 12px',background:'#1e3a2f',borderRadius:6,border:'1px solid #4ade8040'}}>
      <div style={{fontSize:12,color:'#4ade80',fontWeight:700,marginBottom:6}}>âœ“ Gift sent to {email}</div>
      {giftLink && <div style={{fontSize:10,color:'#64748b',wordBreak:'break-all'}}>Gift link: <span style={{color:'#60a5fa'}}>{giftLink}</span></div>}
      <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>They'll get an email with 14-day Pro access. You earned 7 bonus days.</div>
    </div>
  );
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input type="email" placeholder="friend@email.com" value={email} onChange={e=>setEmail(e.target.value)}
        style={{flex:1,minWidth:180,padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:6,color:'#e2e8f0',fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',boxSizing:'border-box'}}
        onKeyDown={e=>e.key==='Enter'&&send()}
      />
      <button onClick={send} disabled={status==='loading'||!email.includes('@')}
        style={{padding:'8px 16px',background:email.includes('@')?'#4ade80':'#1e293b',border:'none',borderRadius:6,color:email.includes('@')?'#0a0e17':'#475569',fontWeight:700,fontSize:12,cursor:email.includes('@')?'pointer':'not-allowed',whiteSpace:'nowrap',opacity:status==='loading'?0.7:1}}>
        {status==='loading'?'Sendingâ€¦':'Send Gift â†’'}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:'#f87171',width:'100%'}}>Failed â€” check the email or try again.</div>}
    </div>
  );
}

const ReferralHub = () => {
  const [copied, setCopied] = useState(false);
  const [refCount, setRefCount] = useState(null);
  const [userId, setUserId] = useState(null);
  const [rhUser, setRhUser] = useState(null);
  const [influencerCode, setInfluencerCode] = React.useState('');
  const [savedInfluencerCode, setSavedInfluencerCode] = React.useState('');
  const [influencerStats, setInfluencerStats] = React.useState({ clicks: 0, signups: 0 });
  const rhIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };
  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}})=>{
      if(session) {
        setUserId(session.user.id);
        setRhUser(session.user);
        try {
          const { data } = await supabase.rpc('get_my_referral_count');
          setRefCount(typeof data === 'number' ? data : 0);
        } catch(e) { setRefCount(0); }
        if(rhIsPro()) {
          supabase.from('influencer_codes').select('code, clicks, signups').eq('user_id', session.user.id).single()
            .then(({ data }) => {
              if (data) {
                setSavedInfluencerCode(data.code);
                setInfluencerCode(data.code);
                setInfluencerStats({ clicks: data.clicks || 0, signups: data.signups || 0 });
              }
            });
        }
      }
    });
  },[]);
  const saveInfluencerCode = async () => {
    if (!influencerCode.trim() || influencerCode.length < 3 || !rhUser) return;
    const { error } = await supabase.from('influencer_codes').upsert({ user_id: rhUser.id, code: influencerCode }, { onConflict: 'user_id' });
    if (!error) setSavedInfluencerCode(influencerCode);
  };
  const refLink = userId ? `${CANONICAL_APP_URL}?ref=${userId}` : "Loadingâ€¦";
  const copy = () => { try{navigator.clipboard.writeText(refLink); trackEvent('referral_shared'); localStorage.setItem('pg_referral_shared','1');}catch(e){} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (<div><div style={S.card}><Tl t="Refer &amp; Earn" badge="FREE VAULTSPARKED" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:16}}>Share your link. When a friend signs up and subscribes to VaultSparked, you both get <strong>30 days free</strong>. No limit on referrals.</div>
    <div style={{marginBottom:16}}>
      <div style={S.label}>Your Referral Link</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{...S.input,flex:1,color:K.dm,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"default"}}>{refLink}</div>
        <button onClick={copy} style={{padding:"8px 16px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"âœ“ Copied!":"Copy Link"}</button>
      </div>
    </div>
    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>YOUR REFERRALS</div><div style={S.big(K.pp)}>{refCount===null?'â€¦':refCount}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>FREE DAYS EARNED</div><div style={S.big(K.gn)}>{refCount===null?'â€¦':(refCount||0)*30}</div></div>
    </div>
    <div style={{marginTop:16,padding:12,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Share on</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label:"Twitter/X",color:"#1DA1F2",msg:`I've been making extra income every month using PromoGrind â€” free sportsbook promo conversion tools. Way better than paying $99/mo for OddsJam. Check it out: ${refLink}`},
          {label:"Discord",color:"#5865F2",msg:`**PromoGrind** â€” free matched betting tools. 22 calculators, live arb scanner. Sign up free: ${refLink}`},
          {label:"Reddit",color:"#FF4500",msg:`Has anyone else been using PromoGrind? It's free and has all the calculators you need for promo conversion. Link: ${refLink}`},
        ].map(({label,color,msg})=>(
          <button key={label} onClick={()=>{try{navigator.clipboard.writeText(msg);}catch(e){} }} style={{padding:"6px 14px",background:`${color}15`,border:`1px solid ${color}40`,borderRadius:6,color,fontSize:11,cursor:"pointer",fontFamily:font}}>Copy {label} Post</button>
        ))}
      </div>
    </div>
    {rhIsPro() && (
      <div style={{marginTop:24,padding:16,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8}}>
        <div style={{fontWeight:700,color:'#4ade80',marginBottom:12}}>âš¡ Creator Mode</div>
        <p style={{color:'#94a3b8',fontSize:13,marginBottom:16}}>
          Create a custom vanity link to share with your audience. Track clicks and signups in real time.
        </p>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input
            type="text"
            placeholder="your-brand (letters/numbers/hyphens)"
            value={influencerCode}
            onChange={e => setInfluencerCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,30))}
            style={{flex:1,padding:'8px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}
          />
          <button
            onClick={saveInfluencerCode}
            style={{padding:'8px 16px',background:'#4ade80',color:'#0a0e17',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13}}
          >Save Code</button>
        </div>
        {savedInfluencerCode && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>{influencerStats.clicks}</div>
                <div style={{fontSize:11,color:'#64748b'}}>CLICKS</div>
              </div>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>{influencerStats.signups}</div>
                <div style={{fontSize:11,color:'#64748b'}}>SIGNUPS</div>
              </div>
              <div style={{padding:12,background:'#0a0e17',borderRadius:6,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:700,color:'#4ade80'}}>${(influencerStats.signups * 8).toFixed(0)}</div>
                <div style={{fontSize:11,color:'#64748b'}}>EST. VALUE</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input
                readOnly
                value={`${CANONICAL_APP_URL}?ref=${savedInfluencerCode}`}
                style={{flex:1,padding:'8px 12px',background:'#0a0e17',border:'1px solid #1e293b',color:'#94a3b8',borderRadius:6,fontSize:12}}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(`${CANONICAL_APP_URL}?ref=${savedInfluencerCode}`); }}
                style={{padding:'8px 12px',background:'#1e293b',border:'none',color:'#e2e8f0',borderRadius:6,cursor:'pointer',fontSize:13}}
              >Copy</button>
            </div>
          </>
        )}
      </div>
    )}
    <div style={{marginTop:20,padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>ðŸŽ Gift 14 Days Free</div>
      <div style={{fontSize:11,color:K.dm,marginBottom:12,lineHeight:1.6}}>Give a friend 14 days of VaultSparked Pro for free. They get the Live Scanner, +EV Scanner, and all Pro tools. You earn 7 bonus days when they sign up.</div>
      <GiftTrialBox/>
    </div>
  </div></div>);
};

// â•â•â• COMPETITOR COMPARISON â•â•â•
const CompetitorComparison = () => (
  <div><div style={S.card}>
    <Tl t="PromoGrind vs The Competition" badge="WHY FREE WINS" bc={K.gn}/>
    <Nt c={K.gn}>PromoGrind is permanently free for all 27 calculators, tracker, and knowledge base. Competitors charge $49â€“$199/month for similar tools.</Nt>
    <div style={{overflowX:"auto",marginTop:16}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead>
          <tr>
            {["Feature","PromoGrind","OddsJam","ProfitDuel","Spreadsheet"].map((h,i)=>(
              <th key={h} style={{textAlign:"left",padding:"8px 10px",borderBottom:`1px solid ${K.bd2}`,color:i===1?K.gn:K.mt,fontSize:10,textTransform:"uppercase",letterSpacing:"1px",fontWeight:i===1?700:500,background:i===1?`${K.gn}05`:"transparent"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ["Price","Free","$99â€“$199/mo","$49â€“$99/mo","Free"],
            ["Bonus Bet Converter","âœ“","âœ“","âœ“","Manual"],
            ["Profit Boost Converter","âœ“","âœ“","âœ“","Manual"],
            ["Arb Calculator","âœ“","âœ“","âœ“","Manual"],
            ["No-Vig / +EV Calculator","âœ“","âœ“","âœ“","Manual"],
            ["Live Arb Scanner","âœ“ (Pro $24.99/mo)","âœ“ Included","âœ“ Included","âœ—"],
            ["P/L Ledger & Tracker","âœ“","Limited","âœ“","Manual"],
            ["Cloud Sync","âœ“","âœ“","âœ“","âœ—"],
            ["Mobile PWA","âœ“","âœ—","âœ—","âœ—"],
            ["Knowledge Base","âœ“ Full guide","Limited","Limited","âœ—"],
            ["CSV Import/Export","âœ“","âœ—","âœ—","Manual"],
            ["Referral Program","âœ“","âœ—","âœ—","âœ—"],
            ["Push Notifications","âœ“","âœ—","âœ—","âœ—"],
            ["Total 27 Calculators","âœ“","~10","~15","DIY"],
          ].map(([feature,...vals])=>(
            <tr key={feature}>
              <td style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:K.dm,fontSize:11}}>{feature}</td>
              {vals.map((v,i)=>(
                <td key={i} style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:i===0?K.gn:v==="âœ—"?K.rd:K.dm,fontWeight:i===0?600:400,background:i===0?`${K.gn}03`:"transparent",fontSize:11}}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{marginTop:16,padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:6}}>The Bottom Line</div>
      <div style={{fontSize:12,color:K.dm,lineHeight:1.7}}>
        OddsJam and ProfitDuel are excellent tools â€” but they charge $99â€“$199/month for a calculator suite that is fundamentally free math. PromoGrind gives you every calculator free, forever. The only paid feature is the live Arb/+EV scanner ($24.99/mo vs $99â€“199/mo), which pays for itself in the first hour of use.
      </div>
    </div>
  </div></div>
);

// â•â•â• TEAM ACCOUNTS (COMING SOON) â•â•â•
const TeamAccounts = () => {
  const [taUser, setTaUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loadingTeam, setLoadingTeam] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoadingTeam(false); return; }
      const u = session.user;
      setTaUser(u);
      const { data } = await supabase.from('team_accounts').select('*').eq('owner_id', u.id).single();
      if (data) {
        setTeam(data);
        supabase.from('team_members').select('*').eq('team_id', data.id)
          .then(({ data: m }) => setMembers(m || []));
      }
      setLoadingTeam(false);
    });
  }, []);
  const createTeam = async () => {
    if (!teamName.trim() || !taUser) return;
    const { data } = await supabase.from('team_accounts').insert({ owner_id: taUser.id, name: teamName }).select().single();
    if (data) {
      setTeam(data);
      await supabase.from('team_members').insert({ team_id: data.id, user_id: taUser.id, role: 'owner', status: 'active', invited_email: taUser.email });
      setMembers([{ id: Date.now(), team_id: data.id, user_id: taUser.id, role: 'owner', status: 'active', invited_email: taUser.email }]);
    }
  };
  const inviteMember = async () => {
    if (!inviteEmail.trim() || !team) return;
    await supabase.from('team_members').insert({ team_id: team.id, invited_email: inviteEmail, role: 'member', status: 'pending' });
    setInviteEmail('');
    const { data: m } = await supabase.from('team_members').select('*').eq('team_id', team.id);
    setMembers(m || []);
  };
  return (<div><div style={S.card}><Tl t="Team Accounts" badge="BETA" bc={K.pp}/>
    {loadingTeam ? (
      <div style={{textAlign:'center',padding:32}}><LoadingState label="Loading teamâ€¦"/></div>
    ) : !team ? (
      <div>
        <div style={{fontWeight:700,color:K.tx,fontSize:18,marginBottom:8}}>Create Your Team Vault</div>
        <div style={{color:K.dm,fontSize:13,marginBottom:20}}>
          Team accounts let you share a vault, split P&amp;L, and coordinate promo hunting with a group. $49.99/mo for the whole team.
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input
            placeholder="Team name (e.g. Promo Squad)"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            style={{...S.input,flex:1,padding:'10px 14px',fontSize:14}}
          />
          <button onClick={createTeam} style={{padding:'10px 20px',background:K.pp,color:K.bg,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontFamily:font}}>
            Create Team
          </button>
        </div>
        <div style={{padding:16,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontWeight:600,color:K.gn,marginBottom:8}}>Included with Team ($49.99/mo)</div>
          <ul style={{color:K.dm,fontSize:13,paddingLeft:20,lineHeight:2}}>
            <li>Shared P/L Ledger â€” see combined profits across all members</li>
            <li>Team leaderboard â€” who&apos;s grinding hardest</li>
            <li>All VaultSparked features for every member</li>
            <li>Up to 5 team members</li>
          </ul>
        </div>
      </div>
    ) : (
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:K.tx}}>{team.name}</div>
            <div style={{fontSize:12,color:K.mt}}>Team Vault Â· {members.length} member{members.length !== 1 ? 's' : ''}</div>
          </div>
          <span style={{padding:'4px 12px',background:`${K.gn}15`,border:`1px solid ${K.gn}`,borderRadius:999,fontSize:12,color:K.gn}}>TEAM</span>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Invite Members</div>
          <div style={{display:'flex',gap:8}}>
            <input
              type="email"
              placeholder="teammate@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{...S.input,flex:1}}
            />
            <button onClick={inviteMember} style={{padding:'8px 16px',background:K.pp,color:K.bg,border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:font}}>
              Invite
            </button>
          </div>
        </div>
        <div style={{fontWeight:600,color:K.tx,marginBottom:8,fontSize:14}}>Team Members</div>
        {members.map(m => (
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,marginBottom:6}}>
            <div>
              <div style={{color:K.tx,fontSize:13}}>{m.invited_email || m.user_id}</div>
              <div style={{color:K.mt,fontSize:11}}>{m.role} Â· {m.status}</div>
            </div>
            <span style={{padding:'2px 10px',background:m.status==='active'?`${K.gn}15`:`${K.s3}`,border:`1px solid ${m.status==='active'?K.gn:K.bd2}`,borderRadius:999,fontSize:11,color:m.status==='active'?K.gn:K.mt}}>
              {m.status}
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div style={{color:K.mt,fontSize:13,textAlign:'center',padding:16}}>No members yet â€” invite your first teammate above</div>
        )}
      </div>
    )}
  </div></div>);
};

// â•â•â• SMART PROMO RECOMMENDER â•â•â•
const PushEnableBtn = ({ proStatus }) => {
  const [state, setState] = useState(() => {
    try {
      if(typeof Notification === 'undefined') return 'unsupported';
      if(Notification.permission === 'granted') return 'enabled';
      if(Notification.permission === 'denied') return 'denied';
      return 'prompt';
    } catch { return 'unsupported'; }
  });
  const isPro = proStatus?.status === 'active' || proStatus?.status === 'trial';
  if(!isPro) return null;
  if(!FEATURE_FLAGS.pushAlerts) {
    return (
      <div style={{fontSize:10,color:K.yl,fontWeight:600,padding:"4px 10px",background:`${K.yl}10`,border:`1px solid ${K.yl}30`,borderRadius:6}}>
        ðŸ”” Push beta
      </div>
    );
  }
  const toast = useToast();
  if(state === 'unsupported') return null;
  if(state === 'enabled') return (
    <div style={{fontSize:10,color:K.gn,fontWeight:600,padding:"4px 10px",background:`${K.gn}10`,border:`1px solid ${K.gn}30`,borderRadius:6}}>ðŸ”” Push On</div>
  );
  if(state === 'denied') return (
    <div style={{fontSize:10,color:K.rd,padding:"4px 10px",background:`${K.rd}10`,border:`1px solid ${K.rd}30`,borderRadius:6}} title="Push blocked in browser settings">ðŸ”• Push Blocked</div>
  );
  const enable = async () => {
    const permission = await Notification.requestPermission().catch(()=>'denied');
    if(permission !== 'granted') { setState('denied'); return; }
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if(!vapidKey) { setState('enabled'); if(toast) toast('Push enabled (VAPID key pending setup)', K.yl); return; }
    const sub = await subscribeToPush(vapidKey);
    if(sub) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
          await supabase.from('push_subscriptions').upsert({
            user_id: session.user.id,
            endpoint: sub.endpoint,
            p256dh: sub.toJSON().keys.p256dh,
            auth_key: sub.toJSON().keys.auth,
          }, { onConflict: 'endpoint' });
        }
      } catch(e) {}
      setState('enabled');
      if(toast) toast('ðŸ”” Push alerts enabled! Daily briefings + arb alerts incoming.', K.gn);
    } else {
      if(toast) toast('Could not subscribe to push â€” try again', K.rd);
    }
  };
  return (
    <button onClick={enable} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
      ðŸ”” Enable Push Alerts
    </button>
  );
};

// â•â•â• QUICK ADD BET â•â•â•
const QuickAddBet = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState(BOOKS[0]?.name||"");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [notes, setNotes] = useState("");
  const addBet = () => {
    if(!book||!stake||!odds) { if(toast) toast('Fill in Book, Stake, and Odds', K.rd); return; }
    const bets = [...(data.bets||[])];
    bets.push({ id:Date.now(), book, stake, odds, notes, status:'open', date:new Date().toISOString().split('T')[0] });
    syncAppData({...data, bets});
    if(toast) toast('Bet added', K.gn);
    setStake(""); setOdds(""); setNotes(""); setOpen(false);
  };
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,fontWeight:700,color:K.dm,textTransform:"uppercase",letterSpacing:"1.5px"}}>Quick Add Bet</div>
        <button onClick={()=>setOpen(o=>!o)} style={{padding:"4px 10px",background:open?K.gn:"transparent",border:`1px solid ${open?K.gn:K.bd2}`,borderRadius:6,color:open?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font}}>
          {open?"â–² Close":"+ Add Bet"}
        </button>
      </div>
      {open&&<div style={{marginTop:12}}>
        <div style={S.row}>
          <div style={S.col}>
            <label style={S.label}>Sportsbook</label>
            <select style={S.input} value={book} onChange={e=>setBook(e.target.value)}>
              {BOOKS.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div style={S.col}><label style={S.label}>Stake ($)</label><input style={S.input} value={stake} onChange={e=>setStake(e.target.value)} placeholder="100"/></div>
          <div style={S.col}><label style={S.label}>Odds</label><input style={S.input} value={odds} onChange={e=>setOdds(e.target.value)} placeholder="-110"/></div>
        </div>
        <div style={{marginBottom:10}}>
          <label style={S.label}>Notes (optional)</label>
          <input style={S.input} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Game, promo type, etc."/>
        </div>
        <button onClick={addBet} style={{padding:"8px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Add to Bet Tracker</button>
      </div>}
    </div>
  );
};

// â•â•â• ONBOARDING CHECKLIST â•â•â•
// â•â•â• STARTER PACK MODAL â•â•â•
function StarterPackModal({ onClose, syncAppData, appData }) {
  const PACKS = [
    { id:'casual', label:'Casual Bettor', icon:'ðŸŽ²', bankroll:'500', goal:200, hrs:'2 hrs/week', desc:'A few books, occasional promos. Perfect for weekends.' },
    { id:'hunter', label:'Promo Hunter', icon:'ðŸŽ¯', bankroll:'2000', goal:800, hrs:'5 hrs/week', desc:'Hit every welcome offer. Build a steady side income.' },
    { id:'grinder', label:'Full Grinder', icon:'âš¡', bankroll:'5000', goal:2500, hrs:'Daily', desc:'All books, recurring promos, live scanner. Maximum extraction.' },
  ];
  const [selected, setSelected] = React.useState(null);
  const apply = (pack) => {
    try { localStorage.setItem('pg_bankroll', pack.bankroll); } catch {}
    syncAppData({ ...appData, profitGoal: pack.goal });
    try { localStorage.setItem('pg_starter_pack_done', '1'); } catch {}
    onClose();
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:12,padding:24,maxWidth:480,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}}>
        <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:4}}>How do you want to play it?</div>
        <div style={{fontSize:12,color:K.mt,marginBottom:20}}>Choose a starter profile â€” sets your bankroll and profit goal. You can change these anytime.</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
          {PACKS.map(p=>(
            <div key={p.id} onClick={()=>setSelected(p.id)}
              style={{padding:'14px 16px',background:selected===p.id?'#1e3a2f':K.s3,border:`2px solid ${selected===p.id?K.gn:K.bd}`,borderRadius:8,cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:20}}>{p.icon}</span>
                <span style={{fontWeight:700,color:K.tx,fontSize:14}}>{p.label}</span>
                <span style={{marginLeft:'auto',fontSize:10,color:K.ac,fontWeight:600}}>${parseInt(p.bankroll).toLocaleString()} bankroll Â· ${p.goal.toLocaleString()} goal</span>
              </div>
              <div style={{fontSize:11,color:K.mt,marginLeft:30}}>{p.desc} Â· {p.hrs}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{const p=PACKS.find(x=>x.id===selected);if(p)apply(p);}} disabled={!selected}
            style={{flex:1,padding:'10px',background:selected?K.gn:K.bd,border:'none',borderRadius:6,color:selected?K.bg:K.mt,fontWeight:700,fontSize:13,cursor:selected?'pointer':'not-allowed',fontFamily:font,transition:'background 0.15s'}}>
            Start with this profile â†’
          </button>
          <button onClick={()=>{try{localStorage.setItem('pg_starter_pack_done','1');}catch{}onClose();}}
            style={{padding:'10px 16px',background:'transparent',border:`1px solid ${K.bd}`,borderRadius:6,color:K.mt,cursor:'pointer',fontSize:12,fontFamily:font}}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingChecklist({ appData, user, isPro }) {
  const [done, setDone] = React.useState(() => !!localStorage.getItem('pg_onboarding_done'));
  const [completed, setCompleted] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('pg_onboarding_steps') || '[]'); } catch { return []; }
  });

  React.useEffect(() => {
    const steps = [];
    const usageLog = (() => { try { return JSON.parse(localStorage.getItem('pg_usage_log') || '{}'); } catch { return {}; } })();
    if (Object.keys(usageLog).length > 0) steps.push('calc');
    if ((appData?.sportsbooks || []).length > 0 || Object.values(appData?.done || {}).some(Boolean)) steps.push('book');
    if ((appData?.bets || []).length > 0 || (appData?.ledger || []).length > 0) steps.push('bet');
    if (isPro && isPro()) steps.push('trial');
    try { if (localStorage.getItem('pg_referral_shared')) steps.push('invite'); } catch {}
    const saved = (() => { try { return JSON.parse(localStorage.getItem('pg_onboarding_steps') || '[]'); } catch { return []; } })();
    const merged = [...new Set([...saved, ...steps])];
    localStorage.setItem('pg_onboarding_steps', JSON.stringify(merged));
    setCompleted(merged);
  }, [appData]);

  if (done || !user) return null;

  const STEPS = [
    { id: 'calc', label: 'Run your first calculator', icon: 'ðŸ§®' },
    { id: 'book', label: 'Add a sportsbook to your vault', icon: 'ðŸ“š' },
    { id: 'bet', label: 'Log your first bet or promo', icon: 'ðŸ“' },
    { id: 'trial', label: 'Start your 7-day free trial', icon: 'âš¡' },
    { id: 'invite', label: 'Invite a friend', icon: 'ðŸ‘¥' },
  ];

  const doneCount = STEPS.filter(s => completed.includes(s.id)).length;
  const pct = Math.round(doneCount / STEPS.length * 100);

  if (doneCount === STEPS.length) {
    localStorage.setItem('pg_onboarding_done', '1');
    return null;
  }

  return (
    <div style={{background:'#0f1724',border:'1px solid #1e3a2f',borderRadius:10,padding:16,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <span style={{fontWeight:700,color:'#e2e8f0',fontSize:14}}>Getting Started</span>
          <span style={{marginLeft:8,color:'#64748b',fontSize:12}}>{doneCount}/{STEPS.length} complete</span>
        </div>
        <button onClick={() => { localStorage.setItem('pg_onboarding_done','1'); setDone(true); }} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:18,lineHeight:1}}>Ã—</button>
      </div>
      <div style={{height:4,background:'#1e293b',borderRadius:2,marginBottom:12}}>
        <div style={{height:4,background:'#4ade80',borderRadius:2,width:`${pct}%`,transition:'width .3s'}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
        {STEPS.map(s => {
          const isDone = completed.includes(s.id);
          return (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#0a0e17',borderRadius:6,opacity: isDone ? 0.5 : 1}}>
              <span style={{fontSize:16}}>{isDone ? 'âœ…' : s.icon}</span>
              <span style={{fontSize:12,color: isDone ? '#64748b' : '#cbd5e1',textDecoration: isDone ? 'line-through' : 'none'}}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberWelcomeCard({ navigate, proStatus }) {
  const dismissKey = 'pg_member_welcome_v1_dismissed';
  const [dismissed, setDismissed] = React.useState(() => {
    try { return !!localStorage.getItem(dismissKey); } catch { return false; }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissKey, '1'); } catch {}
    setDismissed(true);
  };

  const proLabel = proStatus?.status === 'trial'
    ? `VaultSparked Pro trial active â€” ${proStatus.trial_days_left} day${proStatus.trial_days_left !== 1 ? 's' : ''} left`
    : proStatus?.status === 'active'
      ? 'VaultSparked Pro active'
      : 'VaultSparked Pro is optional';

  return (
    <div style={{...S.card,border:`1px solid ${K.ac}40`,background:`linear-gradient(135deg, ${K.ac}10, ${K.s1})`,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}}>
        <div>
          <div style={{fontSize:11,color:K.ac,fontWeight:700,letterSpacing:'1.4px',textTransform:'uppercase',marginBottom:6}}>Member Welcome</div>
          <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:6}}>How access works in PromoGrind</div>
          <div style={{fontSize:12,color:K.dm,lineHeight:1.7,maxWidth:760}}>
            A free PromoGrind account powers sync, referrals, and access across devices. The same account works across all VaultSpark Studio tools. Pro features unlock in stages as services come online.
          </div>
        </div>
        <button onClick={dismiss} style={{background:'none',border:'none',color:K.mt,cursor:'pointer',fontSize:18,lineHeight:1,padding:0}}>Ã—</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:10,marginBottom:12}}>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:4}}>Free PromoGrind Account</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>Login, sync, calculators, tracker, ledger, and learning tools.</div>
        </div>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:4}}>VaultSparked Pro</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>{proLabel}. Paid checkout stays off until the Studio billing rollout is fully live.</div>
        </div>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.yl,marginBottom:4}}>Beta-Gated Features</div>
          <div style={{fontSize:11,color:K.dm,lineHeight:1.6}}>Live scanner, AI helpers, and push alerts remain beta until their backends are activated.</div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button onClick={() => navigate('/bonus-bet')} style={{padding:'7px 12px',background:K.gn,border:'none',borderRadius:6,color:K.bg,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>Start with free tools â†’</button>
        <button onClick={() => navigate('/upgrade')} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>See Pro status</button>
        <button onClick={dismiss} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:'pointer',fontFamily:font}}>Dismiss</button>
      </div>
    </div>
  );
}

// â•â•â• DAILY DASHBOARD â•â•â•
const DailyDashboard = ({ navigate: navigateProp, proStatus }) => {
  const navigateHook = useNavigate();
  const navigate = navigateProp || navigateHook;
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [showWT, setShowWT] = useState(false);
  const [showStarterPack, setShowStarterPack] = React.useState(() => {
    try { return !localStorage.getItem('pg_starter_pack_done') && !localStorage.getItem('pg_onboarding_done'); } catch { return false; }
  });
  const [upsellStreakDismissed, setUpsellStreakDismissed] = useState(()=>{ try{return !!localStorage.getItem('pg_upsell_streak_dismissed');}catch{return false;} });
  // Streak & Consistency tracking
  const [streakCount, setStreakCount] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);
  useEffect(()=>{
    try {
      const key='pg_login_dates';
      const arr=JSON.parse(localStorage.getItem(key)||'[]');
      if(!arr.includes(todayStr)){ arr.push(todayStr); localStorage.setItem(key,JSON.stringify(arr)); }
      const sorted=[...new Set(arr)].sort();
      let streak=0;
      const d=new Date(todayStr);
      for(let i=0;i<365;i++){
        const ds=new Date(d); ds.setDate(d.getDate()-i);
        const s=ds.toISOString().split('T')[0];
        if(sorted.includes(s)) streak++;
        else break;
      }
      setStreakCount(streak);
      if(sorted.length>=1){
        const first=new Date(sorted[0]);
        const diffDays=Math.max(1,Math.round((new Date(todayStr)-first)/(1000*60*60*24))+1);
        setConsistencyScore(Math.min(100,Math.round(sorted.length/diffDays*100)));
      }
    } catch(e){}
  },[todayStr]);
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDay = dayNames[today.getDay()];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const usageLog = (() => { try { return JSON.parse(localStorage.getItem('pg_usage_log') || '{}'); } catch { return {}; } })();
  const bankroll = (() => { try { return localStorage.getItem('pg_bankroll') || ''; } catch { return ''; } })();
  const snapshot = getDashboardSnapshot(data, PROMO_SCHED, today, bankroll);
  const bets = data.bets || [];
  const ledger = data.ledger || [];
  const done = data.done || {};
  const expiry = data.bookExpiry || {};
  const totalProfit = snapshot.totalProfit;
  const openBets = snapshot.openBets;
  const expiring = snapshot.expiringBooks;
  const todayPromos = snapshot.todayPromos;
  const booksComplete = snapshot.booksComplete;
  const potentialLeft = snapshot.potentialLeft;
  const monthProfit = snapshot.monthProfit;

  const dashIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };
  const currentStreak = computeStreak(data, today).current;
  useAchievements(data, currentStreak);

  return (
    <div>
      {showWT&&<Suspense fallback={null}><PromoWalkthrough navigate={navigate} onClose={()=>setShowWT(false)}/></Suspense>}
      {showStarterPack&&<StarterPackModal onClose={()=>setShowStarterPack(false)} syncAppData={syncAppData} appData={data}/>}
      <Suspense fallback={<LoadingState label="Loading dashboard heroâ€¦" />}>
        <DashboardHero totalProfit={totalProfit} openBetsCount={openBets.length} booksComplete={booksComplete} navigate={navigate} streak={currentStreak}/>
      </Suspense>
      <Suspense fallback={<LoadingState label="Loading next actionâ€¦" />}>
        <ActivationNextAction data={data} totalProfit={totalProfit} openBets={openBets} booksComplete={booksComplete} navigate={navigate}/>
      </Suspense>
      <Suspense fallback={null}><DailyMissionsPanel navigate={navigate} /></Suspense>
      <MemberWelcomeCard navigate={navigate} proStatus={proStatus} />
      <Suspense fallback={<LoadingState label="Loading launch postureâ€¦" />}>
        <LaunchCommandCenterPanel />
      </Suspense>
      <Suspense fallback={null}><CommunityWinsWall /></Suspense>
      <OnboardingChecklist appData={data} user={true} isPro={dashIsPro} />
      <Suspense fallback={<LoadingState label="Loading today dashboardâ€¦" />}>
        <TodayDashboardPanel
          snapshot={snapshot}
          navigate={navigate}
          appData={data}
          isProActive={typeof dashIsPro === "function" ? dashIsPro() : false}
          syncDiagnostics={{ ...syncDiagnostics, online: isOnline, syncStatus }}
          usageLog={usageLog}
        />
      </Suspense>
      {ledger.length===0&&bets.length===0&&booksComplete===0&&(
        <div style={{...S.card,border:`1px solid ${K.gn}40`,background:`${K.gn}06`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>Getting Started â€” 3 Steps</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {n:"1",t:"Convert your first bonus bet",d:"Open any sportsbook app, grab a welcome promo, enter it in the Bonus Bet Converter.",slug:"bonus-bet",color:K.gn},
              {n:"2",t:"Log the result in your Ledger",d:"Track every conversion so you always know your true P/L across all books.",slug:"ledger",color:K.ac},
              {n:"3",t:"Mark books complete in Tracker",d:"Check off each sportsbook after you've claimed and converted their welcome offer.",slug:"sportsbooks",color:K.yl},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,cursor:"pointer"}} onClick={()=>navigate("/"+s.slug)}>
                <div style={{fontSize:15,fontWeight:700,color:s.color,minWidth:20}}>{s.n}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:K.tx,marginBottom:2}}>{s.t} â†’</div>
                  <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Suspense fallback={null}><SmartPromoRecommender data={data}/></Suspense>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
        <div>
          <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:2}}>
            Good {today.getHours()<12?"morning":today.getHours()<17?"afternoon":"evening"}
          </div>
          <div style={{fontSize:11,color:K.mt}}>
            {todayDay}, {monthNames[today.getMonth()]} {today.getDate()} Â· Here&apos;s your daily promo briefing
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowWT(true)} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>â–¶ Promo Walkthroughs</button>
          <DailyBriefingBtn openBets={openBets} todayPromos={todayPromos}/>
          <PushEnableBtn proStatus={proStatus}/>
        </div>
      </div>
      <StateLegalAlert userState={data.userState}/>
      {streakCount>=3&&!upsellStreakDismissed&&(
        <div style={{...S.card,border:`1px solid ${K.pp}40`,background:`${K.pp}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:2}}>ðŸ”¥ {streakCount}-day streak! Unlock live arb alerts &amp; daily briefings with VaultSparked</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{ window.location.hash='#/upgrade'; }} style={{padding:"5px 12px",background:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font}}>Upgrade â†’</button>
            <button onClick={()=>{try{localStorage.setItem('pg_upsell_streak_dismissed','1');}catch{}setUpsellStreakDismissed(true);}} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>Not now</button>
          </div>
        </div>
      )}
      {proStatus?.status==='trial'&&(
        proStatus.trial_days_left>3?(
          <div style={{...S.card,border:`1px solid ${K.gn}40`,background:`${K.gn}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:2}}>
                ðŸŽ‰ VaultSparked Pro Trial â€” {proStatus.trial_days_left} day{proStatus.trial_days_left!==1?"s":""} remaining
              </div>
              <div style={{fontSize:11,color:K.dm}}>You have full Pro access including the Live Arb Scanner and +EV Scanner.</div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access â†’</button>
          </div>
        ):proStatus.trial_days_left>1?(
          <div style={{...S.card,border:`1px solid ${K.yl}40`,background:`${K.yl}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.yl,marginBottom:2}}>
                â³ Trial ending soon â€” {proStatus.trial_days_left} day{proStatus.trial_days_left!==1?"s":""} left. Don't lose Pro access.
              </div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.yl,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access â†’</button>
          </div>
        ):(
          <div style={{...S.card,border:`1px solid ${K.rd}40`,background:`${K.rd}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.rd,marginBottom:2}}>
                ðŸš¨ Trial expires tomorrow. Upgrade now to keep the Live Scanner and AI features.
              </div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.rd,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access â†’</button>
          </div>
        )
      )}
      <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>THIS MONTH</div>
          <div style={S.big(monthProfit>=0?K.gn:K.rd)}>${f(monthProfit)}</div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>ALL TIME</div>
          <div style={S.big(totalProfit>=0?K.gn:K.rd)}>${f(totalProfit)}</div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>OPEN BETS</div>
          <div style={S.big(openBets.length>0?K.yl:K.dm)}>{openBets.length}</div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>BOOKS DONE</div>
          <div style={S.big(K.ac)}>{booksComplete}/{BOOKS.length}</div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>STREAK</div>
          <div style={S.big(streakCount>=7?K.gn:streakCount>=3?K.yl:K.dm)}>{streakCount}</div>
          <div style={{fontSize:9,color:K.mt}}>days</div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}} title="% of days you've visited in your active period">CONSISTENCY â“˜</div>
          <div style={S.big(consistencyScore>=70?K.gn:consistencyScore>=40?K.yl:K.dm)}>{consistencyScore}%</div>
          <div style={{height:3,background:K.s3,borderRadius:2,marginTop:4}}><div style={{height:3,borderRadius:2,background:consistencyScore>=70?K.gn:consistencyScore>=40?K.yl:K.dm,width:`${consistencyScore}%`}}/></div>
        </div>
        <div style={{...S.card,flex:1,minWidth:120,marginBottom:0,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:K.mt,marginBottom:4}}>VALUE LEFT</div>
          <div style={S.big(K.yl)}>~${f(potentialLeft,0)}</div>
        </div>
      </div>
      <ProfitGoalTracker totalProfit={totalProfit}/>
      <DailyRoutinePanel openBetsCount={openBets.length} expiringCount={expiring.length}/>
      {expiring.length>0&&(
        <div style={{...S.note(K.yl),marginBottom:12}}>
          âš  Expiring soon: {expiring.map(b=>`${b.name} (${expiry[b.name]})`).join(", ")}
        </div>
      )}
      {todayPromos.length>0&&(
        <div style={{...S.card,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Today&apos;s Promos â€” {todayDay}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {todayPromos.slice(0,6).map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
                <div>
                  <span style={{fontSize:12,fontWeight:600,color:K.tx}}>{p.book}</span>
                  <span style={{fontSize:11,color:K.dm,marginLeft:8}}>{p.promo}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:600,color:K.gn}}>{p.value}</span>
                  <span style={S.tag((p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)||K.ac)}>{p.grade||"B"}</span>
                </div>
              </div>
            ))}
            {todayPromos.length>6&&<div style={{fontSize:11,color:K.mt,textAlign:"center"}}>+{todayPromos.length-6} more in Promo Calendar</div>}
          </div>
        </div>
      )}
      <QuickAddBet/>
      <OpenExposurePanel bets={bets}/>
      <TopToolsPanel navigate={navigate}/>
      <WeeklyGrindReport/>
      <BankrollWizard/>
      <CopyMySetup appData={data} syncAppData={syncAppData}/>
      <div style={{...S.card}}>
        <div style={{fontSize:11,fontWeight:700,color:K.dm,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Quick Actions</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {label:"Convert Bonus Bet",slug:"bonus-bet",color:K.gn},
            {label:"Log a Profit Boost",slug:"profit-boost",color:K.yl},
            {label:FEATURE_FLAGS.liveScanner?"Check Live Scanner":"View Live Scanner Beta",slug:"arb-scanner",color:K.pp},
            {label:"Update P/L Ledger",slug:"ledger",color:K.ac},
          ].map(a=>(
            <button key={a.slug} onClick={()=>navigate("/"+a.slug)} style={{padding:"7px 14px",background:`${a.color}10`,border:`1px solid ${a.color}30`,borderRadius:6,color:a.color,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>
              {a.label} â†’
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// â•â•â• DEPOSIT OPTIMIZER â•â•â•
const DepositOptimizer = () => {
  const [bankroll, setBankroll] = useState("3000");
  const [userState, setUserState] = useState(() => { try { return localStorage.getItem('pg_user_state')||''; } catch { return ''; } });
  const availBooks = useMemo(()=>{
    if(!userState) return BOOKS;
    return BOOKS.filter(b=>!US_BOOK_STATES[b.name]||US_BOOK_STATES[b.name].includes(userState));
  },[userState]);
  const ranked = useMemo(()=>{
    return availBooks.map(b=>({...b,ev:b.bonus*0.70})).sort((a,b)=>b.ev-a.ev);
  },[availBooks]);
  const br = parseFloat(bankroll)||0;
  let running=0;
  const tiers = ranked.map(b=>{ running+=b.bonus||0; return {...b,cumFund:running}; });
  const totalEV = ranked.reduce((s,b)=>s+b.ev,0);
  return (<div><div style={S.card}><Tl t="Deposit Optimizer" badge="BANKROLL PLANNER" bc={K.gn} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Your Bankroll</label><input style={S.input} value={bankroll} onChange={e=>setBankroll(e.target.value)} placeholder="3000"/></div>
      <div style={S.col}><label style={S.label}>Your State</label><select style={S.input} value={userState} onChange={e=>{setUserState(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
        <option value="">All States</option>
        {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
      </select></div>
    </div>
    <div style={{...S.res(true),marginBottom:12}}>
      <div style={{display:"flex",gap:20,marginBottom:12,flexWrap:"wrap"}}>
        <div><div style={{fontSize:9,color:K.mt}}>BOOKS AVAILABLE</div><div style={S.big(K.ac)}>{ranked.length}</div></div>
        <div><div style={{fontSize:9,color:K.mt}}>TOTAL EXTRACTABLE</div><div style={S.big(K.gn)}>~${Math.round(totalEV).toLocaleString()}</div></div>
      </div>
    </div>
    {ranked.map((b,i)=>{
      const tier=i<3?"top":i<6?"mid":"low";
      const tc=tier==="top"?K.gn:tier==="mid"?K.yl:K.mt;
      const canFund=br>=(b.bonus||0);
      return (<div key={b.name} style={{padding:"10px 14px",background:K.s2,borderRadius:6,marginBottom:6,border:`1px solid ${canFund?tc+'40':K.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <span style={{fontSize:13,fontWeight:700,color:K.tx,marginRight:8}}>#{i+1}</span>
          <span style={{fontSize:12,fontWeight:600,color:tc}}>{b.name}</span>
          <span style={{fontSize:11,color:K.mt,marginLeft:8}}>Fund ${b.bonus}+ </span>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontWeight:700,color:tc}}>Expected: ~${Math.round(b.ev)}</div>
          <div style={{fontSize:10,color:K.mt}}>70% of ${b.bonus} bonus</div>
        </div>
      </div>);
    })}
    <Nt c={K.ac}>Rankings based on estimated 70% bonus conversion rate. Available books filtered by your state.</Nt>
  </div>
  <Help entries={[
    ["How to use","Rank these books by expected value. Fund the highest-EV books first with your available bankroll. Each book needs roughly the bonus amount as a float."],
    ["70% conversion rate","A conservative estimate for how much of a bonus bet you'll extract as real cash. Better lines = higher conversion."],
  ]}/></div>);
};

// â•â•â• HEDGE VALIDATOR â•â•â•
const HedgeValidator = () => {
  const [mem,setMem]=useCalcMemory('hedge-validator',{o1:"+300",s1:"100",o2:"-350",s2:""});
  const {o1,s1,o2,s2}=mem;
  const setO1=v=>setMem('o1',v),setS1=v=>setMem('s1',v),setO2=v=>setMem('o2',v),setS2=v=>setMem('s2',v);
  const d1=toD(o1), d2=toD(o2);
  const ip1=d1>1?1/d1:0, ip2=d2>1?1/d2:0;
  const ipSum=(ip1+ip2)*100;
  const s1n=parseFloat(s1)||0;
  const s2n = s2 ? (parseFloat(s2)||0) : (d2>1&&d1>1&&s1n ? s1n*(d1-1)/d2 : 0);
  const bothPos = d1>1&&d1<2&&d2>1&&d2<2;
  const bothNeg = d1>=2&&d2>=2;
  const pBW = s1n>0&&d1>1 ? s1n*(d1-1)-s2n : null;
  const pHW = s2n>0&&d2>1 ? s2n*(d2-1)-s1n : null;
  const gProfit = pBW!==null&&pHW!==null ? Math.min(pBW,pHW) : null;
  const isValidHedge = gProfit!==null&&gProfit>-1;
  return (<div><div style={S.card}><Tl t="Hedge Sanity Validator" badge="VALIDATE" bc={K.ac} shareable/>
    <div style={S.row}><In l="Side A Odds" v={o1} set={setO1} ph="+300"/><In l="Side A Stake" v={s1} set={setS1} pre="$" ph="100"/></div>
    <div style={S.row}><In l="Side B Odds" v={o2} set={setO2} ph="-350"/><In l="Side B Stake (blank=auto)" v={s2} set={setS2} pre="$" ph="auto"/></div>
    {d1>1&&d2>1&&<div style={{marginTop:12}}>
      {!s2&&s2n>0&&<div style={{...S.note(K.ac),marginBottom:8}}>Auto-computed Side B stake: ${f(s2n)} (to guarantee equal profit on both outcomes)</div>}
      {bothPos&&<div style={{...S.note(K.rd),marginBottom:8}}>Both sides are favorites â€” this may not be a valid hedge. Verify you are betting opposite outcomes.</div>}
      {bothNeg&&<div style={{...S.note(K.yl),marginBottom:8}}>Both sides are dogs â€” verify you are betting opposite outcomes.</div>}
      <div style={{...S.res(isValidHedge),marginBottom:8}}>
        <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Odds Relationship</div>
        <div style={{fontSize:12,fontWeight:600,color:ipSum>100&&ipSum<110?K.gn:ipSum>=110&&ipSum<=120?K.yl:ipSum<100?K.gn:K.rd}}>
          {ipSum<100?"Possible arb opportunity!":ipSum<110?"Plausible market":ipSum<120?"High vig market":"Unusual â€” double check these lines"}
          {" "}({f(ipSum,1)}% combined implied)
        </div>
        {gProfit!==null&&<div style={{marginTop:8}}>
          <span style={S.big(gProfit>=0?K.gn:K.rd)}>{gProfit>=0?"+":""}${f(gProfit)}</span>
          <span style={{fontSize:12,color:K.dm,marginLeft:8}}>{gProfit>=0?"guaranteed profit":"loss if either outcome"}</span>
        </div>}
        {pBW!==null&&<RR l="If Side A wins" v={`${pBW>=0?"+":""}$${f(pBW)}`} c={pBW>=0?K.gn:K.rd}/>}
        {pHW!==null&&<RR l="If Side B wins" v={`${pHW>=0?"+":""}$${f(pHW)}`} c={pHW>=0?K.gn:K.rd}/>}
        {gProfit!==null&&gProfit<-0.5&&<Nt c={K.rd}>INVALID HEDGE â€” you will lose ${f(Math.abs(gProfit))} on the worse outcome. Adjust your stakes.</Nt>}
        {gProfit!==null&&gProfit>=0&&<Nt c={K.gn}>Valid hedge. Profit guaranteed regardless of outcome.</Nt>}
      </div>
    </div>}
  </div>
  <Help entries={[
    ["What is a hedge","A bet on the opposite outcome at a different sportsbook to guarantee profit regardless of who wins."],
    ["Common mistake 1","Hedging at the SAME sportsbook â€” books may void both bets if they detect same-game hedging."],
    ["Common mistake 2","Both sides at positive odds does NOT always mean it is a valid hedge â€” it depends on whether they cover opposite outcomes."],
    ["Common mistake 3","Wrong stake amounts â€” use Side B blank auto-compute to get the exactly correct hedge stake."],
  ]}/></div>);
};

// â•â•â• PROMO GUARANTEE â•â•â•
const PromoGuarantee = () => {
  const [promoType, setPromoType] = useState("bonus-bet");
  const [promoSize, setPromoSize] = useState("200");
  const [userState2, setUserState2] = useState(() => { try { return localStorage.getItem('pg_user_state')||''; } catch { return ''; } });
  const promoTypes = [
    {id:"bonus-bet",label:"Bonus Bet",rate:[0.70,0.75],conf:"HIGH",steps:3,calc:"bonus-bet"},
    {id:"first-bet-insurance",label:"First Bet Insurance",rate:[0.65,0.70],conf:"HIGH",steps:4,calc:"first-bet"},
    {id:"profit-boost-50pct",label:"Profit Boost (50%)",rate:[0.40,0.55],conf:"MEDIUM",steps:2,calc:"profit-boost"},
    {id:"reload-match-20pct",label:"Reload Match (20%)",rate:[0.55,0.65],confKey:true,steps:2,calc:"rollover"},
    {id:"deposit-match-100pct",label:"Deposit Match (100%)",rate:[0.50,0.60],conf:"MEDIUM",steps:3,calc:"deposit-match"},
  ];
  const pt = promoTypes.find(p=>p.id===promoType)||promoTypes[0];
  const sz=parseFloat(promoSize)||0;
  const loEst = promoType==="reload-match-20pct" ? sz*0.20*0.60 : sz*pt.rate[0];
  const hiEst = promoType==="reload-match-20pct" ? sz*0.20*0.65 : sz*pt.rate[1];
  const relatedPromos = PROMO_SCHED.filter(p=>{
    if(!userState2||US_BOOK_STATES[p.book]?.includes(userState2)||!US_BOOK_STATES[p.book]) return true;
    return false;
  }).filter(p=>{
    if(promoType==="bonus-bet"&&(p.promo.toLowerCase().includes("bonus")&&p.promo.toLowerCase().includes("bet"))) return true;
    if(promoType==="profit-boost-50pct"&&p.promo.toLowerCase().includes("boost")) return true;
    if(promoType==="reload-match-20pct"&&p.promo.toLowerCase().includes("reload")) return true;
    return false;
  }).slice(0,4);
  const confColor={HIGH:K.gn,MEDIUM:K.yl,LOW:K.rd};
  return (<div><div style={S.card}><Tl t="Promo Profit Guarantee" badge="CONVERSION EST." bc={K.gn} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Promo Type</label><select style={S.input} value={promoType} onChange={e=>setPromoType(e.target.value)}>
        {promoTypes.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
      </select></div>
      <div style={S.col}><label style={S.label}>Promo Size</label><input style={S.input} value={promoSize} onChange={e=>setPromoSize(e.target.value)} placeholder="200"/></div>
      <div style={S.col}><label style={S.label}>Your State</label><select style={S.input} value={userState2} onChange={e=>{setUserState2(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
        <option value="">All States</option>
        {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
      </select></div>
    </div>
    {sz>0&&<div style={S.res(true)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
        <span style={S.big(K.gn)}>${f(loEst)} â€“ ${f(hiEst)}</span>
      </div>
      <div style={{fontSize:11,color:K.dm,marginBottom:8}}>Estimated guaranteed profit range</div>
      <RR l="Conversion rate range" v={`${Math.round(pt.rate[0]*100)}% â€“ ${Math.round(pt.rate[1]*100)}%`} c={K.yl}/>
      <RR l="Confidence" v={pt.conf||"MEDIUM"} c={confColor[pt.conf||"MEDIUM"]} b/>
      <RR l="Steps to convert" v={`${pt.steps} steps`} c={K.ac}/>
      <Nt c={K.ac}>â†’ Use the {pt.label} calculator to run the exact math for your odds.</Nt>
      {relatedPromos.length>0&&<div style={{marginTop:8}}>
        <div style={{fontSize:10,color:K.mt,marginBottom:4}}>Books with this promo type:</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{relatedPromos.map(p=><span key={p.book+p.promo} style={S.tag(K.ac)}>{p.book}</span>)}</div>
      </div>}
    </div>}
  </div>
  <Help entries={[
    ["Bonus Bet","A free bet credit â€” only the profit is returned. 70-75% conversion rate at ideal odds (+250 to +400)."],
    ["First Bet Insurance","Your first real-cash bet is refunded as bonus bets if it loses. Convert those at 70%."],
    ["Profit Boost","Percentage increase to your winnings. 40-55% of the boost value is extractable as guaranteed profit."],
    ["Reload Match","Book matches 20% of your deposit as bonus funds. Factor in rollover requirements (~4.5% vig cost)."],
  ]}/></div>);
};

// â•â•â• GUT CHECK â•â•â•
const GutCheck = () => {
  const [mem,setMem]=useCalcMemory('gut-check',{o1:"+200",o2:"-220"});
  const {o1,o2}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v);
  const d1=toD(o1), d2=toD(o2);
  const ip1=d1>1?1/d1:0, ip2=d2>1?1/d2:0;
  const ipSum=(ip1+ip2)*100;
  const isPlausible = d1>1&&d2>1;
  const onePlus = (o1.startsWith('+')||toD(o1)>2)&&(o2.startsWith('-')||toD(o2)<2&&!o2.startsWith('+'));
  const bothPlus = (o1.startsWith('+')||toD(o1)>2)&&(o2.startsWith('+')||toD(o2)>2);
  const oppositeSides = !!(d1>1&&d2>1&&(onePlus||(!o1.startsWith('-')&&o2.startsWith('-'))));
  const arb = isPlausible ? calcArb2(o1,o2,100) : null;
  return (<div><div style={S.card}><Tl t="Gut Check Validator" badge="QUICK CHECK" bc={K.ac} shareable/>
    <div style={S.row}><In l="Line 1 Odds" v={o1} set={setO1} ph="+200"/><In l="Line 2 Odds" v={o2} set={setO2} ph="-220"/></div>
    {isPlausible&&<div style={S.res(ipSum<110)}>
      <div style={{marginBottom:8}}>
        <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Odds Relationship: </span>
        <span style={{fontSize:12,fontWeight:700,color:oppositeSides?K.gn:bothPlus?K.yl:K.mt}}>
          {oppositeSides?"VALID â€” opposite sides":bothPlus?"MAYBE â€” both sides show value":"Check manually"}
        </span>
      </div>
      <RR l="Combined implied probability" v={`${f(ipSum,1)}%`} c={ipSum<100?K.gn:ipSum<110?K.gn:ipSum<120?K.yl:K.rd}/>
      <div style={{marginBottom:8,fontSize:12,fontWeight:600,color:ipSum<100?K.gn:ipSum<110?K.gn:ipSum<120?K.yl:K.rd}}>
        {ipSum<100?"Possible arb opportunity!":ipSum<110?"Plausible market":ipSum<120?"High vig market":"Unusual â€” double check these lines"}
      </div>
      {arb&&<>
        <RR l="Hedge math check ($100 total)" v={arb.ok?`ARB: +$${arb.pr}`:"No arb"} c={arb.ok?K.gn:K.rd} b/>
        {arb.ok&&<Nt c={K.gn}>These lines contain an arb! ROI: {arb.roi}%. Use the 2-Way Arb calculator for exact stakes.</Nt>}
        {!arb.ok&&<Nt c={K.yl}>No arb. Best side to exploit: {toD(o1)>toD(o2)?"Line 1 ("+o1+")":"Line 2 ("+o2+")"}.</Nt>}
      </>}
    </div>}
  </div>
  <Help entries={[
    ["Use this for","Quickly sanity-check any two lines before running full calculations. Catches same-side bets and obvious errors."],
    ["What to look for","One + and one - usually means opposite sides. Two + odds can still be opposite sides if from different markets."],
    ["Implied probability sum","Under 100% = arb. 100-110% = normal market. Over 120% = unusual, verify your lines."],
  ]}/></div>);
};

// â•â•â• FREE BET ARB TRACKER â•â•â•
const FreeBetArbTracker = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const arbs = data.freeBetArbs || [];
  const save = (a) => syncAppData({...data, freeBetArbs: a});
  const toast = useToast();
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],bookA:'',bookB:'',promoType:'Bonus Bet',amount:'',hedgeAmt:'',profit:'',status:'open',notes:''});
  const add = () => {
    if(!form.amount) return;
    save([{...form,id:Date.now()},...arbs]);
    setForm(f=>({...f,amount:'',hedgeAmt:'',profit:'',notes:''}));
    if(toast) toast('âœ“ Arb logged',K.gn);
  };
  const del = id => { const snap=[...arbs]; save(arbs.filter(a=>a.id!==id)); if(toast) toast('Deleted',K.rd,{label:'UNDO',fn:()=>save(snap)}); };
  const totalProfit = arbs.reduce((s,a)=>s+(parseFloat(a.profit)||0),0);
  const avgProfit = arbs.length ? totalProfit/arbs.length : 0;
  const exportCSV = () => {
    const headers=["Date","Book A","Book B","Promo Type","Amount","Hedge Amount","Profit","Status","Notes"];
    const rows=arbs.map(a=>[a.date,a.bookA,a.bookB,a.promoType,a.amount,a.hedgeAmt,a.profit,a.status,a.notes||""]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-freebetarbs-${new Date().toISOString().split('T')[0]}.csv`, "text/csv");
  };
  return (<div style={S.card}><Tl t="Free Bet Arb Tracker" badge="TRACK" bc={K.pp}/>
    <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
      <div><div style={{fontSize:10,color:K.mt}}>TOTAL ARBS</div><div style={S.big(K.ac)}>{arbs.length}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(K.gn)}>${f(totalProfit)}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>AVG PROFIT</div><div style={S.big(K.yl)}>${f(avgProfit)}</div></div>
      {arbs.length>0&&<button onClick={exportCSV} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,fontWeight:600}}>â†“ Export CSV</button>}
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={S.col}><label style={S.label}>Book A</label><input style={S.input} value={form.bookA} onChange={e=>setForm(f=>({...f,bookA:e.target.value}))} placeholder="DraftKings"/></div>
      <div style={S.col}><label style={S.label}>Book B</label><input style={S.input} value={form.bookB} onChange={e=>setForm(f=>({...f,bookB:e.target.value}))} placeholder="FanDuel"/></div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Promo Type</label><select style={S.input} value={form.promoType} onChange={e=>setForm(f=>({...f,promoType:e.target.value}))}>
        {["Bonus Bet","Same-Game Arb","Insurance","Boost"].map(t=><option key={t}>{t}</option>)}
      </select></div>
      <In l="Amount" v={form.amount} set={v=>setForm(f=>({...f,amount:v}))} pre="$"/>
      <In l="Hedge Amt" v={form.hedgeAmt} set={v=>setForm(f=>({...f,hedgeAmt:v}))} pre="$"/>
      <In l="Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$"/>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
        {["open","won","lost"].map(s=><option key={s}>{s}</option>)}
      </select></div>
      <div style={{flex:2,minWidth:120}}><label style={S.label}>Notes</label><input style={S.input} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="optional notes"/></div>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {arbs.length>0&&<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book A","Book B","Type","Amount","Hedge","Profit","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{arbs.map(a=>(
          <tr key={a.id}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{a.bookA}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{a.bookB}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.pp)}>{a.promoType}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.amount?`$${a.amount}`:"â€”"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.hedgeAmt?`$${a.hedgeAmt}`:"â€”"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(a.profit)>=0?K.gn:K.rd,fontWeight:600}}>{a.profit?`${parseFloat(a.profit)>=0?"+":""}$${a.profit}`:"â€”"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(a.status==="won"?K.gn:a.status==="lost"?K.rd:K.yl)}>{a.status}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(a.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>âœ•</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>}
    {arbs.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>ðŸŽ¯</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No arb plays tracked yet</div>
      <div style={{fontSize:11,color:K.mt}}>Log your free bet arb plays above to track performance.</div>
    </div>}
    <Help entries={[
      ["Free Bet Arb","Using a free bet or bonus bet on one side of a market, and a real cash bet on the other side at a different book to guarantee profit."],
      ["Same-Game Arb","Two bets within the same game at different books where combined implied probability is under 100%."],
    ]}/>
  </div>);
};

// â•â•â• v9.0 NEW COMPONENTS â•â•â•

// â•â•â• PROMO STACKING CALCULATOR â•â•â•
const PromoStacking = () => {
  const [mem, setMem] = useCalcMemory('promo-stacking', {stake:"100",odds:"+200",boost:"50",boostMax:"250",insPct:"100",insMax:"100",conv:"70"});
  const {stake,odds,boost,boostMax,insPct,insMax,conv} = mem;
  const set = k => v => setMem(k,v);
  const r = useMemo(()=>{
    const s=parseFloat(stake), d=toD(odds), bp=parseFloat(boost)/100, bm=parseFloat(boostMax)||Infinity;
    const ip=parseFloat(insPct)/100, im=parseFloat(insMax)||Infinity, cv=(parseFloat(conv)||70)/100;
    if(!s||d<=1) return null;
    const normalProfit=s*(d-1);
    const bonusAdd=Math.min(normalProfit*bp, bm);
    const boostedPayout=s+normalProfit+bonusAdd;
    const netWin=boostedPayout-s;
    const insAmt=Math.min(s*ip, im);
    const insVal=insAmt*cv;
    const netLoss=s-insVal;
    const ev=((1/d)*netWin)-((1-1/d)*netLoss);
    return {netWin:f(netWin), netLoss:f(netLoss), bonusAdd:f(bonusAdd), ev:f(ev), ok:ev>0};
  },[stake,odds,boost,boostMax,insPct,insMax,conv]);
  return (<div><div style={S.card}><Tl t="Promo Stacking Calculator" badge="BOOST + INSURANCE" bc={K.pp} shareable/>
    <div style={S.row}><In l="Stake" v={stake} set={set('stake')} pre="$" ph="100"/><In l="Bet Odds" v={odds} set={set('odds')} ph="+200"/></div>
    <div style={S.row}><In l="Boost %" v={boost} set={set('boost')} ph="50"/><In l="Boost Max $" v={boostMax} set={set('boostMax')} pre="$" ph="250"/></div>
    <div style={S.row}><In l="Insurance %" v={insPct} set={set('insPct')} ph="100"/><In l="Insurance Max $" v={insMax} set={set('insMax')} pre="$" ph="100"/><In l="Conv Rate %" v={conv} set={set('conv')} ph="70"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{padding:"10px 12px",background:`${K.gn}10`,borderRadius:6,border:`1px solid ${K.gn}30`}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:4}}>If Win</div>
          <div style={{fontSize:18,fontWeight:700,color:K.gn}}>+${r.netWin}</div>
          <div style={{fontSize:10,color:K.mt}}>incl. +${r.bonusAdd} boost</div>
        </div>
        <div style={{padding:"10px 12px",background:`${K.rd}10`,borderRadius:6,border:`1px solid ${K.rd}30`}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:4}}>If Lose</div>
          <div style={{fontSize:18,fontWeight:700,color:K.rd}}>-${r.netLoss}</div>
          <div style={{fontSize:10,color:K.mt}}>after insurance value</div>
        </div>
      </div>
      <Nt c={r.ok?K.gn:K.yl}>{r.ok?"Positive EV after stacking boost and insurance.":"Check boost/insurance terms â€” may not be stackable at all books."}</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Promo Stacking","Combining a profit boost with an insurance/refund on the same bet for maximum value extraction."],
    ["Boost Value","The extra profit added to your winnings above normal. Capped by Boost Max."],
    ["Insurance","If your bet loses, you get a portion back as bonus bets. Value = Insurance Amount Ã— Conversion Rate."],
    ["EV","Expected value weighs the if-win and if-lose scenarios by their probabilities."],
  ]}/></div>);
};

// â•â•â• PROMO TRADE JOURNAL â•â•â•
const PromoJournal = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const journal = data.journal || [];
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],book:"DraftKings",type:"Bonus Bet",notes:"",profit:"",tags:""});
  const [filterBook, setFilterBook] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const toast = useToast();
  const save = (j) => syncAppData({...data, journal:j});
  const add = () => {
    if(!form.profit) return;
    const entry={...form,id:Date.now(),tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean)};
    save([entry,...journal]);
    setForm(f=>({...f,notes:"",profit:"",tags:""}));
    if(toast) toast('âœ“ Journal entry added',K.gn);
  };
  const del = id => { const snap=[...journal]; save(journal.filter(e=>e.id!==id)); if(toast) toast('Deleted',K.rd,{label:'UNDO',fn:()=>save(snap)}); };
  const TYPES = ["Bonus Bet","Profit Boost","First Bet","Arb","EV Bet","Other"];
  const filtered = journal.filter(e=>(filterBook==="All"||e.book===filterBook)&&(filterType==="All"||e.type===filterType));
  const sorted = [...filtered].sort((a,b)=>b.date.localeCompare(a.date));
  return (<div style={S.card}><Tl t="Promo Trade Journal" badge="TRACK" bc={K.ac}/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={S.row}>
      <In l="Net Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$" ph="50"/>
      <In l="Tags (comma-sep)" v={form.tags} set={v=>setForm(f=>({...f,tags:v}))} ph="arb,boost"/>
    </div>
    <div style={{marginBottom:12}}><label style={S.label}>Notes</label><textarea style={{...S.input,height:64,resize:"vertical"}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="What promo, outcome, lessons learnedâ€¦"/></div>
    <button onClick={add} style={{padding:"8px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,marginBottom:16}}>+ Add Entry</button>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:10,color:K.mt}}>Filter:</span>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(journal.map(e=>e.book))].sort().map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
        <option value="All">All Types</option>
        {TYPES.map(t=><option key={t}>{t}</option>)}
      </select>
    </div>
    {sorted.length===0&&<div style={{textAlign:"center",padding:"24px 16px"}}>
      <div style={{fontSize:24,marginBottom:8}}>ðŸ““</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No journal entries yet</div>
      <div style={{fontSize:11,color:K.mt}}>Fill in the form and click <strong style={{color:K.gn}}>+ Add Entry</strong> to start tracking.</div>
    </div>}
    {sorted.map(e=>(
      <div key={e.id} style={{...S.card,background:K.s2,marginBottom:8,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,color:K.tx}}>{e.book}</span>
              <span style={S.tag(K.ac)}>{e.type}</span>
              <span style={{fontSize:11,color:K.mt}}>{e.date}</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:parseFloat(e.profit)>=0?K.gn:K.rd,marginBottom:4}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</div>
            {e.notes&&<div style={{fontSize:11,color:K.dm,marginBottom:4,maxWidth:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.notes}</div>}
            {e.tags&&e.tags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{e.tags.map((t,i)=><span key={i} style={S.tag(K.pp)}>{t}</span>)}</div>}
          </div>
          <span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:11,flexShrink:0}}>âœ•</span>
        </div>
      </div>
    ))}
  </div>);
};

// â•â•â• ODDS COMPARISON TABLE â•â•â•
const OddsComparisonTable = () => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const rows = data.oddsCompare || [{event:"",odds:{}}];
  const COMPARE_BOOKS = ["DraftKings","FanDuel","BetMGM","Caesars","bet365","ESPN BET","Fanatics","BetRivers"];
  const prevRowsRef = useRef({});
  const [moveBadges, setMoveBadges] = useState({});
  const updateRow = (i, field, val) => {
    const next = rows.map((r,j)=>j===i?{...r,[field]:val}:r);
    syncAppData({...data, oddsCompare:next});
  };
  const updateOdds = (i, book, val) => {
    const prev = rows[i]?.odds?.[book] || "";
    const prevD = toD(prev), newD = toD(val);
    if(prev && val && prevD>1 && newD>1 && Math.abs(newD-prevD)>0.01) {
      const key = `${i}-${book}`;
      const dir = newD > prevD ? "up" : "down";
      prevRowsRef.current[key] = dir;
      setMoveBadges(mb=>({...mb,[key]:dir}));
      setTimeout(()=>setMoveBadges(mb=>{const n={...mb};delete n[key];return n;}), 3000);
    }
    const next = rows.map((r,j)=>j===i?{...r,odds:{...r.odds,[book]:val}}:r);
    syncAppData({...data, oddsCompare:next});
  };
  const addRow = () => syncAppData({...data, oddsCompare:[...rows,{event:"",odds:{}}]});
  const removeRow = i => syncAppData({...data, oddsCompare:rows.filter((_,j)=>j!==i)});
  return (<div style={S.card}><Tl t="Odds Comparison Table" badge="LINE SHOPPING" bc={K.gn}/>
    <div style={{overflowX:"auto",marginBottom:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
        <thead><tr>
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,textAlign:"left",fontSize:10,textTransform:"uppercase",minWidth:140}}>Event</th>
          {COMPARE_BOOKS.map(b=><th key={b} style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase",minWidth:90}}>{b}</th>)}
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>Best</th>
          <th style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10}}></th>
        </tr></thead>
        <tbody>{rows.map((row,i)=>{
          const validEntries = COMPARE_BOOKS.map(b=>({book:b,val:row.odds[b]||""})).filter(e=>e.val&&toD(e.val)>1);
          const bestBook = validEntries.length ? validEntries.reduce((best,e)=>toD(e.val)>toD(best.val)?e:best) : null;
          const worstD = validEntries.length ? Math.min(...validEntries.map(e=>toD(e.val))) : 0;
          const spread = bestBook && worstD>1 ? f((toD(bestBook.val)-worstD)*100/(worstD),1) : null;
          return (<tr key={i}>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`}}>
              <input style={{...S.input,padding:"4px 6px",fontSize:11}} value={row.event} onChange={e=>updateRow(i,'event',e.target.value)} placeholder="e.g. Chiefs ML"/>
            </td>
            {COMPARE_BOOKS.map(b=>{
              const isB = bestBook?.book===b && validEntries.length>1;
              const d=toD(row.odds[b]||"");
              const ip=d>1?f(1/d*100,1):null;
              const badgeKey=`${i}-${b}`;
              const badge=moveBadges[badgeKey];
              return (<td key={b} style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`,background:isB?`${K.gn}10`:"transparent",position:"relative"}}>
                <input style={{...S.input,padding:"3px 6px",fontSize:11,borderColor:isB?K.gn:undefined,width:76}} value={row.odds[b]||""} onChange={e=>updateOdds(i,b,e.target.value)} placeholder="-110"/>
                {ip&&<div style={{fontSize:9,color:isB?K.gn:K.mt,marginTop:2,textAlign:"center"}}>{ip}%</div>}
                {badge&&<span style={{position:"absolute",top:2,right:4,fontSize:9,fontWeight:700,color:badge==="up"?K.gn:K.rd,pointerEvents:"none",animation:"fadeIn 0.2s"}}>{badge==="up"?"â–²":"â–¼"}</span>}
              </td>);
            })}
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700,fontSize:12}}>
              {bestBook&&<div>{bestBook.val}<div style={{fontSize:9,color:K.mt}}>{bestBook.book}</div></div>}
              {spread&&<div style={{fontSize:9,color:K.yl}}>+{spread}Â¢ vs worst</div>}
            </td>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`}}>
              {rows.length>1&&<span onClick={()=>removeRow(i)} style={{cursor:"pointer",color:K.rd,fontSize:11}}>âœ•</span>}
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>
    <button onClick={addRow} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.gn,fontSize:11,cursor:"pointer",fontFamily:font}}>+ Add Event</button>
    <Nt c={K.ac}>Green cells = best odds in that row. â–²â–¼ badges show when a line moves. Always bet where the odds are highest for your side.</Nt>
  </div>);
};

// â•â•â• PROMO ARB FINDER â•â•â•
const KNOWN_STACKABLE = [
  {book1:"DraftKings",book2:"FanDuel",desc:"DK Stepped-Up Parlay + FD SGP Insurance on same slate",value:"Stack same-slate SGP for double coverage"},
  {book1:"Caesars",book2:"BetMGM",desc:"Caesars 100% Profit Boost + BetMGM Safety Net on same game",value:"Hedge both outcomes with bonus protection"},
  {book1:"DraftKings",book2:"BetRivers",desc:"DK Profit Boost + BetRivers 2nd Chance Parlay",value:"Boost + refund on same event"},
  {book1:"FanDuel",book2:"ESPN BET",desc:"FD No Sweat SGP + ESPN BET Profit Boost on same game",value:"Insurance + boosted payout combo"},
];

const PromoArbFinder = () => {
  const [bookAOdds, setBookAOdds] = useState("+200");
  const [boostPct, setBoostPct] = useState("50");
  const [bookBOdds, setBookBOdds] = useState("-220");
  const [stake, setStake] = useState("100");
  const r = useMemo(()=>{
    const s=parseFloat(stake), da=toD(bookAOdds), db=toD(bookBOdds), bp=parseFloat(boostPct)/100;
    if(!s||da<=1||db<=1) return null;
    const normalProfit=s*(da-1);
    const bonusAdd=normalProfit*bp;
    const boostedPayout=s+normalProfit+bonusAdd;
    const hedgeStake=boostedPayout/db;
    const netWin=boostedPayout-s-hedgeStake;
    const netLoseSide2=hedgeStake*(db-1)-s;
    const bothProfit=Math.min(netWin, netLoseSide2);
    return {hedgeStake:f(hedgeStake), netWin:f(netWin), netLoseSide2:f(netLoseSide2), bothProfit:f(bothProfit), ok:bothProfit>0};
  },[bookAOdds,boostPct,bookBOdds,stake]);
  return (<div style={S.card}><Tl t="Promo Arb Finder" badge="CROSS-BOOK" bc={K.pp}/>
    <div style={{fontSize:12,color:K.dm,marginBottom:16,lineHeight:1.6}}>Stack a profit boost from Book A with a hedge at Book B on the same event to lock in profit regardless of outcome.</div>
    <div style={S.row}>
      <In l="Book A Odds (boosted bet)" v={bookAOdds} set={setBookAOdds} ph="+200"/>
      <In l="Book A Boost %" v={boostPct} set={setBoostPct} ph="50"/>
      <In l="Book B Hedge Odds" v={bookBOdds} set={setBookBOdds} ph="-220"/>
      <In l="Stake at Book A" v={stake} set={setStake} pre="$" ph="100"/>
    </div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.bothProfit}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span></div>
      <RR l="Hedge stake at Book B" v={`$${r.hedgeStake}`} c={K.ac} b/>
      <RR l="Net if Book A wins (boosted)" v={`+$${r.netWin}`} c={K.gn}/>
      <RR l="Net if Book B wins (hedge)" v={`${parseFloat(r.netLoseSide2)>=0?"+":""}$${r.netLoseSide2}`} c={parseFloat(r.netLoseSide2)>=0?K.gn:K.rd}/>
      {!r.ok&&<Nt c={K.yl}>No arb at these odds. Try higher boost % or better hedge odds.</Nt>}
    </div>}
    <div style={{marginTop:20}}>
      <div style={{fontSize:12,fontWeight:700,color:K.ac,marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>Known Stackable Combos</div>
      {KNOWN_STACKABLE.map((c,i)=>(
        <div key={i} style={{...S.card,background:K.s2,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:700,color:K.tx}}>{c.book1}</span>
            <span style={{fontSize:10,color:K.mt}}>+</span>
            <span style={{fontSize:12,fontWeight:700,color:K.tx}}>{c.book2}</span>
          </div>
          <div style={{fontSize:11,color:K.dm,marginBottom:2}}>{c.desc}</div>
          <div style={{fontSize:10,color:K.pp}}>{c.value}</div>
        </div>
      ))}
    </div>
  </div>);
};

// â•â•â• STATE LEGAL ALERT â•â•â•
const RECENTLY_LEGALIZED = [
  {state:"North Carolina",abbr:"NC",date:"2024-03-11",note:"Mobile betting went live March 11, 2024"},
  {state:"Vermont",abbr:"VT",date:"2024-01-11",note:"Mobile betting live January 11, 2024"},
  {state:"Kentucky",abbr:"KY",date:"2023-09-28",note:"Mobile betting live September 2023"},
  {state:"Maine",abbr:"ME",date:"2023-11-03",note:"Mobile betting live November 2023"},
];
const COMING_SOON_STATES = ["MO","GA","TX","FL","AL","OK"];

const StateLegalAlert = ({ userState }) => {
  const [dismissed, setDismissed] = useState(()=>{ try{return !!localStorage.getItem('pg_state_alert_dismissed');}catch{return false;} });
  if(dismissed||!userState) return null;
  const recent = RECENTLY_LEGALIZED.find(s=>s.abbr===userState||s.state===userState);
  const comingSoon = COMING_SOON_STATES.includes(userState);
  if(!recent&&!comingSoon) return null;
  const dismiss = () => { try{localStorage.setItem('pg_state_alert_dismissed','1');}catch{} setDismissed(true); };
  return (
    <div style={{...S.card,background:recent?`${K.gn}08`:`${K.yl}08`,border:`1px solid ${recent?K.gn:K.yl}30`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1}}>
          {recent&&<>
            <div style={{fontSize:13,fontWeight:700,color:K.gn,marginBottom:4}}>ðŸŽ‰ Your state [{userState}] recently launched sports betting!</div>
            <div style={{fontSize:12,color:K.dm,marginBottom:4}}>{recent.note}</div>
            <div style={{fontSize:11,color:K.dm}}>DraftKings, FanDuel, BetMGM, and Caesars are all available. Check the Sportsbooks tab to start tracking.</div>
          </>}
          {comingSoon&&!recent&&<>
            <div style={{fontSize:13,fontWeight:700,color:K.yl,marginBottom:4}}>â³ Sports betting is not yet available in your state ({userState})</div>
            <div style={{fontSize:11,color:K.dm}}>We'll keep the tools ready for when it launches. Set your state in the Sportsbooks tab to get updates.</div>
          </>}
        </div>
        <button onClick={dismiss} style={{background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:14,padding:"0 4px",flexShrink:0}}>âœ•</button>
      </div>
    </div>
  );
};

// â•â•â• WEEKLY GRIND REPORT â•â•â•
const WeeklyGrindReport = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const generate = () => {
    const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay()||7) + 1); mon.setHours(0,0,0,0);
    const ledger = data.ledger || [];
    const week = ledger.filter(e => e.date && new Date(e.date) >= mon);
    const wins = week.filter(e => parseFloat(e.profit) > 0);
    const pl = week.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const winRate = week.length ? Math.round(wins.length/week.length*100) : 0;
    const best = week.length ? week.reduce((b,e)=>parseFloat(e.profit)>parseFloat(b.profit)?e:b,week[0]) : null;
    const sorted = [...(data.ledger||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    let streak = 0;
    for(const e of sorted) { if(parseFloat(e.profit)>0) streak++; else break; }
    const monStr = mon.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    setReport({ bets:week.length, pl:f(pl), winRate, best, streak, monStr });
  };
  const copyReport = () => {
    if(!report) return;
    const bestDay = report.best ? new Date(report.best.date).toLocaleDateString('en-US',{weekday:'short'}) : 'â€”';
    const text = `ðŸ“Š PromoGrind Weekly Report â€” Week of ${report.monStr}\nBets logged: ${report.bets} | P/L: ${parseFloat(report.pl)>=0?'+':''}$${report.pl} | Win rate: ${report.winRate}%\nBest day: ${bestDay} +$${report.best?f(parseFloat(report.best.profit)):'0'} | Current streak: ${report.streak} wins\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false),1500);
  };
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:8,fontFamily:fontD}}>Weekly Grind Report</div>
      {!report&&<button onClick={generate} style={{padding:"7px 14px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>Generate Report</button>}
      {report&&<>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>
          <div><div style={{fontSize:9,color:K.mt}}>BETS</div><div style={{fontSize:20,fontWeight:700,color:K.tx,fontFamily:fontD}}>{report.bets}</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>WEEK P/L</div><div style={{fontSize:20,fontWeight:700,color:parseFloat(report.pl)>=0?K.gn:K.rd,fontFamily:fontD}}>{parseFloat(report.pl)>=0?'+':''}${report.pl}</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>WIN RATE</div><div style={{fontSize:20,fontWeight:700,color:report.winRate>=50?K.gn:K.rd,fontFamily:fontD}}>{report.winRate}%</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>STREAK</div><div style={{fontSize:20,fontWeight:700,color:report.streak>=3?K.gn:K.yl,fontFamily:fontD}}>{report.streak}W</div></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={copyReport} style={{padding:"6px 14px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>{copied?"âœ“ Copied!":"ðŸ“‹ Copy Report"}</button>
          <button onClick={()=>setReport(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Regenerate</button>
        </div>
      </>}
    </div>
  );
};

// â•â•â• BANKROLL ALLOCATION WIZARD â•â•â•
const BankrollWizard = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const defaultBankroll = data.bankroll || (() => { try{return localStorage.getItem('pg_bankroll')||'';}catch{return '';} })();
  const [bwBankroll, setBwBankroll] = useState(defaultBankroll);
  const [bwBooks, setBwBooks] = useState(BOOKS.map(b=>b.name));
  const [bwResults, setBwResults] = useState(null);
  const TIER1 = ["DraftKings","FanDuel"];
  const TIER2 = ["BetMGM","Caesars"];
  const PROMO_CPA = {DraftKings:75,FanDuel:75,BetMGM:50,Caesars:50};
  const recalc = () => {
    const br = parseFloat(bwBankroll)||0;
    if(!br||!bwBooks.length) return;
    const selected = bwBooks;
    const t1 = selected.filter(n=>TIER1.includes(n));
    const t2 = selected.filter(n=>TIER2.includes(n));
    const rest = selected.filter(n=>!TIER1.includes(n)&&!TIER2.includes(n));
    let used = 0;
    const t1pct = t1.length * 0.25;
    const t2pct = t2.length * 0.20;
    used = t1pct + t2pct;
    const restPct = rest.length > 0 ? (1-used)/rest.length : 0;
    const rows = selected.map(name=>{
      const pct = TIER1.includes(name)?0.25:TIER2.includes(name)?0.20:restPct;
      return { name, alloc: f(br*pct), pct:Math.round(pct*100), cpa:PROMO_CPA[name]||25 };
    });
    setBwResults(rows);
  };
  const toggleBook = (name) => setBwBooks(prev=>prev.includes(name)?prev.filter(n=>n!==name):[...prev,name]);
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:8,fontFamily:fontD}}>Bankroll Allocation Wizard</div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
        <label style={{...S.label,marginBottom:0}}>Bankroll $</label>
        <input style={{...S.input,width:120}} value={bwBankroll} onChange={e=>setBwBankroll(e.target.value)} placeholder="3000"/>
        <button onClick={recalc} style={{padding:"6px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Recalculate</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {BOOKS.map(b=>(
          <label key={b.name} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11,color:bwBooks.includes(b.name)?K.tx:K.mt}}>
            <input type="checkbox" checked={bwBooks.includes(b.name)} onChange={()=>toggleBook(b.name)} style={{accentColor:K.gn}}/>
            {b.name}
          </label>
        ))}
      </div>
      {bwResults&&<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Book","Allocation","% of BR","Est. Promo Value"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{bwResults.map(r=>(
            <tr key={r.name}>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{r.name}</td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700}}>${r.alloc}</td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{r.pct}%</td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.yl}}>~${r.cpa}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
};

// FX, CurrencyCtx â†’ ./contexts.jsx
const useCurrency = () => React.useContext(CurrencyCtx);

// â•â•â• DAILY ROUTINE PANEL â•â•â•
const DailyRoutinePanel = ({ openBetsCount, expiringCount }) => {
  const hour = new Date().getHours();
  const [checks, setChecks] = useState({});
  let tasks = [];
  if(hour < 12) {
    tasks = ["Check DK/FD daily profit boosts","Run No-Vig on today's best line","Log yesterday's settled bets"];
  } else if(hour < 17) {
    tasks = ["Check live scanner for +EV","Review open parlay exposure","Update book health statuses"];
  } else {
    tasks = ["Settle today's open bets","Log profits to ledger","Check tomorrow's promos"];
  }
  const alerts = [];
  if(openBetsCount>3) alerts.push(`âš  ${openBetsCount} open bets need attention`);
  if(expiringCount>0) alerts.push(`ðŸ”¥ ${expiringCount} promos expiring soon`);
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:10,fontFamily:fontD}}>Today's Grind</div>
      {alerts.map((a,i)=><div key={i} style={{fontSize:11,color:K.yl,fontWeight:600,marginBottom:6}}>{a}</div>)}
      {tasks.map((task,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${K.bd}`}}>
          <div role="checkbox" aria-checked={!!checks[i]} onClick={()=>setChecks(c=>({...c,[i]:!c[i]}))} style={{width:16,height:16,borderRadius:3,border:`2px solid ${checks[i]?K.gn:K.bd2}`,background:checks[i]?K.gn:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {checks[i]&&<span style={{color:K.bg,fontSize:10,fontWeight:700}}>âœ“</span>}
          </div>
          <span style={{fontSize:12,color:checks[i]?K.mt:K.tx,textDecoration:checks[i]?"line-through":"none"}}>{i+1}. {task}</span>
        </div>
      ))}
    </div>
  );
};

// â•â•â• PROFIT GOAL MILESTONE â•â•â•
const ProfitGoalTracker = ({ totalProfit }) => {
  const { appData: data, syncAppData } = React.useContext(AppDataCtx);
  const [showInput, setShowInput] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const goal = parseFloat(data.profitGoal)||0;
  const pct = goal>0 ? Math.min(100, totalProfit/goal*100) : 0;
  const remaining = goal>0 ? Math.max(0, goal-totalProfit) : 0;
  const barColor = pct>=100?K.gn:pct>=60?K.yl:K.ac;
  const setGoal = () => {
    const g = parseFloat(inputVal);
    if(!isNaN(g)&&g>0) { syncAppData({...data,profitGoal:g}); setShowInput(false); setInputVal(""); }
  };
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:K.tx,fontFamily:fontD}}>Profit Goal</div>
        <button onClick={()=>setShowInput(s=>!s)} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>{showInput?"Cancel":"Set Goal"}</button>
      </div>
      {showInput&&<div style={{display:"flex",gap:8,marginBottom:8}}>
        <input style={{...S.input,flex:1}} value={inputVal} onChange={e=>setInputVal(e.target.value)} placeholder="Enter goal $"/>
        <button onClick={setGoal} style={{padding:"6px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11}}>Save</button>
      </div>}
      {goal>0&&<>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:K.mt,marginBottom:6}}>
          <span>Progress: {f(pct,1)}% of ${f(goal,0)} goal</span>
          {pct<100&&<span>Remaining: ${f(remaining)}</span>}
        </div>
        <div style={{height:8,background:K.s3,borderRadius:4,overflow:"hidden",marginBottom:8}}>
          <div style={{height:8,borderRadius:4,background:barColor,width:`${pct}%`,transition:"width 0.5s"}}/>
        </div>
        {pct>=100&&<div style={{textAlign:"center",padding:"10px",background:`${K.gn}15`,border:`1px solid ${K.gn}30`,borderRadius:6,fontSize:14,fontWeight:700,color:K.gn,animation:"pulse 1s infinite alternate"}}>
          ðŸŽ‰ðŸŽ‰ðŸŽ‰ GOAL REACHED! ðŸŽ‰ðŸŽ‰ðŸŽ‰
          <style>{`@keyframes pulse{from{opacity:0.7}to{opacity:1}}`}</style>
        </div>}
      </>}
      {!goal&&!showInput&&<div style={{fontSize:11,color:K.mt}}>Set a profit goal to track your progress.</div>}
    </div>
  );
};

// â•â•â• DAILY BRIEFING â•â•â•
const useDailyBriefing = (openBets, todayPromos) => {
  useEffect(()=>{
    try {
      const enabled = isDailyBriefEnabled();
      if(!enabled) return;
      const now = new Date();
      const hour = now.getHours(), min = now.getMinutes();
      if(hour!==9||(min>15)) return;
      const todayStr = now.toISOString().split('T')[0];
      if(localStorage.getItem('pg_brief_shown_today')===todayStr) return;
      if(typeof Notification!=='undefined'&&Notification.permission==='granted') {
        const openCount = openBets?.length||0;
        const body = `${openCount} open bet${openCount!==1?"s":""} pending. ${todayPromos?.length||0} promos available today.`;
        new Notification('PromoGrind Daily Briefing',{body, icon:'/favicon.svg'});
        localStorage.setItem('pg_brief_shown_today', todayStr);
      }
    } catch(e) {}
  },[]);
};

const DailyBriefingBtn = ({ openBets, todayPromos }) => {
  useDailyBriefing(openBets, todayPromos);
  const [enabled, setEnabled] = useState(() => isDailyBriefEnabled());
  const isPro = ()=>{ try{return ['vault_sparked','pro'].includes(localStorage.getItem('pg_pro_status')||'');}catch{return false;} };
  if(!isPro()&&!enabled) return null;
  const toggle = async () => {
    if(!enabled) {
      const result = await enableDailyBriefPush();
      if(result.ok) setEnabled(true);
    } else {
      await disableDailyBriefPush();
      setEnabled(false);
    }
  };
  return (
    <button onClick={toggle} style={{padding:"5px 12px",background:enabled?`${K.gn}15`:"transparent",border:`1px solid ${enabled?K.gn:K.bd2}`,borderRadius:6,color:enabled?K.gn:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
      {enabled?"ðŸ”” 9am Briefing ON":"ðŸ”• Enable 9am Briefing"}
    </button>
  );
};

// â•â•â• MULTI-BOOK EXPOSURE DASHBOARD â•â•â•
const OpenExposurePanel = ({ bets }) => {
  const openBets = (bets||[]).filter(b=>b.status==='open');
  if(!openBets.length) return null;
  const byBook = {};
  openBets.forEach(b=>{
    if(!byBook[b.book]) byBook[b.book]={bets:0,atRisk:0,potWin:0};
    byBook[b.book].bets++;
    byBook[b.book].atRisk+=parseFloat(b.stake)||0;
    byBook[b.book].potWin+=parseFloat(b.toWin)||0;
  });
  const books = Object.entries(byBook);
  const totRisk = books.reduce((s,[,v])=>s+v.atRisk,0);
  const totWin = books.reduce((s,[,v])=>s+v.potWin,0);
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:10,fontFamily:fontD}}>Open Exposure</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Book","Bets","At Risk","Potential Win"].map(h=><th key={h} style={{textAlign:"left",padding:"5px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>
            {books.map(([book,v])=>(
              <tr key={book}>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600,color:K.tx}}>{book}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.ac}}>{v.bets}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.rd,fontWeight:600}}>${f(v.atRisk)}</td>
                <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>${f(v.potWin)}</td>
              </tr>
            ))}
            <tr style={{background:K.s3}}>
              <td style={{padding:"6px 8px",fontWeight:700,color:K.tx}}>TOTAL</td>
              <td style={{padding:"6px 8px",color:K.ac,fontWeight:700}}>{openBets.length}</td>
              <td style={{padding:"6px 8px",color:K.rd,fontWeight:700}}>${f(totRisk)}</td>
              <td style={{padding:"6px 8px",color:K.gn,fontWeight:700}}>${f(totWin)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// â•â•â• TOP TOOLS PANEL â•â•â•
let TABS_REF = [];
const TopToolsPanel = ({ navigate }) => {
  const usage = useMemo(()=>{ try{return JSON.parse(localStorage.getItem('pg_usage_log')||'{}');}catch{return {};} },[]);
  const top5 = Object.entries(usage).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!top5.length) return null;
  const nameMap = {};
  TABS_REF.forEach(g=>g.items.forEach(item=>{ nameMap[item.slug]=item.n; }));
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:8,fontFamily:fontD}}>Your Top Tools</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {top5.map(([slug,count])=>(
          <button key={slug} onClick={()=>navigate('/'+slug)} style={{padding:"5px 12px",background:K.s2,border:`1px solid ${K.bd2}`,borderRadius:50,color:K.ac,fontSize:11,cursor:"pointer",fontFamily:font,display:"flex",alignItems:"center",gap:6}}>
            <span>{nameMap[slug]||slug}</span>
            <span style={{fontSize:9,color:K.mt,background:K.s3,padding:"1px 5px",borderRadius:10}}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// â•â•â• COPY MY SETUP â•â•â•
const CopyMySetup = ({ appData: data, syncAppData }) => {
  const [bankroll, setBankroll] = useState(()=>{ try{return localStorage.getItem('pg_bankroll')||'';}catch{return '';} });
  const [copied, setCopied] = useState(false);
  const [cardCopied, setCardCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  useEffect(()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      const setup = params.get('setup');
      if(setup) {
        const decoded = JSON.parse(atob(setup));
        setModalData(decoded);
        setShowModal(true);
      }
    } catch(e) {}
  },[]);
  const copyLink = () => {
    const payload = { userState: data.userState, done: data.done, bankroll };
    const encoded = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}?setup=${encoded}`;
    try{navigator.clipboard.writeText(url);}catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };
  const shareCard = () => {
    const booksComplete=Object.values(data.done||{}).filter(Boolean).length;
    const totalProfit=(data.ledger||[]).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const card=[
      "ðŸ’° PromoGrind Setup",
      `State: ${data.userState||"Not set"} Â· Bankroll: ${bankroll?"$"+bankroll:"Not set"}`,
      `Books done: ${booksComplete}/${BOOKS.length} Â· Total profit: $${f(totalProfit)}`,
      CANONICAL_APP_URL.replace(/^https?:\/\//,''),
    ].join('\n');
    try{navigator.clipboard.writeText(card);}catch(e){}
    setCardCopied(true); setTimeout(()=>setCardCopied(false),2000);
  };
  const loadSetup = () => {
    if(!modalData) return;
    try{localStorage.setItem('pg_bankroll', modalData.bankroll||'');}catch{}
    syncAppData({...data, userState:modalData.userState, done:modalData.done||{}});
    setShowModal(false);
  };
  return (
    <>
      <div style={{...S.card,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:8,fontFamily:fontD}}>Share My Setup</div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input style={{...S.input,flex:1}} value={bankroll} onChange={e=>{setBankroll(e.target.value);try{localStorage.setItem('pg_bankroll',e.target.value);}catch{}}} placeholder="Your bankroll $"/>
          <button onClick={copyLink} style={{padding:"7px 14px",background:copied?K.gn:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"âœ“ Copied!":"Copy Setup Link"}</button>
          <button onClick={shareCard} style={{padding:"7px 14px",background:cardCopied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{cardCopied?"âœ“ Copied!":"Share Card"}</button>
        </div>
        <div style={{fontSize:10,color:K.mt}}>Shares your state, completed books, and bankroll. Anyone with the link can load your setup.</div>
      </div>
      {showModal&&modalData&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:24,maxWidth:400,width:"100%"}}>
            <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:8,fontFamily:fontD}}>Load this setup?</div>
            <div style={{fontSize:12,color:K.dm,marginBottom:16,lineHeight:1.6}}>
              State: <strong style={{color:K.tx}}>{modalData.userState||"Not set"}</strong><br/>
              Books done: <strong style={{color:K.tx}}>{Object.values(modalData.done||{}).filter(Boolean).length}</strong><br/>
              Bankroll: <strong style={{color:K.tx}}>{modalData.bankroll?"$"+modalData.bankroll:"Not set"}</strong>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={loadSetup} style={{flex:1,padding:"9px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font}}>Load Setup</button>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"9px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// TaxTimingAdvisor â†’ ./components/Ledger.jsx
// â•â•â• BET SLIP TEXT PARSER â•â•â•
const parseBetSlip = (text) => {
  const result = {};
  const dollarMatch = text.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  if(dollarMatch) result.stake = dollarMatch[1].replace(',','');
  const americanOdds = text.match(/([+-]\d{3,4})/);
  const decimalOdds = text.match(/\b([1-9]\d?\.\d{2})\b/);
  const fractOdds = text.match(/\b(\d+\/\d+)\b/);
  if(americanOdds) result.odds = americanOdds[1];
  else if(decimalOdds) result.odds = decimalOdds[1];
  else if(fractOdds) result.odds = fractOdds[1];
  const bookNames = ["DraftKings","FanDuel","BetMGM","Caesars","bet365","ESPN BET","Fanatics","BetRivers","Draftkings","Fanduel","Betmgm"];
  for(const b of bookNames) { if(text.toLowerCase().includes(b.toLowerCase())) { result.book = BOOKS.find(bk=>bk.name.toLowerCase()===b.toLowerCase())?.name||b; break; } }
  if(/parlay/i.test(text)) result.type = "Parlay";
  const descMatch = text.match(/([A-Z][a-z]+ (?:vs?\.?|@) [A-Z][a-z]+)/);
  if(descMatch) result.notes = descMatch[1];
  return result;
};

// â•â•â• COMMUNITY PROMOS â•â•â•
function CommunityPromos({ user, supabase: sb, isPro: isProFn }) {
  const [promos, setPromos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filterBook, setFilterBook] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const [showSubmit, setShowSubmit] = React.useState(false);
  const [form, setForm] = React.useState({ book:'', promo_name:'', promo_type:'bonus_bet', value:'', state:'', expires_at:'' });
  const [cpUser, setCpUser] = React.useState(user || null);
  React.useEffect(() => {
    if (!cpUser) supabase.auth.getSession().then(({data:{session}}) => { if(session) setCpUser(session.user); });
  }, []);
  const cpIsPro = isProFn || (() => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } });
  const CP_PROMO_TYPES = ['bonus_bet','profit_boost','parlay_insurance','reload','deposit_match','other'];
  const CP_BOOKS = ['DraftKings','FanDuel','BetMGM','Caesars','bet365','ESPN BET','Fanatics','BetRivers','William Hill','Paddy Power'];
  const loadPromos = React.useCallback(async () => {
    setLoading(true);
    let q = supabase.from('community_promos').select('*').eq('is_approved', true).order('upvotes', { ascending: false }).limit(50);
    if (filterBook) q = q.eq('book', filterBook);
    if (filterType) q = q.eq('promo_type', filterType);
    const { data } = await q;
    setPromos(data || []);
    setLoading(false);
  }, [filterBook, filterType]);
  React.useEffect(() => { loadPromos(); }, [loadPromos]);
  const upvote = async (id) => {
    await supabase.rpc('upvote_community_promo', { promo_id: id });
    setPromos(p => p.map(x => x.id === id ? { ...x, upvotes: (x.upvotes||0) + 1 } : x));
  };
  const submit = async () => {
    if (!form.book || !form.promo_name || !form.value || !cpUser) return;
    await supabase.from('community_promos').insert({ ...form, user_id: cpUser.id });
    setShowSubmit(false);
    setForm({ book:'', promo_name:'', promo_type:'bonus_bet', value:'', state:'', expires_at:'' });
    loadPromos();
  };
  return (
    <div style={{padding:16,maxWidth:720,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:'#e2e8f0'}}>Community Promos</div>
          <div style={{fontSize:12,color:'#64748b'}}>User-submitted sportsbook offers â€” upvote the best ones</div>
        </div>
        {cpIsPro() ? (
          <button onClick={() => setShowSubmit(s => !s)} style={{padding:'8px 16px',background:'#4ade80',color:'#0a0e17',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13}}>+ Submit Promo</button>
        ) : (
          <div style={{fontSize:12,color:'#64748b'}}>VaultSparked to submit</div>
        )}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <select value={filterBook} onChange={e => setFilterBook(e.target.value)} style={{padding:'6px 10px',background:'#0f1724',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}>
          <option value=''>All Books</option>
          {CP_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{padding:'6px 10px',background:'#0f1724',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}>
          <option value=''>All Types</option>
          {CP_PROMO_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      {showSubmit && (
        <div style={{padding:16,background:'#0f1724',border:'1px solid #4ade80',borderRadius:8,marginBottom:16}}>
          <div style={{fontWeight:600,color:'#4ade80',marginBottom:12}}>Submit a Promo</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <select value={form.book} onChange={e => setForm(f=>({...f,book:e.target.value}))} style={{padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}>
              <option value=''>Select Book</option>
              {CP_BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={form.promo_type} onChange={e => setForm(f=>({...f,promo_type:e.target.value}))} style={{padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}}>
              {CP_PROMO_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <input placeholder="Promo name (e.g. 200% Profit Boost on NBA)" value={form.promo_name} onChange={e => setForm(f=>({...f,promo_name:e.target.value}))} style={{width:'100%',padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13,marginBottom:8,boxSizing:'border-box'}} />
          <input placeholder="Value (e.g. $200 bonus bet)" value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} style={{width:'100%',padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13,marginBottom:8,boxSizing:'border-box'}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <input placeholder="State (NY, NJ, UK, or blank=all)" value={form.state} onChange={e => setForm(f=>({...f,state:e.target.value}))} style={{padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}} />
            <input type="date" value={form.expires_at} onChange={e => setForm(f=>({...f,expires_at:e.target.value}))} style={{padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',color:'#e2e8f0',borderRadius:6,fontSize:13}} />
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={submit} style={{padding:'8px 20px',background:'#4ade80',color:'#0a0e17',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:13}}>Submit</button>
            <button onClick={() => setShowSubmit(false)} style={{padding:'8px 16px',background:'transparent',border:'1px solid #1e293b',color:'#94a3b8',borderRadius:6,cursor:'pointer',fontSize:13}}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? (
        <div style={{color:'#64748b',textAlign:'center',padding:32}}>Loading community promosâ€¦</div>
      ) : promos.length === 0 ? (
        <div style={{color:'#64748b',textAlign:'center',padding:32}}>
          <div style={{fontSize:32,marginBottom:8}}>ðŸ“‹</div>
          <div>No promos yet â€” be the first to submit one!</div>
        </div>
      ) : promos.map(p => (
        <div key={p.id} style={{padding:14,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8,marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
          <button onClick={() => upvote(p.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:6,cursor:'pointer',minWidth:44}}>
            <span style={{color:'#4ade80',fontSize:14}}>â–²</span>
            <span style={{color:'#e2e8f0',fontSize:14,fontWeight:700}}>{p.upvotes||0}</span>
          </button>
          <div style={{flex:1}}>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:4}}>
              <span style={{padding:'2px 8px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:4,fontSize:11,color:'#94a3b8'}}>{p.book}</span>
              <span style={{padding:'2px 8px',background:'#1e3a2f',border:'1px solid #4ade80',borderRadius:4,fontSize:11,color:'#4ade80'}}>{(p.promo_type||'').replace(/_/g,' ')}</span>
              {p.state && <span style={{padding:'2px 8px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:4,fontSize:11,color:'#94a3b8'}}>{p.state}</span>}
            </div>
            <div style={{fontWeight:600,color:'#e2e8f0',marginBottom:2}}>{p.promo_name}</div>
            <div style={{color:'#4ade80',fontSize:13}}>{p.value}</div>
            {p.expires_at && <div style={{color:'#64748b',fontSize:11,marginTop:4}}>Expires {new Date(p.expires_at).toLocaleDateString()}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// TaxesEstimator â†’ ./components/TaxesEstimator.jsx

const TABS = [
  { group:"Home", items:[
    {n:"Dashboard",slug:"dashboard",c:DailyDashboard},
    {n:"Promo Intake",slug:"promo-intake",c:PromoIntakeRoute},
    {n:"Daily Brief",slug:"daily-brief",c:DailyBriefPage},
    {n:"Get Started",slug:"get-started",c:GetStartedRoute},
    {n:"What's New",slug:"whats-new",c:WhatsNewRoute},
    {n:"Pricing",slug:"pricing",c:PricingPage},
    {n:"About",slug:"about",c:AboutRoute},
  ]},
  { group:"Convert", items:[
    {n:"Bonus Bet",slug:"bonus-bet",c:BonusBet},
    {n:"Profit Boost",slug:"profit-boost",c:ProfitBoost},
    {n:"First Bet",slug:"first-bet",c:FirstBet},
    {n:"Deposit Match",slug:"deposit-match",c:DepositMatch},
    {n:"Insurance",slug:"insurance",c:InsurancePromo},
  ]},
  { group:"Calculate", items:[
    {n:"No-Vig",slug:"no-vig",c:NoVig,subcat:"Value & EV"},
    {n:"3-Way No-Vig",slug:"no-vig-3way",c:NoVig3Way,subcat:"Value & EV"},
    {n:"+EV",slug:"ev",c:PlusEV,subcat:"Value & EV"},
    {n:"Kelly",slug:"kelly",c:KellyCriterion,subcat:"Value & EV"},
    {n:"2-Way Arb",slug:"arb-2way",c:Arb2Way,subcat:"Arbitrage"},
    {n:"3-Way Arb",slug:"arb-3way",c:Arb3Way,subcat:"Arbitrage"},
    {n:"Parlay Hedge",slug:"parlay-hedge",c:ParlayHedge,subcat:"Arbitrage"},
    {n:"Middle",slug:"middle",c:MiddleBet,subcat:"Arbitrage"},
    {n:"Odds Convert",slug:"odds-convert",c:OddsConvert,subcat:"Advanced"},
    {n:"Line Shop",slug:"line-shop",c:LineShop,subcat:"Value & EV"},
    {n:"Rollover",slug:"rollover",c:RolloverCalc,subcat:"Advanced"},
    {n:"Teaser",slug:"teaser",c:TeaserCalc,subcat:"Value & EV"},
    {n:"Round Robin",slug:"round-robin",c:RoundRobinCalc,subcat:"Arbitrage"},
    {n:"Parlay Builder",slug:"parlay-builder",c:ParlayBuilder,subcat:"Value & EV"},
    {n:"SGP Estimator",slug:"sgp-estimator",c:SGPEstimator,subcat:"Value & EV"},
    {n:"Hold Calc",slug:"hold-calc",c:HoldCalc,subcat:"Value & EV"},
    {n:"Bet Sizer",slug:"bet-sizer",c:BetSizingAdvisor,subcat:"Value & EV"},
    {n:"Income Est.",slug:"income-estimator",c:IncomeEstimator,subcat:"Advanced"},
    {n:"Deposit Optimizer",slug:"deposit-optimizer",c:DepositOptimizer,subcat:"Promo"},
    {n:"Hedge Validator",slug:"hedge-validator",c:HedgeValidator,subcat:"Promo"},
    {n:"Promo Guarantee",slug:"promo-guarantee",c:PromoGuarantee,subcat:"Promo"},
    {n:"Gut Check",slug:"gut-check",c:GutCheck,subcat:"Promo"},
    {n:"Promo Stacking",slug:"promo-stacking",c:PromoStacking,subcat:"Promo"},
    {n:"Taxes Estimator",slug:"taxes-estimator",c:TaxesEstimatorWrapper,subcat:"Advanced",icon:"ðŸ§¾"},
  ]},
  { group:"Track", items:[
    {n:"Edge",slug:"edge-dashboard",c:TrackInsights},
    {n:"Sportsbooks",slug:"sportsbooks",c:Tracker},
    {n:"Bet Tracker",slug:"bet-tracker",c:BetTracker},
    {n:"P/L Ledger",slug:"ledger",c:Ledger},
    {n:"Leaderboard",slug:"leaderboard",c:Leaderboard},
    {n:"Free Bet Arb",slug:"free-bet-arb",c:FreeBetArbTracker},
    {n:"Trade Journal",slug:"trade-journal",c:PromoJournal},
    {n:"Odds Compare",slug:"odds-compare",c:OddsComparisonTable},
    {n:"Profit Cert",slug:"profit-cert",c:ProfitCertificate},
  ]},
  { group:"Live", items:[
    {n:"Arb Scanner",slug:"arb-scanner",c:LiveScanner,pro:true},
    {n:"+EV Scanner",slug:"ev-scanner",c:LiveScanner,pro:true},
    {n:"Action Plan",slug:"action-plan",c:AIActionPlan,pro:true},
    {n:"Stack Builder",slug:"stack-builder",c:StackBuilder,pro:true},
  ]},
  { group:"Learn", items:[
    {n:"Knowledge Base",slug:"knowledge-base",c:KB},
    {n:"Promo Finder",slug:"promo-finder",c:PromoFinder},
    {n:"Promo Calendar",slug:"promo-calendar",c:PromoCalendar},
    {n:"Promo Board",slug:"promo-board",c:PromoBoard},
    {n:"Glossary",slug:"glossary",c:Glossary},
    {n:"Refer & Earn",slug:"refer-earn",c:ReferralHub},
    {n:"Community Promos",slug:"community-promos",c:CommunityPromos},
    {n:"Upgrade",slug:"upgrade",c:PricingPage},
    {n:"Team Accounts",slug:"team-accounts",c:TeamAccounts},
    {n:"vs Competitors",slug:"vs-competitors",c:CompetitorComparison},
    {n:"Promo Arb Finder",slug:"promo-arb-finder",c:PromoArbFinder},
  ]},
];
TABS_REF = TABS;

const DEFAULT_SLUG = "dashboard";
const slugMap = {};
TABS.forEach((g,gi)=>g.items.forEach((item,ti)=>{slugMap[item.slug]={gi,ti};}));

const SessionModal = ({appData, visitedSlugsRef, onClose}) => {
  const [ssCopied,setSsCopied]=useState(false);
  const startTs=parseInt(sessionStorage.getItem('pg_session_start')||'0');
  const mins=startTs?Math.round((Date.now()-startTs)/60000):0;
  const startCount=parseInt(sessionStorage.getItem('pg_session_ledger_count')||'0');
  const currentCount=(appData.ledger||[]).length;
  const newEntries=Math.max(0,currentCount-startCount);
  const visited=[...visitedSlugsRef.current];
  const getTabName=(s)=>{const item=TABS.flatMap(g=>g.items).find(i=>i.slug===s);return item?item.n:s;};
  const sessionCard=`PromoGrind Session Summary\nActive: ${mins} min\nTools used: ${visited.length}\nNew ledger entries: ${newEntries}\nVisited: ${visited.map(getTabName).join(', ')}\n${CANONICAL_APP_URL}`;
  return (<div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,padding:24,maxWidth:420,width:"100%",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
      <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:4}}>Session Summary</div>
      <div style={{fontSize:11,color:K.mt,marginBottom:16}}>Here&apos;s what you did this session</div>
      <RR l="Active for" v={`${mins} minute${mins!==1?"s":""}`} c={K.ac}/>
      <RR l="Tools visited" v={`${visited.length}`} c={K.pp}/>
      <RR l="New ledger entries" v={`${newEntries}`} c={K.gn}/>
      {visited.length>0&&<div style={{marginTop:8,marginBottom:12}}>
        <div style={S.label}>Tools used</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{visited.map(s=><span key={s} style={S.tag(K.ac)}>{getTabName(s)}</span>)}</div>
      </div>}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={()=>{try{navigator.clipboard.writeText(sessionCard);}catch(e){} setSsCopied(true);setTimeout(()=>setSsCopied(false),2000);}} style={{flex:1,padding:"8px",background:ssCopied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>{ssCopied?"âœ“ Copied!":"Share Session"}</button>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font,fontSize:11}}>Close</button>
      </div>
    </div>
  </div>);
};

// â•â•â• EMAIL CAPTURE â•â•â•
const EmailCapture = () => {
  const [status, setStatus] = useState(null); // null | 'loading' | 'done' | 'error'
  const [subbed, setSubbed] = useState(false);
  const [freq, setFreq] = useState('weekly');
  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(user?.user_metadata?.newsletter) setSubbed(true);
    });
  },[]);
  const subscribe = async () => {
    setStatus('loading');
    try {
      await supabase.auth.updateUser({ data:{ newsletter:true, newsletter_freq:freq } });
      setSubbed(true); setStatus('done');
    } catch(e) { setStatus('error'); }
  };
  if(subbed) return (
    <div style={{...S.card,background:K.s2,textAlign:"center",padding:"16px 20px"}}>
      <span style={{fontSize:12,color:K.gn,fontWeight:600}}>âœ“ Subscribed to weekly promo tips</span>
    </div>
  );
  return (
    <div style={{...S.card,background:K.s2,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"16px 20px"}}>
      <div>
        <div style={{fontFamily:fontD,fontSize:14,fontWeight:700,color:K.tx,marginBottom:3}}>Get weekly promo tips</div>
        <div style={{fontSize:11,color:K.mt}}>Best boosts of the week, new book promos, strategy tips. No spam.</div>
      </div>
      <select style={{...S.input,width:"auto",padding:"6px 10px",fontSize:11}} value={freq} onChange={e=>setFreq(e.target.value)}>
        <option value="daily">Daily digest</option>
        <option value="3x">3Ã— per week</option>
        <option value="weekly">Weekly digest</option>
      </select>
      <button onClick={subscribe} disabled={status==='loading'} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:fontD,whiteSpace:"nowrap",opacity:status==='loading'?0.7:1}}>
        {status==='loading'?"Subscribingâ€¦":"Subscribe â€” it's free"}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:K.rd,width:"100%"}}>Something went wrong. Try again.</div>}
    </div>
  );
};

// â•â•â• FOOTER â•â•â•
const Footer = () => (
  <div style={{borderTop:`1px solid ${K.bd}`,padding:"28px 20px",marginTop:8}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Affiliate Disclosure:</span> Some links on this page are affiliate links. If you sign up at a sportsbook through these links, we may earn a commission at no extra cost to you. This does not influence our calculator results or editorial content.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Access:</span> PromoGrind uses free accounts for login and sync. The same account works across all VaultSpark Studio tools.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        Must be 21+ (18+ in some states). Sports betting available only where legal. Gambling winnings are taxable income. This is an educational math tool â€” not gambling advice. If you or someone you know has a gambling problem, call <span style={{color:K.rd,fontWeight:600}}>1-800-GAMBLER</span>.
      </p>
      <p style={{fontSize:10,color:K.bd2,marginTop:12,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <span>Â© {new Date().getFullYear()} Â· Powered by <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{color:"inherit",textDecoration:"none"}}>VaultSpark Studios</a> Â· PromoGrind is a free educational calculator tool.</span>
        <a href="/privacy/" style={{color:K.mt,textDecoration:"none"}}>Privacy</a>
        <a href="/terms/" style={{color:K.mt,textDecoration:"none"}}>Terms</a>
        <a href="/responsible-gambling/" style={{color:K.mt,textDecoration:"none"}}>Responsible Gambling</a>
        <a href="/affiliate-disclosure/" style={{color:K.mt,textDecoration:"none"}}>Affiliate Disclosure</a>
        <a href="/disclaimer/" style={{color:K.mt,textDecoration:"none"}}>Disclaimer</a>
        <a href="/dmca/" style={{color:K.mt,textDecoration:"none"}}>DMCA / IP</a>
        <a href="/data-policy/" style={{color:K.mt,textDecoration:"none"}}>Data Policy</a>
        <a href="/about/" style={{color:K.mt,textDecoration:"none"}}>About</a>
        <a href="/compliance/" style={{color:K.mt,textDecoration:"none"}}>Compliance</a>
      </p>
    </div>
  </div>
);

// PromoChat â†’ ./components/PromoChat.jsx
// â•â•â• MAIN APP â•â•â•
export default function App() {
  // Calculators are public â€” always load immediately. Auth resolves silently in background.
  const [authReady] = useState(true);
  const [ageVerified, setAgeVerified] = useState(() => isAgeVerified());
  const [user, setUser] = useState(null);
  const [proStatus, setProStatus] = useState(null);
  const [authModalMode, setAuthModalMode] = useState(() => getProjectAuthMode(window.location.search));
  const [showPromoAdvisor, setShowPromoAdvisor] = useState(false);
  const {
    darkMode,
    toggleTheme,
    compactMode,
    toggleCompact,
    appData,
    setAppData,
    syncAppData,
    syncStatus,
    syncDiagnostics,
    winW,
    isMobile,
    isTablet,
    currency,
    setCurrency,
    currencyCtxVal,
    isOnline,
    showCalcSearch,
    setShowCalcSearch,
    showOnboarding,
    dismissOnboarding,
  } = usePromoAppShell({ onboardingKey: ONBOARDING_KEY });
  const [calcSubcat, setCalcSubcat] = useState("All");
  useEffect(() => {
    try {
      if(!sessionStorage.getItem('pg_session_start')) {
        sessionStorage.setItem('pg_session_start', String(Date.now()));
      }
    } catch(e) {}
  }, []);
  useEffect(() => {
    try {
      if(!sessionStorage.getItem('pg_session_ledger_count')) {
        sessionStorage.setItem('pg_session_ledger_count', String((appData.ledger||[]).length));
      }
    } catch(e) {}
  }, [appData]);
  const prevSlugRef = useRef(null);
  const tabMemory = useRef({});
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const embedMode = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('embed') === '1' || p.has('embed');
    } catch { return false; }
  }, []);
  const isEmbed = embedMode;
  const visitedSlugsRef = useRef(new Set());
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Keyboard ? shortcut for calc search
  useEffect(()=>{
    const handler = e => {
      if(e.key==='?' && e.target.tagName!=='INPUT' && e.target.tagName!=='TEXTAREA' && e.target.tagName!=='SELECT') {
        e.preventDefault();
        setShowCalcSearch(s=>!s);
      }
      if((e.ctrlKey||e.metaKey) && e.key==='k') {
        e.preventDefault();
        setShowCalcSearch(s=>!s);
      }
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[]);

  // Capture ?ref= referral code from URL on first load
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref) localStorage.setItem('pg_ref', ref);
    } catch(e) {}
  }, []);

  // Feature 3: Milestone notifications
  useEffect(()=>{
    if(!appData.ledger) return;
    const totalProfit=appData.ledger.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const milestones=[100,250,500,1000,2500,5000];
    try {
      const reached=JSON.parse(localStorage.getItem('pg_milestones_reached')||'[]');
      let updated=false;
      for(const m of milestones){
        if(totalProfit>=m&&!reached.includes(m)){
          reached.push(m);
          updated=true;
          try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification(`PromoGrind: $${m} milestone reached! ðŸŽ‰`,{body:`You've extracted $${m}+ in total profit. Keep grinding!`,icon:'/promogrind/favicon.svg'});}catch(e){}
        }
      }
      if(updated) localStorage.setItem('pg_milestones_reached',JSON.stringify(reached));
    } catch(e){}
  },[appData.ledger]);

  // Feature 13: Profit goal notifications
  useEffect(()=>{
    if(!authReady||!appData.profitGoal) return;
    const goal=parseFloat(appData.profitGoal)||0;
    if(!goal) return;
    const totalProfit=(appData.ledger||[]).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    if(totalProfit>=goal){
      try{
        const key=`pg_goal_notified_${goal}`;
        if(!localStorage.getItem(key)){
          localStorage.setItem(key,'1');
          if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
            new Notification('PromoGrind: Profit Goal Reached! ðŸŽ¯',{body:`You hit your $${f(goal)} profit goal! Time to set a new one.`,icon:'/promogrind/favicon.svg'});
          }
        }
      }catch(e){}
    }
  },[appData.ledger,appData.profitGoal,authReady]);

  const [weeklyActive, setWeeklyActive] = useState(null);
  const [calcFavorites, setCalcFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('pg_calc_favorites'))||[]; } catch { return []; } });
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlug, setCompareSlug] = useState('');

  // Push notification check for promo alerts
  useEffect(() => {
    if (!authReady) return;
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const prefs = JSON.parse(localStorage.getItem('pg_alert_prefs')||'{}');
      Object.entries(prefs).forEach(([name, pref]) => {
        if (!pref.alert || !pref.targetDate || pref.notified) return;
        const target = new Date(pref.targetDate);
        const hoursUntil = (target - Date.now()) / 3600000;
        if (hoursUntil > 0 && hoursUntil <= 24) {
          new Notification(`PromoGrind: ${name} expires soon!`, {
            body: `This promo expires in ${Math.round(hoursUntil)} hours. Open the calculator now.`,
            icon: '/promogrind/favicon.svg',
          });
          pref.notified = true;
          localStorage.setItem('pg_alert_prefs', JSON.stringify(prefs));
        }
      });
    } catch(e) {}
  }, [authReady]);

  // Weekly active users count (social proof)
  useEffect(() => {
    if (!authReady) return;
    supabase.from('vault_events').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now()-7*24*60*60*1000).toISOString())
      .then(({ count }) => { if (typeof count === 'number') setWeeklyActive(count); })
      .catch(() => {});
  }, [authReady]);

  useEffect(() => {
    setAuthModalMode(getProjectAuthMode(search));
  }, [search]);

  // Auth + subscription load â€” app always shows; this just enriches the experience for
  // signed-in users (sync, points, pro features). Guests continue in calculator-only mode.
  useEffect(() => {
    let alive = true;

    const writePlanKey = (sub) => {
      try {
        const planKey = sub?.status === 'trial' ? 'trial'
          : sub?.plan === 'vault_sparked' ? 'vault_sparked'
          : sub?.plan === 'pro' ? 'pro'
          : 'free';
        localStorage.setItem('pg_pro_status', planKey);
      } catch {}
    };

    const syncAuthenticatedState = async (session, options = {}) => {
      if (!alive) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      if (options.trackLogin) {
        trackEvent('vault_member_login');
        trackEvent('promogrind_account_login');
      }

      onDailyLogin();
      window.VSSupabase = supabase;
      window.VaultSDK?.init('promogrind', {
        onReady: () => window.VaultSDK?.applyGates(),
      });

      const sub = await getSubscription();
      if (!alive) return;
      setProStatus(sub);
      identifyUser(currentUser, sub);
      writePlanKey(sub);

      try {
        const refCode = localStorage.getItem('pg_ref');
        if (refCode && refCode !== currentUser.id) {
          await supabase.from('referrals').insert({
            referrer_id: refCode,
            referred_user_id: currentUser.id,
          });
          localStorage.removeItem('pg_ref');
        }
      } catch (e) {}
    };

    tryAuth().then(async (ok) => {
      if (!ok) {
        setUser(null);
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      await syncAuthenticatedState(session, { trackLogin: true });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProStatus(null);
        writePlanKey(null);
        return;
      }

      await syncAuthenticatedState(session, {
        trackLogin: event === 'SIGNED_IN',
      });
    });

    return () => {
      alive = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const setAuthQueryMode = (mode) => {
    const params = new URLSearchParams(search);
    if (mode) params.set('auth', mode);
    else params.delete('auth');
    const nextSearch = params.toString();
    navigate(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  };

  const authHref = (mode) => getProjectAuthHref(mode, window.location.href);
  const closeAuthDialog = () => setAuthQueryMode(null);

  // Creator/referral landing pages — rendered outside the main nav shell
  if (pathname.startsWith("/land/")) {
    return (
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        <LandingRoute />
      </Suspense>
    );
  }

  // Feature flag admin — hidden route, house tier only
  if (pathname === "/feature-flags") {
    return (
      <ToastProvider>
      <AppDataCtx.Provider value={{ appData, syncAppData, user, syncDiagnostics, syncStatus, isOnline }}>
      <div style={{ fontFamily: font, fontSize: 13, color: K.tx, background: K.bg, minHeight: "100vh", padding: 16 }}>
        <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
          <FeatureFlagAdmin proStatus={proStatus} />
        </Suspense>
      </div>
      </AppDataCtx.Provider>
      </ToastProvider>
    );
  }

  const slug = pathname.replace(/^\/+/, "") || DEFAULT_SLUG;
  const { gi=0, ti=0 } = slugMap[slug] || slugMap[DEFAULT_SLUG];
  const g = TABS[gi];
  const item = g.items[ti];
  const Comp = item?.c || (() => null);
  const isLiveTool = !!item?.pro;

  // Re-apply VaultSDK DOM gates whenever the active tool or pro status changes
  useEffect(() => { window.VaultSDK?.applyGates(); }, [slug, proStatus]);

  // Fire vault calc event on tab navigation (Convert + Calculate groups)
  useEffect(() => {
    if (!authReady || slug === prevSlugRef.current) return;
    prevSlugRef.current = slug;
    visitedSlugsRef.current.add(slug);
    if (gi === 1 || gi === 2) onCalculation(slug);
    trackPage(slug);
    try {
      const log = JSON.parse(localStorage.getItem('pg_usage_log')||'{}');
      const wasEmpty = Object.keys(log).length === 0;
      log[slug] = (log[slug]||0)+1;
      localStorage.setItem('pg_usage_log', JSON.stringify(log));
      flagCalcUsed(slug);
      if(wasEmpty) trackEvent('first_calc_run');
    } catch(e) {}
    trackEvent('calculator_viewed', { slug, name: item?.n ?? slug });
  }, [slug, authReady, gi]);

  const goTo = (newGi, newTi) => {
    const resolvedTi = newTi !== undefined ? newTi : (tabMemory.current[newGi] ?? 0);
    tabMemory.current[newGi] = resolvedTi;
    navigate("/" + TABS[newGi].items[resolvedTi].slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const findAndOpen = (targetSlug) => {
      if (!targetSlug) return false;
      for (let groupIndex = 0; groupIndex < TABS.length; groupIndex += 1) {
        const itemIndex = TABS[groupIndex].items.findIndex((item) => item.slug === targetSlug);
        if (itemIndex >= 0) {
          goTo(groupIndex, itemIndex);
          return true;
        }
      }
      return false;
    };

    const handler = (event) => {
      const detail = event?.detail || {};
      if (findAndOpen(detail.calculatorSlug || detail.slug)) return;

      findAndOpen(getQuickCalcFallbackSlug(detail.type));
    };

    window.addEventListener("pg:quick-calc", handler);
    return () => window.removeEventListener("pg:quick-calc", handler);
  }, [navigate]);

  const handleGroupTabKeyDown = (event, index) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo((index + 1) % TABS.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo((index - 1 + TABS.length) % TABS.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(TABS.length - 1);
    }
  };

  const handleSubTabKeyDown = (event, groupIndex, itemIndex) => {
    const items = TABS[groupIndex].items;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(groupIndex, (itemIndex + 1) % items.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(groupIndex, (itemIndex - 1 + items.length) % items.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(groupIndex, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(groupIndex, items.length - 1);
    }
  };

  // Record current sub-tab in memory whenever it changes
  useEffect(()=>{ tabMemory.current[gi] = ti; },[gi,ti]);

  const allCalcs = TABS.flatMap(g=>g.items.map(item=>({...item,group:g.group})));
  const handleCalcNavigate = (slug) => navigate('/'+slug);
  const CALC_GI = TABS.findIndex(t=>t.group==="Calculate");
  const SUBCATS = ["All","Promo","Arbitrage","Value & EV","Advanced"];

  if (!authReady) {
    return (
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontFamily:fontD,fontSize:32,fontWeight:800,color:K.gn,marginBottom:4,letterSpacing:"-1px"}}>PROMOGRIND</div>
          <div style={{fontSize:12,color:K.mt,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12}}>Free Sportsbook Promo Conversion Tools</div>
          <div style={{fontSize:12,color:K.dm,lineHeight:1.7,maxWidth:430,margin:"0 auto 20px"}}>
            Sign in with your free PromoGrind account to access 29+ free calculators and keep your profits synced across devices. Takes 30 seconds â€” no credit card required.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24,textAlign:"left"}}>
            {[
              ["27 Free Calculators","Bonus bets, profit boosts, arb, Kelly, EV, parlay, and more"],
              ["Free PromoGrind Account","One free account, all 53 calculators â€” syncs across your devices."],
              ["Live Arb + EV Scanner","Real-time opportunities across 40+ books. VaultSparked Pro."],
            ].map(([title,desc])=>(
              <div key={title} style={{display:"flex",gap:10,padding:"10px 14px",background:K.s1,border:`1px solid ${K.bd}`,borderRadius:8}}>
                <span style={{color:K.gn,fontWeight:700,marginTop:1}}>âœ“</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:K.tx}}>{title}</div>
                  <div style={{fontSize:11,color:K.mt,marginTop:2}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
            <a href={authHref('signup')} style={{display:"block",textAlign:"center",padding:"13px 0",background:K.gn,borderRadius:8,color:"#0a0e17",fontSize:14,fontWeight:700,textDecoration:"none",letterSpacing:"-0.2px"}}>
              Create Free Account â†’
            </a>
            <a href={authHref('signin')} style={{display:"block",textAlign:"center",padding:"10px 0",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:8,color:K.dm,fontSize:12,fontWeight:600,textDecoration:"none"}}>
              Already have an account? Sign in â†’
            </a>
          </div>
          <div style={{fontSize:10,color:K.dm,letterSpacing:"1.5px",textTransform:"uppercase"}}>Connecting your accountâ€¦</div>
        </div>
      </div>
    );
  }

  if (embedMode) {
    return (
      <ToastProvider>
      <AppDataCtx.Provider value={{ appData, syncAppData, user, syncDiagnostics, syncStatus, isOnline }}>
      <CompactCtx.Provider value={compactMode}>
      <CurrencyCtx.Provider value={currencyCtxVal}>
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",padding:16}}>
        <ErrorBoundary>
          <Suspense fallback={<div style={{padding:32,textAlign:"center"}}><LoadingState/></div>}>
            {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
          </Suspense>
        </ErrorBoundary>
        {isEmbed && (
          <div style={{position:'fixed',bottom:8,right:12,fontSize:11,color:'#475569',opacity:0.7,zIndex:9999}}>
            Powered by <a href={CANONICAL_APP_URL} target="_blank" rel="noopener" style={{color:'#4ade80',textDecoration:'none'}}>PromoGrind</a>
          </div>
        )}
      </div>
      </CurrencyCtx.Provider>
      </CompactCtx.Provider>
      </AppDataCtx.Provider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
    <AppDataCtx.Provider value={{ appData, syncAppData, user, syncDiagnostics, syncStatus, isOnline }}>
    <CompactCtx.Provider value={compactMode}>
    <CurrencyCtx.Provider value={currencyCtxVal}>
    <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh"}}>
      <CheckoutListener/>
      <AuthDialog
        open={!!authModalMode}
        mode={authModalMode || 'signup'}
        onClose={closeAuthDialog}
        onModeChange={setAuthQueryMode}
      />
      {!ageVerified && <AgeGate onVerified={() => setAgeVerified(true)} />}
      <TrustStrip/>
      {!isOnline && (
        <div style={{background:`${K.rd}15`,borderBottom:`1px solid ${K.rd}40`,padding:"6px 20px",textAlign:"center",fontSize:11,color:K.rd,fontWeight:600,letterSpacing:"0.5px"}}>
          OFFLINE MODE â€” Changes will sync when connection is restored
        </div>
      )}
      {showSessionModal&&<SessionModal appData={appData} visitedSlugsRef={visitedSlugsRef} onClose={()=>setShowSessionModal(false)}/>}
      {showOnboarding && <OnboardingWizard onDone={dismissOnboarding}/>}
      {showCalcSearch && <CalcSearch allCalcs={allCalcs} onNavigate={handleCalcNavigate} onClose={()=>setShowCalcSearch(false)}/>}
      {/* â”€â”€ Site Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header style={{
        background:`linear-gradient(135deg,${K.s1},${K.s2})`,
        borderBottom:`1px solid ${K.bd}`,
        padding: isMobile ? '10px 14px 8px' : isTablet ? '12px 18px 10px' : '14px 28px 12px',
        position:'sticky', top:0, zIndex:200,
        backdropFilter:'blur(12px)',
        WebkitBackdropFilter:'blur(12px)',
      }}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>

          {/* â”€â”€ Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{cursor:'pointer',flexShrink:0,minWidth:0}} onClick={()=>navigate('/'+DEFAULT_SLUG)}>
            <div style={{fontFamily:fontD,fontSize:isMobile?17:21,fontWeight:700,color:K.gn,letterSpacing:'-0.5px',lineHeight:1}}>
              PROMOGRIND
            </div>
            {!isMobile && (
              <div style={{fontSize:9,color:K.mt,letterSpacing:'2px',textTransform:'uppercase',marginTop:3}}>
                Free Sportsbook Promo Conversion Tools
              </div>
            )}
            {!isMobile && (
              <div style={{display:'flex',gap:14,marginTop:6,alignItems:'baseline',flexWrap:'wrap'}}>
                {[
                  [String(TABS.filter(g=>g.group==='Convert'||g.group==='Calculate').reduce((n,g)=>n+g.items.length,0)),'Calculators'],
                  ['Free','Forever'],
                  ['vs $99-199/mo','Competitors charge'],
                  ...(weeklyActive>0?[[String(weeklyActive),'grinders this week']]:[]),
                ].map(([val,label])=>(
                  <div key={label} style={{display:'flex',alignItems:'baseline',gap:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:K.gn,fontFamily:fontD}}>{val}</span>
                    <span style={{fontSize:9,color:K.mt,textTransform:'uppercase',letterSpacing:'1px'}}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* â”€â”€ Right controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{display:'flex',alignItems:'center',gap:isMobile?6:10,flexShrink:0}}>

            {/* Streak â€” hide on mobile (shown in mobile strip below) */}
            {!isMobile && <DailyStreak/>}

            {/* Advisor */}
            {FEATURE_FLAGS.promoAdvisor && !isMobile && (
              <button
                onClick={()=>setShowPromoAdvisor(v=>!v)}
                title="Promo Advisor â€” analyze any sportsbook promo instantly"
                style={{
                  padding:'6px 12px', background:showPromoAdvisor?`${K.pp}20`:'transparent',
                  border:`1px solid ${showPromoAdvisor?K.pp:K.bd2}`, borderRadius:8,
                  color:showPromoAdvisor?K.pp:K.dm, fontSize:11, cursor:'pointer',
                  fontFamily:font, minHeight:36,
                }}
              >
                ðŸ’¡ Advisor
              </button>
            )}

            {/* Theme toggle â€” always visible as icon */}
            <button
              onClick={toggleTheme}
              title={darkMode?'Switch to light mode':'Switch to dark mode'}
              style={{
                width:36, height:36, borderRadius:8, cursor:'pointer',
                background:darkMode?'transparent':`${K.yl}15`,
                border:`1px solid ${darkMode?K.bd2:K.yl+'60'}`,
                color:darkMode?K.dm:K.yl, fontSize:15,
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'all 0.2s',
              }}
            >
              {darkMode?'â˜€':'ðŸŒ™'}
            </button>

            {/* UserMenu â€” auth widget */}
            <UserMenu
              user={user}
              proStatus={proStatus}
              darkMode={darkMode}
              toggleTheme={toggleTheme}
              compactMode={compactMode}
              toggleCompact={toggleCompact}
              currency={currency}
              setCurrency={setCurrency}
              syncStatus={syncStatus}
              onSessionClick={()=>setShowSessionModal(true)}
            />
          </div>
        </div>

        {/* â”€â”€ Mobile utility strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {isMobile && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginTop:8, paddingTop:8, borderTop:`1px solid ${K.bd}40`,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <DailyStreak/>
              {FEATURE_FLAGS.promoAdvisor && (
                <button
                  onClick={()=>setShowPromoAdvisor(v=>!v)}
                  style={{
                    padding:'4px 10px', fontFamily:font, cursor:'pointer', fontSize:10,
                    background:showPromoAdvisor?`${K.pp}20`:'transparent',
                    border:`1px solid ${showPromoAdvisor?K.pp:K.bd2}`,
                    borderRadius:6, color:showPromoAdvisor?K.pp:K.dm,
                  }}
                >
                  ðŸ’¡ Advisor
                </button>
              )}
            </div>
            <div style={{fontSize:11,color:K.dm,textAlign:'right',lineHeight:1.5}}>
              Free tool Â· Not gambling advice Â· 21+ Â· 1-800-GAMBLER
            </div>
          </div>
        )}

        {/* â”€â”€ Desktop compliance line â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isMobile && (
          <div style={{maxWidth:1100,margin:'4px auto 0',textAlign:'right'}}>
            <span style={{fontSize:11,color:K.dm}}>
              Free educational tool Â· Not gambling advice Â· 21+ only Â· Gamble responsibly Â· 1-800-GAMBLER
            </span>
          </div>
        )}
      </header>

      {/* â”€â”€ Main nav tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        background:K.s1, borderBottom:`1px solid ${K.bd}`,
        display:'flex', justifyContent:'center',
        overflowX:'auto', scrollbarWidth:'none',
        WebkitOverflowScrolling:'touch',
        position:'sticky', top: isMobile ? 94 : 106, zIndex:190,
      }}>
        <style>{`
          .pg-tabs::-webkit-scrollbar { display: none; }
          .pg-tab-btn { -webkit-tap-highlight-color: transparent; }
          .pg-tab-btn:active { opacity: 0.7; }
        `}</style>
        <div className="pg-tabs" role="tablist" aria-label="Primary navigation" style={{display:'flex',maxWidth:1100,width:'100%'}}>
          {TABS.map((t,i)=>(
            <button
              key={t.group}
              className="pg-tab-btn"
              onClick={()=>goTo(i,0)}
              onKeyDown={(event)=>handleGroupTabKeyDown(event, i)}
              role="tab"
              aria-selected={gi===i}
              aria-controls={`pg-subtabs-${t.group.toLowerCase().replace(/\s+/g,"-")}`}
              tabIndex={gi===i ? 0 : -1}
              style={{
                flex:1, minWidth:isMobile?72:90,
                padding: isMobile ? '12px 10px' : '12px 20px',
                fontSize: isMobile ? 12 : 13,
                fontWeight:gi===i?700:400,
                color:gi===i?K.gn:K.mt,
                background:gi===i?`${K.gn}08`:'transparent',
                border:'none',
                borderBottom:gi===i?`2px solid ${K.gn}`:'2px solid transparent',
                cursor:'pointer', fontFamily:font,
                textTransform:'uppercase', letterSpacing:'1px',
                whiteSpace:'nowrap',
                minHeight:44,
                transition:'color 0.15s, background 0.15s',
              }}
            >
              {t.group}
            </button>
          ))}
        </div>
      </div>
      <div style={{position:"relative"}}>
        <div style={{background:K.s2,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto",flexDirection:"column"}}>
          {gi===CALC_GI&&calcFavorites.length>0&&<div style={{maxWidth:1100,width:"100%",margin:"0 auto",display:"flex",gap:4,padding:"4px 8px 0",alignItems:"center"}}>
            <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",whiteSpace:"nowrap",marginRight:2}}>Pinned:</span>
            {calcFavorites.map(favSlug=>{
              const favItem = g.items.find(it=>it.slug===favSlug) || TABS.flatMap(gr=>gr.items).find(it=>it.slug===favSlug);
              if(!favItem) return null;
              const favGiTi = slugMap[favSlug];
              return (
                <button key={favSlug} onClick={()=>{ if(favGiTi) navigate('/'+favSlug); }}
                  style={{padding:"2px 10px",background:slug===favSlug?`${K.yl}20`:"transparent",border:`1px solid ${slug===favSlug?K.yl:K.bd2}`,borderRadius:50,color:slug===favSlug?K.yl:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                  â˜… {favItem.n}
                  <span onClick={e=>{e.stopPropagation();const next=calcFavorites.filter(s=>s!==favSlug);setCalcFavorites(next);try{localStorage.setItem('pg_calc_favorites',JSON.stringify(next));}catch{};}} style={{color:K.mt,fontSize:8,cursor:"pointer",marginLeft:2}}>âœ•</span>
                </button>
              );
            })}
          </div>}
          {gi===CALC_GI&&<div style={{maxWidth:1100,width:"100%",margin:"0 auto",display:"flex",gap:4,padding:"6px 8px 0",alignItems:"center"}}>
            {SUBCATS.map(sc=>(
              <button key={sc} onClick={()=>{
                setCalcSubcat(sc);
                if(sc!=="All") {
                  const firstMatch = g.items.findIndex(it=>it.subcat===sc);
                  if(firstMatch>=0) goTo(gi,firstMatch);
                }
              }} style={{padding:"3px 10px",background:calcSubcat===sc?K.pp:"transparent",border:`1px solid ${calcSubcat===sc?K.pp:K.bd2}`,borderRadius:50,color:calcSubcat===sc?K.bg:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",letterSpacing:"0.5px"}}>
                {sc}
              </button>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>{setCompareMode(m=>!m);if(!compareMode)setCompareSlug('');}} style={{padding:"3px 10px",background:compareMode?`${K.ac}20`:"transparent",border:`1px solid ${compareMode?K.ac:K.bd2}`,borderRadius:50,color:compareMode?K.ac:K.mt,fontSize:9,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",letterSpacing:"0.5px"}}>
              {compareMode?"âœ• Exit Compare":"âŠž Compare"}
            </button>
          </div>}
          <div
            id={`pg-subtabs-${g.group.toLowerCase().replace(/\s+/g,"-")}`}
            role="tablist"
            aria-label={`${g.group} navigation`}
            style={{display:"flex",maxWidth:1100,width:"100%",gap:2,margin:"0 auto"}}
          >{g.items.map((t,i)=>{
            const highlighted = gi===CALC_GI&&calcSubcat!=="All"&&t.subcat===calcSubcat;
            const isFav = calcFavorites.includes(t.slug);
            return (<button key={t.n} onClick={()=>goTo(gi,i)} onKeyDown={(event)=>handleSubTabKeyDown(event, gi, i)} role="tab" aria-selected={ti===i} tabIndex={ti===i ? 0 : -1} style={{padding:"9px 14px",fontSize:13,fontWeight:ti===i?600:400,color:ti===i?K.ac:highlighted?K.pp:K.dm,background:"transparent",border:"none",borderBottom:ti===i?`2px solid ${K.ac}`:highlighted?"2px solid "+K.pp+"50":"2px solid transparent",cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",position:"relative",display:"flex",alignItems:"center",gap:4}}>
              {t.n}
              {gi===CALC_GI&&<span onClick={e=>{e.stopPropagation();const next=isFav?calcFavorites.filter(s=>s!==t.slug):[...calcFavorites,t.slug];setCalcFavorites(next);try{localStorage.setItem('pg_calc_favorites',JSON.stringify(next));}catch{};}} title={isFav?"Unpin":"Pin to favorites"} style={{fontSize:9,color:isFav?K.yl:K.bd2,cursor:"pointer",lineHeight:1,opacity:isFav?1:0.4,transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity=isFav?'1':'0.4'}>â˜…</span>}
              {highlighted&&<span style={{position:"absolute",bottom:4,right:4,width:4,height:4,borderRadius:"50%",background:K.pp}}/>}
            </button>);
          })}</div>
        </div>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:64,background:`linear-gradient(to left,${K.s2} 40%,transparent)`,pointerEvents:"none",zIndex:1}}/>
      </div>
      <div className="pg-main-content" style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>
        {!user && <MembershipBanner/>}
        <ErrorBoundary>
          <Suspense fallback={<div style={{padding:32,textAlign:"center"}}><LoadingState/></div>}>
            {slug==='dashboard'
              ? <DailyDashboard navigate={navigate} proStatus={proStatus}/>
              : compareMode&&gi===CALC_GI
                ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div>
                      <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,fontFamily:font}}>Primary â€” {item?.n}</div>
                      {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",fontFamily:font}}>Compare â€”</span>
                        <select value={compareSlug} onChange={e=>setCompareSlug(e.target.value)} style={{...S.input,width:"auto",padding:"3px 8px",fontSize:10}}>
                          <option value="">Pick a calculatorâ€¦</option>
                          {g.items.filter(it=>it.slug!==slug).map(it=><option key={it.slug} value={it.slug}>{it.n}</option>)}
                        </select>
                      </div>
                      {compareSlug
                        ? (() => { const cItem=g.items.find(it=>it.slug===compareSlug); const CC=cItem?.c; return CC?<Suspense fallback={null}><CC/></Suspense>:<div style={{color:K.mt,fontSize:11}}>Not found.</div>; })()
                        : <div style={{...S.card,color:K.mt,fontSize:11,textAlign:"center",padding:"32px 16px"}}>Select a calculator above to compare side by side.</div>}
                    </div>
                  </div>
                : isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
          </Suspense>
        </ErrorBoundary>
      </div>
      <EmailCapture/>
      <Footer/>
      <div style={{height:56}}/>
      <MobileBottomNav gi={gi} goTo={goTo}/>
      <Suspense fallback={null}>
        {showPromoAdvisor && <PromoAdvisorPanel user={user} proStatus={proStatus} onClose={() => setShowPromoAdvisor(false)} />}
        <PromoChat navigate={navigate}/>
      </Suspense>
      <QuickCalcPanel goTo={goTo}/>
    </div>
    </CurrencyCtx.Provider>
    </CompactCtx.Provider>
    </AppDataCtx.Provider>
    </ToastProvider>
  );
}
