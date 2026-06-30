import React, { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BOOKS } from "../../books.js";
import { FEATURE_FLAGS } from "../../launchState.js";
import { computeStreak } from "../../lib/streaks.js";
import { evaluateAchievements, loadEarned, saveEarned, getNewlyUnlocked, ACHIEVEMENT_MAP } from "../../lib/achievements.js";
import { computeMastery } from "../../lib/mastery.js";
import { K, S, font } from "../../lib/shared.js";
import { AppDataCtx, useToast } from "../../contexts.jsx";
import { LoadingState } from "../../ui.jsx";
import { PROMO_SCHED } from "../../data/promoSchedule.js";
import { getDashboardSnapshot } from "../../dashboard/today.js";
import PromoWalkthrough from "../PromoWalkthrough.jsx";
import { StarterPackModal, OnboardingChecklist, MemberWelcomeCard } from "../../app/AppSubcomponents.jsx";
import { DailyBriefingBtn, DailyRoutinePanel, OpenExposurePanel, ProfitGoalTracker, TopToolsPanel } from "../../app/DashboardWidgets.jsx";
import { BankrollWizard, CopyMySetup, PushEnableBtn, QuickAddBet, WeeklyGrindReport } from "../../app/DashboardActionWidgets.jsx";
import DashboardHero from "./DashboardHero.jsx";
import ActivationNextAction from "./ActivationNextAction.jsx";
import DailyMissionsPanel from "./DailyMissionsPanel.jsx";
import LaunchCommandCenterPanel from "./LaunchCommandCenterPanel.jsx";
import CommunityWinsWall from "./CommunityWinsWall.jsx";
import TodayDashboardPanel from "./TodayDashboardPanel.jsx";
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
// â•â•â• ANNUAL INCOME ESTIMATOR â•â•â•
// MiddleBet, OddsConvert, RolloverCalc, IncomeEstimator -> ./calculators/UtilityCalculators.jsx

// PromoFinder -> ./components/PromoFinder.jsx

// â•â•â• REFERRAL HUB â•â•â•

// â•â•â• COMPETITOR COMPARISON â•â•â•
// â•â•â• TEAM ACCOUNTS (COMING SOON) â•â•â•
// â•â•â• SMART PROMO RECOMMENDER â•â•â•
// â•â•â• QUICK ADD BET â•â•â•
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

export default DailyDashboard;
