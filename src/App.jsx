import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BOOKS, US_BOOK_STATES } from "./books.js";
import { tryAuth, getSubscription, startCheckout, startTrial, supabase } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, onDailyLogin, readSyncDiagnostics, triggerQueueFlush } from "./sync.js";
import { flagCalcUsed } from "./lib/missions.js";
import { subscribeToPush } from "./sw-register.js";
import { toD, toA, toP, toF, f, calcROI, downloadFile, bestOdds, calcBonus, calcFirst, calcBoost, calcArb2, calcArb3, calcNV, calcNV3, calcEV, calcPH, calcMid, calcRO, calcDeposit, calcKelly, calcInsurance, calcTeaser, calcRR, calcParlay, calcSGP, calcHold, sensitivityBonus, sensitivityBoost, sensitivityFirst, KD, KL, K, font, fontD } from "./lib/shared.js";
import { computeStreak } from "./lib/streaks.js";
import SensitivityChip from "./components/SensitivityChip.jsx";
import { usePromoAppShell } from "./app/usePromoAppShell.js";
import { AppFooter, MembershipBanner, TrustStrip } from "./app/AppChrome.jsx";
import { CalcSearch, MobileBottomNav, QuickCalcPanel } from "./app/AppNavigation.jsx";
import { DailyBriefingBtn, DailyRoutinePanel, OpenExposurePanel, ProfitGoalTracker, TopToolsPanel } from "./app/DashboardWidgets.jsx";
import { CSVImportModal } from "./app/CSVImportModal.jsx";
import { CheckoutListener } from "./app/AppNotifications.jsx";
import { AppCalculatorRouter } from "./app/AppCalculatorRouter.jsx";
import { AppProviders, FeatureFlagProviders } from "./app/AppProviders.jsx";
import { buildAppTabs, buildSlugMap, DEFAULT_SLUG, getAllCalcs, getCalcGroupIndex, SUBCATS } from "./app/appRoutes.js";
import { APP_CHROME_COPY, BET_TRACKER_UI, GUT_CHECK_UI, PUSH_UI } from "./app/appText.js";
import { parseBetSlip } from "./app/parseBetSlip.js";
import { GiftTrialBox, StarterPackModal, OnboardingChecklist, MemberWelcomeCard } from "./app/AppSubcomponents.jsx";
import { useProfitNotifications } from "./app/useProfitNotifications.js";
import { CANONICAL_APP_URL, FEATURE_FLAGS, getProjectAuthHref, getProjectAuthMode } from "./launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick, trackFeatureGateSeen, trackLaunchEvent } from "./launchTelemetry.js";
import { trackEvent, trackPage, identifyUser } from "./analytics.js";
import { ToastCtx, useToast, AppDataCtx, FX, CurrencyCtx } from "./contexts.jsx";
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
const ParlayHedge = lazy(() => import("./calculators/ParlayHedge.jsx"));
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
import Glossary from "./components/Glossary.jsx";
import KnowledgeBase from "./components/KnowledgeBase.jsx";
import ProfitCertificateRoute from "./components/ProfitCertificate.jsx";
import LeaderboardRoute from "./components/Leaderboard.jsx";
import DailyStreak from "./components/DailyStreak.jsx";
import ShareCard from "./components/ShareCard.jsx";
import { MiddleBet, OddsConvert, RolloverCalc, IncomeEstimator } from "./calculators/UtilityCalculators.jsx";
import BetTracker from "./components/BetTracker.jsx";
import PromoFinder from "./components/PromoFinder.jsx";
import { FreeBetArbTracker, PromoJournal, OddsComparisonTable } from "./components/TrackingTools.jsx";
import { getQuickCalcFallbackSlug } from "./workflows/actionGraph.js";
import { StateLegalAlert, US_STATES } from "./lib/stateLegal.jsx";

function getInitialAuthMode() {
  if (hasRecoveryHash()) return "update-password";
  return getProjectAuthMode(window.location.search);
}

