import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { startCheckout, startTrial } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, readSyncDiagnostics, triggerQueueFlush } from "./sync.js";
import { flagCalcUsed } from "./lib/missions.js";
import { toD, toA, toP, toF, f, calcROI, bestOdds, calcBonus, calcFirst, calcBoost, calcArb2, calcArb3, calcNV, calcNV3, calcEV, calcPH, calcMid, calcRO, calcDeposit, calcKelly, calcInsurance, calcTeaser, calcRR, calcParlay, calcSGP, calcHold, sensitivityBonus, sensitivityBoost, sensitivityFirst, KD, KL, K, font, fontD } from "./lib/shared.js";
import SensitivityChip from "./components/SensitivityChip.jsx";
import { usePromoAppShell } from "./app/usePromoAppShell.js";
import { AppFooter, MembershipBanner, TrustStrip } from "./app/AppChrome.jsx";
import { CalcSearch, MobileBottomNav, QuickCalcPanel } from "./app/AppNavigation.jsx";
import { CSVImportModal } from "./app/CSVImportModal.jsx";
import { CheckoutListener } from "./app/AppNotifications.jsx";
import { AppCalculatorRouter } from "./app/AppCalculatorRouter.jsx";
import { AppProviders, FeatureFlagProviders } from "./app/AppProviders.jsx";
import { buildAppTabs, buildSlugMap, DEFAULT_SLUG, getAllCalcs, getCalcGroupIndex, SUBCATS } from "./app/appRoutes.js";
import { APP_CHROME_COPY, BET_TRACKER_UI, PUSH_UI } from "./app/appText.js";
import { parseBetSlip } from "./app/parseBetSlip.js";
import { StarterPackModal, OnboardingChecklist, MemberWelcomeCard } from "./app/AppSubcomponents.jsx";
import OnboardingWizard, { ONBOARDING_KEY } from "./app/OnboardingWizard.jsx";
import { useProfitNotifications } from "./app/useProfitNotifications.js";
import { usePromoAuthSession } from "./app/usePromoAuthSession.js";
import { CANONICAL_APP_URL, FEATURE_FLAGS, getProjectAuthHref, getProjectAuthMode } from "./launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick, trackFeatureGateSeen, trackLaunchEvent } from "./launchTelemetry.js";
import { trackEvent, trackPage } from "./analytics.js";
import { ToastCtx, useToast, AppDataCtx, FX, CurrencyCtx } from "./contexts.jsx";
import { S, In, RR, Tl, Nt, FeatureUnavailableCard, useCalcMemory, shouldShowTrigger, dismissTrigger, Help, LoadingState } from "./ui.jsx";
import ResultFeedbackCard from "./components/ResultFeedbackCard.jsx";
import CalculatorTrustBadge from "./components/CalculatorTrustBadge.jsx";
import {
  AboutRoute, AIActionPlan, Arb2Way, Arb3Way, BetSizingAdvisor, BonusBet, CommunityPromoBoard,
  CompetitorComparison, DailyBriefPage, DailyDashboard, DepositMatch, FeatureFlagAdmin, FirstBet,
  GetStartedRoute, HoldCalc, InsurancePromo, KellyCriterion, LandingRoute, Ledger, LineShop,
  LiveScanner, NoVig, NoVig3Way, ParlayBuilder, ParlayHedge, PlusEV, PricingPage, ProfitBoost,
  PromoAdvisorPanel, PromoCalendar, PromoChat, PromoIntakeRoute, ReferralHub, RoundRobinCalc,
  SGPEstimator, SmartPromoRecommender, StackBuilder, TaxesEstimatorWrapper, TeamAccounts,
  TeaserCalc, TrackInsights, Tracker, WhatsNewRoute,
} from "./app/appLazyComponents.js";
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
import { FreeBetArbTracker, PromoJournal, OddsComparisonTable, PromoStacking } from "./components/TrackingTools.jsx";
import { DepositOptimizer, GutCheck, HedgeValidator, PromoArbFinder, PromoGuarantee } from "./calculators/PromoDecisionCalculators.jsx";
import { getQuickCalcFallbackSlug } from "./workflows/actionGraph.js";
import { StateLegalAlert } from "./lib/stateLegal.jsx";
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
const KB = KnowledgeBase;
const ProfitCertificate = ProfitCertificateRoute;
const Leaderboard = LeaderboardRoute;
const PromoBoard = CommunityPromoBoard;
const useCurrency = () => React.useContext(CurrencyCtx);
const EmailCapture = () => null;
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
  const [ageVerified, setAgeVerified] = useState(() => isAgeVerified());
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
  const { authReady, user, proStatus, weeklyActive } = usePromoAuthSession({ appData });
  const shellMaxWidth = viewport.contentMaxWidth;
  const shellPadding = viewport.shellPadding;
  const contentPadding = viewport.contentPadding;
  const stickyTop = isMobile ? 74 : isTablet ? 92 : 104;
  const [calcSubcat, setCalcSubcat] = useState("All");
  const [calcFavorites, setCalcFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pg_calc_favorites")) || []; } catch { return []; }
  });
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlug, setCompareSlug] = useState("");
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
  useProfitNotifications({ appData, authReady });
  const setAuthQueryMode = (mode) => {
    const params = new URLSearchParams(search);
    if (mode) params.set('auth', mode);
    else params.delete('auth');
    const nextSearch = params.toString();
    navigate(`${pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
  };
  const authHref = (mode) => getProjectAuthHref(mode, window.location.href);
  const closeAuthDialog = () => setAuthQueryMode(null);
  const slug = pathname.replace(/^\/+/, "") || DEFAULT_SLUG;
  const { gi = 0, ti = 0 } = slugMap[slug] || slugMap[DEFAULT_SLUG];
  const item = TABS[gi]?.items?.[ti];
  const goTo = (newGi, newTi) => {
    const resolvedTi = newTi !== undefined ? newTi : (tabMemory.current[newGi] ?? 0);
    tabMemory.current[newGi] = resolvedTi;
    navigate("/" + TABS[newGi].items[resolvedTi].slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => { window.VaultSDK?.applyGates(); }, [slug, proStatus]);
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
  useEffect(() => { tabMemory.current[gi] = ti; }, [gi, ti]);
  if (pathname.startsWith("/land/")) {
    return (
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        <LandingRoute />
      </Suspense>
    );
  }
  if (pathname === "/") {
    return (
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center" }}><LoadingState /></div>}>
        <LandingRoute />
      </Suspense>
    );
  }
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