function hasRecoveryHash() {
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return params.get("type") === "recovery";
  } catch {}
  return false;
}

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
// FeatureUnavailableCard â†’ ./ui.jsx

// CommunityWinsWall, SmartPromoRecommender extracted to src/components/dashboard/

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOOL COMPONENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// BonusBet, ProfitBoost, FirstBet extracted to src/calculators/ (lazy-loaded above)
// BookCTA, ShareCard extracted to src/components/ (imported above)

// TeaserCalc, RoundRobinCalc, ParlayBuilder, SGPEstimator, HoldCalc, BetSizingAdvisor, LineShop extracted to src/calculators/

// BetTracker -> ./components/BetTracker.jsx
// Tracker â†’ ./components/Tracker.jsx
// Ledger (+ ShareWeekBtn, ReportCard, BetHeatmap) â†’ ./components/Ledger.jsx
const KB = KnowledgeBase;

const ProfitCertificate = ProfitCertificateRoute;

// TAB SYSTEM â•â•â•
// LiveScanner (+ SPORTS_LIST, PROP_MARKETS, detectArbs, detectEV) â†’ ./components/LiveScanner.jsx
const Leaderboard = LeaderboardRoute;

// COMMUNITY PROMO BOARD â€” extracted to src/components/CommunityPromoBoard.jsx â•â•â•
const PromoBoard = CommunityPromoBoard;

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
// MiddleBet, OddsConvert, RolloverCalc, IncomeEstimator -> ./calculators/UtilityCalculators.jsx

// PromoFinder -> ./components/PromoFinder.jsx

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
    <div style={{fontSize:10,color:K.gn,fontWeight:600,padding:"4px 10px",background:`${K.gn}10`,border:`1px solid ${K.gn}30`,borderRadius:6}}>{PUSH_UI.onLabel}</div>
  );
  if(state === 'denied') return (
    <div style={{fontSize:10,color:K.rd,padding:"4px 10px",background:`${K.rd}10`,border:`1px solid ${K.rd}30`,borderRadius:6}} title="Push blocked in browser settings">{PUSH_UI.blockedLabel}</div>
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



// â•â•â• DAILY DASHBOARD â•â•â•
const DailyDashboard = ({ navigate: navigateProp, proStatus }) => {
  const navigateHook = useNavigate();
  const navigate = navigateProp || navigateHook;
  const { appData: data, syncAppData, syncDiagnostics = {}, syncStatus = "idle", isOnline = true } = React.useContext(AppDataCtx);
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
      <TopToolsPanel navigate={navigate} tabs={TABS}/>
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
          {oppositeSides ? GUT_CHECK_UI.valid : bothPlus ? GUT_CHECK_UI.maybe : GUT_CHECK_UI.manual}
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
// FreeBetArbTracker, PromoJournal, OddsComparisonTable -> ./components/TrackingTools.jsx

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
// parseBetSlip extracted to ./app/parseBetSlip.js

const EmailCapture = () => null;

// PromoChat â†’ ./components/PromoChat.jsx
// â•â•â• MAIN APP â•â•â•
const TABS = buildAppTabs({
  DailyDashboard, PromoIntakeRoute, DailyBriefPage, GetStartedRoute, WhatsNewRoute, PricingPage, AboutRoute,
  BonusBet, ProfitBoost, FirstBet, DepositMatch, InsurancePromo,
  NoVig, NoVig3Way, PlusEV, KellyCriterion, Arb2Way, Arb3Way, ParlayHedge, MiddleBet, OddsConvert,
  LineShop, RolloverCalc, TeaserCalc, RoundRobinCalc, ParlayBuilder, SGPEstimator, HoldCalc, BetSizingAdvisor,
  IncomeEstimator, DepositOptimizer, HedgeValidator, PromoGuarantee, GutCheck, PromoStacking, TaxesEstimatorWrapper,
  TrackInsights, Tracker, BetTracker, Ledger, Leaderboard, FreeBetArbTracker, PromoJournal, OddsComparisonTable,
  ProfitCertificate, LiveScanner, AIActionPlan, StackBuilder, KB, PromoFinder, PromoCalendar, PromoBoard,
  Glossary, ReferralHub, TeamAccounts, CompetitorComparison, PromoArbFinder,
});

const slugMap = buildSlugMap(TABS);


export default function App() {
  // Calculators are public â€” always load immediately. Auth resolves silently in background.
  const [authReady] = useState(true);
  const [ageVerified, setAgeVerified] = useState(() => isAgeVerified());
  const [user, setUser] = useState(null);
  const [proStatus, setProStatus] = useState(null);
  const [authModalMode, setAuthModalMode] = useState(() => getInitialAuthMode());
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
    viewport,
    isMobile,
    isTablet,
    isDesktop,
    currency,
    setCurrency,
    currencyCtxVal,
    isOnline,
    showCalcSearch,
    setShowCalcSearch,
    showOnboarding,
    dismissOnboarding,
  } = usePromoAppShell({ onboardingKey: ONBOARDING_KEY });
  const shellMaxWidth = viewport.contentMaxWidth;
  const shellPadding = viewport.shellPadding;
  const contentPadding = viewport.contentPadding;
  const stickyTop = isMobile ? 74 : isTablet ? 92 : 104;
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

  useProfitNotifications({ appData, authReady });

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
    const queryMode = getProjectAuthMode(search);
    setAuthModalMode((current) => current === "update-password" && hasRecoveryHash() ? current : queryMode);
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

  // ── Route-derived values and route-scoped effects MUST run on every render path
  // to keep React hook order stable. Don't move them below the early returns below
  // (doing so caused React error #310 on cold deep-link loads — S83).
  const slug = pathname.replace(/^\/+/, "") || DEFAULT_SLUG;
  const { gi = 0, ti = 0 } = slugMap[slug] || slugMap[DEFAULT_SLUG];
  const item = TABS[gi]?.items?.[ti];

  const goTo = (newGi, newTi) => {
    const resolvedTi = newTi !== undefined ? newTi : (tabMemory.current[newGi] ?? 0);
    tabMemory.current[newGi] = resolvedTi;
    navigate("/" + TABS[newGi].items[resolvedTi].slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Record current sub-tab in memory whenever it changes
  useEffect(() => { tabMemory.current[gi] = ti; }, [gi, ti]);

  // Creator/referral landing pages — rendered outside the main nav shell
  if (pathname.startsWith("/land/")) {
    return (
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        <LandingRoute />
      </Suspense>
    );
  }

  // Public root should be a landing page, not an immediate drop into the app shell.
  if (pathname === "/") {
    return (
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        <LandingRoute />
      </Suspense>
    );
  }

  // Feature flag admin — hidden route, house tier only
  if (pathname === "/feature-flags") {
    return (
      <FeatureFlagProviders appData={appData} syncAppData={syncAppData} user={user} syncDiagnostics={syncDiagnostics} syncStatus={syncStatus} isOnline={isOnline}>
      <div style={{ fontFamily: font, fontSize: 13, color: K.tx, background: K.bg, minHeight: "100vh", padding: 16 }}>
        <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
          <FeatureFlagAdmin proStatus={proStatus} />
        </Suspense>
      </div>
      </FeatureFlagProviders>
    );
  }

  const g = TABS[gi];
  const isLiveTool = !!item?.pro;

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

  const allCalcs = getAllCalcs(TABS);
  const handleCalcNavigate = (slug) => navigate('/'+slug);
  const CALC_GI = getCalcGroupIndex(TABS);

  if (!authReady) {
    return (
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontFamily:fontD,fontSize:32,fontWeight:800,color:K.gn,marginBottom:4,letterSpacing:"-1px"}}>PROMOGRIND</div>
          <div style={{fontSize:12,color:K.mt,letterSpacing:"2px",textTransform:"uppercase",marginBottom:12}}>Free Sportsbook Promo Conversion Tools</div>
          <div style={{fontSize:12,color:K.dm,lineHeight:1.7,maxWidth:430,margin:"0 auto 20px"}}>
            Sign in with your free PromoGrind account to keep your profits synced across devices. Takes 30 seconds and no credit card is required.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24,textAlign:"left"}}>
            {[
              ["27 Free Calculators","Bonus bets, profit boosts, arb, Kelly, EV, parlay, and more"],
              ["Free PromoGrind Account","One free account for calculator sync, tracker history, and ledger backups."],
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
      <AppProviders appData={appData} syncAppData={syncAppData} user={user} syncDiagnostics={syncDiagnostics} syncStatus={syncStatus} isOnline={isOnline} compactMode={compactMode} currencyCtxVal={currencyCtxVal}>
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",padding:16}}>
        <AppCalculatorRouter slug={slug} item={item} isLiveTool={isLiveTool} proStatus={proStatus} compareMode={false} calcGroupIndex={CALC_GI} groupIndex={gi} group={g} isDesktop={isDesktop} compareSlug={compareSlug} setCompareSlug={setCompareSlug} DailyDashboard={DailyDashboard} navigate={navigate} />
        {isEmbed && (
          <div style={{position:'fixed',bottom:8,right:12,fontSize:11,color:'#475569',opacity:0.7,zIndex:9999}}>
            Powered by <a href={CANONICAL_APP_URL} target="_blank" rel="noopener" style={{color:'#4ade80',textDecoration:'none'}}>PromoGrind</a>
          </div>
        )}
      </div>
      </AppProviders>
    );
  }

  return (
    <AppProviders appData={appData} syncAppData={syncAppData} user={user} syncDiagnostics={syncDiagnostics} syncStatus={syncStatus} isOnline={isOnline} compactMode={compactMode} currencyCtxVal={currencyCtxVal}>
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
        background:`linear-gradient(180deg,${K.s1},${K.s2})`,
        borderBottom:`1px solid ${K.bd}`,
        padding: isMobile ? `10px ${shellPadding}px 10px` : isTablet ? `12px ${shellPadding}px 12px` : `14px ${shellPadding}px 12px`,
        position:'sticky', top:0, zIndex:200,
        backdropFilter:'blur(12px)',
        WebkitBackdropFilter:'blur(12px)',
        boxShadow:'0 10px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{maxWidth:shellMaxWidth,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>

          {/* â”€â”€ Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div style={{cursor:'pointer',flexShrink:0,minWidth:0}} onClick={()=>navigate('/'+DEFAULT_SLUG)}>
            <div style={{fontFamily:fontD,fontSize:isMobile?18:21,fontWeight:800,color:K.gn,letterSpacing:'-0.5px',lineHeight:1}}>
              PROMOGRIND
            </div>
            {!isMobile && (
              <div style={{fontSize:9,color:K.mt,letterSpacing:'1.6px',textTransform:'uppercase',marginTop:4}}>
                Free Sportsbook Promo Conversion Tools
              </div>
            )}
            {isDesktop && (
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
                title="Promo Advisor - analyze any sportsbook promo instantly"
                style={{
                  padding:'6px 12px', background:showPromoAdvisor?`${K.pp}20`:'transparent',
                  border:`1px solid ${showPromoAdvisor?K.pp:K.bd2}`, borderRadius:8,
                  color:showPromoAdvisor?K.pp:K.dm, fontSize:11, cursor:'pointer',
                  fontFamily:font, minHeight:36,
                }}
              >
                Advisor
              </button>
            )}

            {!isMobile && (
              <button
                onClick={()=>setShowCalcSearch(true)}
                title="Search calculators"
                style={{
                  padding:'6px 12px',
                  background:'transparent',
                  border:`1px solid ${K.bd2}`,
                  borderRadius:8,
                  color:K.dm,
                  fontSize:11,
                  cursor:'pointer',
                  fontFamily:font,
                  minHeight:36,
                }}
              >
                Search
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
              {darkMode ? "☀" : "☾"}
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
            marginTop:8, paddingTop:8, borderTop:`1px solid ${K.bd}40`, gap: 10,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8, flexWrap:'wrap'}}>
              <DailyStreak/>
              <button
                onClick={()=>setShowCalcSearch(true)}
                style={{
                  padding:'5px 10px',
                  fontFamily:font,
                  cursor:'pointer',
                  fontSize:10,
                  background:'transparent',
                  border:`1px solid ${K.bd2}`,
                  borderRadius:999,
                  color:K.dm,
                }}
              >
                Search
              </button>
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
                  Advisor
                </button>
              )}
            </div>
            <div style={{fontSize:10,color:K.dm,textAlign:'right',lineHeight:1.5, maxWidth: 140}}>
              {APP_CHROME_COPY.mobileCompliance}
            </div>
          </div>
        )}

        {/* â”€â”€ Desktop compliance line â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!isMobile && (
          <div style={{maxWidth:shellMaxWidth,margin:'4px auto 0',textAlign:'right'}}>
            <span style={{fontSize:11,color:K.dm}}>
              {APP_CHROME_COPY.desktopCompliance}
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
        position:'sticky', top: stickyTop, zIndex:190,
      }}>
        <style>{`
          .pg-tabs::-webkit-scrollbar { display: none; }
          .pg-tab-btn { -webkit-tap-highlight-color: transparent; }
          .pg-tab-btn:active { opacity: 0.7; }
        `}</style>
        <div className="pg-tabs pg-scroll-x" role="tablist" aria-label="Primary navigation" style={{display:'flex',maxWidth:shellMaxWidth,width:'100%'}}>
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
                flex:isDesktop?1:'0 0 auto', minWidth:isMobile?76:isTablet?96:110,
                padding: isMobile ? '12px 12px' : '12px 20px',
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
          {gi===CALC_GI&&calcFavorites.length>0&&<div className="pg-scroll-x" style={{maxWidth:shellMaxWidth,width:"100%",margin:"0 auto",display:"flex",gap:4,padding:"6px 8px 0",alignItems:"center",overflowX:"auto"}}>
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
          {gi===CALC_GI&&<div className="pg-scroll-x" style={{maxWidth:shellMaxWidth,width:"100%",margin:"0 auto",display:"flex",gap:4,padding:"8px 8px 0",alignItems:"center",overflowX:"auto"}}>
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
            className="pg-scroll-x"
            style={{display:"flex",maxWidth:shellMaxWidth,width:"100%",gap:2,margin:"0 auto",overflowX:"auto"}}
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
        {!isDesktop && <div style={{position:"absolute",right:0,top:0,bottom:0,width:42,background:`linear-gradient(to left,${K.s2} 40%,transparent)`,pointerEvents:"none",zIndex:1}}/>}
      </div>
      <div className="pg-main-content" style={{maxWidth:shellMaxWidth,margin:"0 auto",padding:`${contentPadding}px`}}>
        {!user && <MembershipBanner/>}
        <AppCalculatorRouter
          slug={slug}
          item={item}
          isLiveTool={isLiveTool}
          proStatus={proStatus}
          compareMode={compareMode}
          calcGroupIndex={CALC_GI}
          groupIndex={gi}
          group={g}
          isDesktop={isDesktop}
          compareSlug={compareSlug}
          setCompareSlug={setCompareSlug}
          DailyDashboard={DailyDashboard}
          navigate={navigate}
        />
      </div>
      <EmailCapture/>
      <AppFooter/>
      {isMobile && <div style={{height:82}}/>}
      <MobileBottomNav gi={gi} goTo={goTo} tabs={TABS}/>
      <Suspense fallback={null}>
        {showPromoAdvisor && <PromoAdvisorPanel user={user} proStatus={proStatus} onClose={() => setShowPromoAdvisor(false)} />}
        <PromoChat navigate={navigate}/>
      </Suspense>
      <QuickCalcPanel goTo={goTo}/>
    </div>
    </AppProviders>
  );
}





