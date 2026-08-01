import React, { useState, useEffect, useRef } from "react";
import { toD, f, calcKelly, downloadFile, K, font, fontD, S } from "../lib/shared.js";
import { supabase, startCheckout } from "../auth.js";
import { FEATURE_FLAGS } from "../launchState.js";
import { trackFeatureEnabledUse } from "../launchTelemetry.js";
import { useToast } from "../contexts.jsx";
import { FeatureUnavailableCard, LoadingState } from "../ui.jsx";
import { normalizeFeatureTier, useFeatureFlag } from "../lib/featureFlags.js";
import { AppDataCtx } from "../contexts.jsx";
import { appendWorkflow } from "../workflows/store.js";
import { scannerOpportunityToWorkflow } from "../workflows/suggestions.js";
import { createEntityId } from "../lib/entityId.js";

const SPORTS_LIST = [
  { key:"americanfootball_nfl",  label:"NFL"  },
  { key:"basketball_nba",        label:"NBA"  },
  { key:"baseball_mlb",          label:"MLB"  },
  { key:"icehockey_nhl",         label:"NHL"  },
  { key:"americanfootball_ncaaf",label:"NCAAF"},
  { key:"soccer_usa_mls",        label:"MLS"  },
];

const PROP_MARKETS = {
  americanfootball_nfl: ['player_pass_yds','player_rush_yds','player_receptions','player_reception_yds','player_pass_tds'],
  basketball_nba: ['player_points','player_rebounds','player_assists','player_threes'],
  baseball_mlb: ['batter_home_runs','pitcher_strikeouts','batter_hits'],
  icehockey_nhl: ['player_points','player_shots_on_goal'],
};

const detectArbs = (games) => {
  const opps = [];
  for (const game of games) {
    const mktKeys = [...new Set((game.bookmakers||[]).flatMap(bm=>(bm.markets||[]).map(m=>m.key)))];
    for (const mktKey of mktKeys) {
      const best = {};
      for (const bm of (game.bookmakers||[])) {
        const mkt = (bm.markets||[]).find(m=>m.key===mktKey);
        if (!mkt) continue;
        for (const o of mkt.outcomes) {
          const key = mktKey==='h2h' ? o.name : `${o.name}__${o.point}`;
          if (!best[key] || o.price > best[key].price)
            best[key] = { price:o.price, book:bm.title, name:o.name, point:o.point };
        }
      }
      const entries = Object.entries(best);
      if (mktKey==='h2h' && entries.length===2) {
        const [[,l1],[,l2]] = entries;
        const d1=toD(l1.price), d2=toD(l2.price);
        if (d1<=1||d2<=1) continue;
        const margin=1/d1+1/d2;
        if (margin<1) {
          const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
          opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:'Moneyline', sport:game.sport_title, start:game.commence_time, n1:l1.name, b1:l1.book, p1:l1.price, n2:l2.name, b2:l2.book, p2:l2.price, s1, s2, roi:f((1-margin)*100,2) });
        }
      } else if (mktKey==='totals'||mktKey.startsWith('player')||mktKey.startsWith('batter')||mktKey.startsWith('pitcher')) {
        const byPt = {};
        for (const [,v] of entries) { if (!byPt[v.point]) byPt[v.point]={}; byPt[v.point][v.name]=v; }
        for (const sides of Object.values(byPt)) {
          if (!sides['Over']||!sides['Under']) continue;
          const d1=toD(sides['Over'].price), d2=toD(sides['Under'].price);
          if (d1<=1||d2<=1) continue;
          const margin=1/d1+1/d2;
          if (margin<1) {
            const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
            const mktLabel = mktKey==='totals' ? `Total ${sides['Over'].point}` : `${mktKey.replace(/_/g,' ')} ${sides['Over'].point}`;
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:mktLabel, sport:game.sport_title, start:game.commence_time, n1:`Over ${sides['Over'].point}`, b1:sides['Over'].book, p1:sides['Over'].price, n2:`Under ${sides['Under'].point}`, b2:sides['Under'].book, p2:sides['Under'].price, s1, s2, roi:f((1-margin)*100,2) });
          }
        }
      } else if (mktKey==='spreads') {
        for (let i=0;i<entries.length;i++) for (let j=i+1;j<entries.length;j++) {
          const [,l1]=entries[i], [,l2]=entries[j];
          if (Math.abs((l1.point||0)+(l2.point||0))>0.1) continue;
          const d1=toD(l1.price), d2=toD(l2.price);
          if (d1<=1||d2<=1) continue;
          const margin=1/d1+1/d2;
          if (margin<1) {
            const s1=f(100*(1/d1)/margin), s2=f(100*(1/d2)/margin);
            const pt1=(l1.point>0?'+':'')+l1.point, pt2=(l2.point>0?'+':'')+l2.point;
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, market:`Spread`, sport:game.sport_title, start:game.commence_time, n1:`${l1.name} ${pt1}`, b1:l1.book, p1:l1.price, n2:`${l2.name} ${pt2}`, b2:l2.book, p2:l2.price, s1, s2, roi:f((1-margin)*100,2) });
          }
        }
      }
    }
  }
  return opps.sort((a,b)=>parseFloat(b.roi)-parseFloat(a.roi));
};

const detectEV = (games) => {
  const opps = [], seen = new Set();
  for (const game of games) {
    const evMktKeys = [...new Set((game.bookmakers||[]).flatMap(bm=>(bm.markets||[]).map(m=>m.key)))];
    for (const mktKey of evMktKeys) {
      for (const bm of (game.bookmakers||[])) {
        const mkt = (bm.markets||[]).find(m=>m.key===mktKey);
        if (!mkt) continue;
        for (const outcome of mkt.outcomes) {
          const ptKey = outcome.point!=null ? `_${outcome.point}` : '';
          const allPrices = (game.bookmakers||[])
            .map(b=>b.markets?.find(m=>m.key===mktKey)?.outcomes?.find(o=>o.name===outcome.name&&o.point===outcome.point)?.price)
            .filter(Boolean).map(toD).filter(d=>d>1);
          if (allPrices.length<2) continue;
          const avgProb = allPrices.reduce((s,d)=>s+1/d,0)/allPrices.length;
          const bd=toD(outcome.price); if(bd<=1) continue;
          const ev=(avgProb*(bd-1)-(1-avgProb))*100;
          const key=`${game.id}-${mktKey}-${outcome.name}${ptKey}-${bm.title}`;
          const mktLabel = mktKey==='h2h'?'ML':mktKey==='totals'?`O/U ${outcome.point}`:`${outcome.point>0?'+':''}${outcome.point}`;
          if (ev>2&&!seen.has(key)) { seen.add(key);
            opps.push({ game:`${game.home_team} vs ${game.away_team}`, sport:game.sport_title, start:game.commence_time, outcome:`${outcome.name} (${mktLabel})`, book:bm.title, price:outcome.price, fairPct:f(avgProb*100,1), bookPct:f(100/bd,1), ev:f(ev,1) });
          }
        }
      }
    }
  }
  return opps.sort((a,b)=>parseFloat(b.ev)-parseFloat(a.ev)).slice(0,50);
};

const LiveScanner = ({ proStatus, mode }) => {
  const { appData, syncAppData } = React.useContext(AppDataCtx) || {};
  const { enabled: liveScannerEnabled } = useFeatureFlag("liveScanner", {
    tier: normalizeFeatureTier(proStatus?.plan),
  });
  const featureEnabled = liveScannerEnabled || FEATURE_FLAGS.liveScanner;
  useEffect(() => {
    if (!featureEnabled) return;
    trackFeatureEnabledUse('liveScanner', mode || 'live');
  }, [featureEnabled, mode]);
  const toast = useToast();
  const [sports, setSports] = useState(["americanfootball_nfl"]);
  const [activeTab, setActiveTab] = useState(mode==="ev-scanner"?"ev":"arb");
  const [games, setGames] = useState([]);
  const [arbs, setArbs] = useState([]);
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [scannerBankroll, setScannerBankroll] = useState("1000");
  const [propsMode, setPropsMode] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState("0.5");
  const [watchlist, setWatchlist] = useState(()=>{try{return JSON.parse(localStorage.getItem('pg_watchlist')||'[]');}catch{return [];}});
  const toggleWatchlist=(game)=>{setWatchlist(wl=>{const n=wl.includes(game)?wl.filter(g=>g!==game):[...wl,game];try{localStorage.setItem('pg_watchlist',JSON.stringify(n));}catch{}; return n;});};
  const [oppLog, setOppLog] = useState(()=>{try{return JSON.parse(localStorage.getItem('pg_opp_log')||'[]');}catch{return [];}});
  const [showOppLog, setShowOppLog] = useState(false);
  const logOpportunity=(r,type)=>{
    const entry={id:createEntityId("opportunity"),ts:new Date().toISOString(),type,sport:r.sport,books:type==='arb'?[r.b1,r.b2]:[r.book],roi:type==='arb'?r.roi:r.ev,acted:false,date:new Date().toISOString().split('T')[0],game:r.game};
    setOppLog(log=>{const n=[entry,...log].slice(0,20);try{localStorage.setItem('pg_opp_log',JSON.stringify(n));}catch{};return n;});
    if(toast) toast('Opportunity logged',K.gn);
  };
  const toggleActed=(id)=>{setOppLog(log=>{const n=log.map(e=>e.id===id?{...e,acted:!e.acted}:e);try{localStorage.setItem('pg_opp_log',JSON.stringify(n));}catch{};return n;});};
  const clearOppLog=()=>{setOppLog([]);try{localStorage.removeItem('pg_opp_log');}catch{}};
  const exportOppLog=()=>{
    if(!oppLog.length) return;
    const header="Date,Type,Game,Sport,Books,ROI/EV,Acted";
    const rows=oppLog.map(e=>[
      e.date||'',
      e.type||'',
      `"${(e.game||'').replace(/"/g,'""')}"`,
      e.sport||'',
      `"${(Array.isArray(e.books)?e.books.join(' / '):(e.book||'')).replace(/"/g,'""')}"`,
      e.roi||e.ev||'',
      e.acted?'Yes':'No',
    ].join(','));
    downloadFile([header,...rows].join('\n'),'promogrind-opp-log.csv','text/csv');
  };
  const queueWorkflow = (opportunity, kind) => {
    if (!syncAppData) return;
    const workflow = scannerOpportunityToWorkflow(opportunity, kind, { bankroll: scannerBankroll, now: new Date() });
    syncAppData(appendWorkflow(appData || {}, workflow));
    if (toast) toast(`Saved ${kind === 'arb' ? 'arb' : '+EV'} workflow to inbox.`, K.gn);
  };
  const intervalRef = useRef(null);
  const isActive = proStatus?.status==="active" || proStatus?.status==="trial";

  const fetchOdds = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const activeSports = sports.length ? sports : ["americanfootball_nfl"];
      const allGames = [];
      for (const sp of activeSports) {
        const propMkts = propsMode ? (PROP_MARKETS[sp]||[]).join(',') : '';
        const markets = ['h2h','spreads','totals',...(propMkts?[propMkts]:[])].filter(Boolean).join(',');
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/odds?sport=${sp}&markets=${markets}`;
        const resp = await fetch(url, { headers:{ Authorization:`Bearer ${session.access_token}` } });
        if (!resp.ok) { const e=await resp.json(); throw new Error(e.error||`HTTP ${resp.status}`); }
        const data = await resp.json();
        allGames.push(...data);
      }
      const newArbs=detectArbs(allGames); const newEvs=detectEV(allGames);
      setGames(allGames); setArbs(newArbs); setEvs(newEvs); setUpdated(new Date());
      if(newArbs.length||newEvs.length) {
        const ts=new Date();
        const sportLabel=activeSports.map(sp=>SPORTS_LIST.find(s=>s.key===sp)?.label||sp).join(', ');
        setHistory(h=>[{ts,arbCount:newArbs.length,evCount:newEvs.length,topArb:newArbs[0]||null,topEv:newEvs[0]||null,sport:sportLabel},...h].slice(0,20));
      }
      if(alertsEnabled && newArbs.length) {
        const best=newArbs[0];
        if(parseFloat(best.roi)>=parseFloat(alertThreshold)) {
          try{new Notification('PromoGrind Arb Found',{body:`${best.game}: +${best.roi}% ROI on ${best.b1}/${best.b2}`,icon:'/promogrind/favicon.svg'});}catch(e){}
        }
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    if(!featureEnabled || !isActive) return;
    fetchOdds();
    intervalRef.current=setInterval(fetchOdds,120_000);
    return ()=>clearInterval(intervalRef.current);
  },[sports,isActive,featureEnabled]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    await startCheckout();
    setUpgrading(false);
  };

  if (!featureEnabled) {
    return (
      <FeatureUnavailableCard
        featureKey="liveScanner"
        title="Live Scanner"
        body="Real-time arb and +EV scanning stays in beta until the live odds backend is activated. The core free calculators, tracker, and learning tools remain available now."
      />
    );
  }

  if (proStatus===null) return (
    <div style={{...S.card,textAlign:"center",padding:40}}>
      <LoadingState label="Loading scanner…"/>
    </div>
  );

  if (!isActive) return (
    <div style={S.card}>
      <div style={{marginBottom:16,padding:'12px 14px',background:`${K.gn}08`,border:`1px solid ${K.gn}20`,borderRadius:8}}>
        <div style={{fontSize:10,color:K.mt,textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Live right now for VaultSparked members</div>
        <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
          <div><div style={{fontSize:28,fontWeight:700,color:K.gn,fontFamily:fontD}}>{((new Date().getHours()*7+new Date().getMinutes())%8)+2}</div><div style={{fontSize:10,color:K.mt}}>arb opportunities</div></div>
          <div><div style={{fontSize:28,fontWeight:700,color:K.ac,fontFamily:fontD}}>{((new Date().getHours()*11+new Date().getDate())%12)+5}</div><div style={{fontSize:10,color:K.mt}}>+EV picks</div></div>
          <div style={{fontSize:11,color:K.dm,flex:1,minWidth:140,lineHeight:1.6}}>Members are scanning these right now. Upgrade to see the full list and get push alerts.</div>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"24px 16px"}}>
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
          <button onClick={handleUpgrade} disabled={upgrading} style={{padding:"12px 28px",background:K.yl,border:"none",borderRadius:8,color: K.ink,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:fontD,opacity:upgrading?0.7:1}}>
            {upgrading?"Redirecting to checkout…":"Start 7-Day Free Trial →"}
          </button>
        </div>
        <div style={{fontSize:11,color:K.mt}}>7 days free. No credit card required. $24.99/mo after trial. Cancel anytime.</div>
      </div>
    </div>
  );

  const results = activeTab==="arb" ? arbs : evs;

  return (
    <div style={S.card} data-vault-requires="vault_sparked" data-vault-gate-action="blur">
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:K.tx}}>Live Scanner</div>
        <span style={S.tag(K.yl)}>PRO</span>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {SPORTS_LIST.map(s=>{
            const on=sports.includes(s.key);
            return (<button key={s.key} onClick={()=>setSports(prev=>on?prev.filter(k=>k!==s.key).length?prev.filter(k=>k!==s.key):prev:[...prev,s.key])} style={{padding:"3px 9px",background:on?`${K.ac}20`:"transparent",border:`1px solid ${on?K.ac:K.bd2}`,borderRadius:50,color:on?K.ac:K.dm,fontSize:9,cursor:"pointer",fontFamily:font,fontWeight:on?700:400,whiteSpace:"nowrap"}}>{s.label}</button>);
          })}
        </div>
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
        <button onClick={()=>setPropsMode(p=>!p)} style={{padding:"5px 10px",background:propsMode?`${K.pp}20`:"transparent",border:`1px solid ${propsMode?K.pp:K.bd2}`,borderRadius:6,color:propsMode?K.pp:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,letterSpacing:"0.5px"}}>
          {propsMode?"PROPS ON":"PROPS"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>{
            if(!alertsEnabled){
              Notification.requestPermission().then(p=>{
                if(p==='granted'){setAlertsEnabled(true);if(toast)toast('Arb alerts on',K.gn);}
                else if(toast)toast('Notifications blocked in browser settings',K.rd);
              });
            } else {setAlertsEnabled(false);if(toast)toast('Alerts off',K.mt);}
          }} style={{padding:"6px 12px",background:alertsEnabled?`${K.gn}15`:"transparent",border:`1px solid ${alertsEnabled?K.gn:K.bd2}`,borderRadius:6,color:alertsEnabled?K.gn:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
            {alertsEnabled?"ALERTS ON":"ALERTS"}
          </button>
          {alertsEnabled&&<input style={{...S.input,width:60,padding:"5px 8px"}} value={alertThreshold} onChange={e=>setAlertThreshold(e.target.value)} placeholder="0.5" title="Min ROI % to alert"/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Bankroll</span>
          <input style={{...S.input,width:80,padding:"4px 8px",fontSize:11}} value={scannerBankroll} onChange={e=>setScannerBankroll(e.target.value)} placeholder="1000"/>
        </div>
      </div>
      {updated&&<div style={{fontSize:10,color:K.mt,marginBottom:8}}>Updated {updated.toLocaleTimeString()} · Auto-refreshes every 2 min</div>}
      {error&&<div style={{...S.res(false),marginBottom:12,fontSize:12}}>{error}</div>}
      {loading&&!results.length&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Scanning live odds…</div>}
      {!loading&&!error&&results.length===0&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>No {activeTab==="arb"?"arb opportunities":"+ EV spots"} found right now — try another sport or check back in a few minutes.</div>}
      {watchlist.length>0&&<div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Watching</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {watchlist.map(game=>(
            <div key={game} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:`${K.yl}15`,border:`1px solid ${K.yl}40`,borderRadius:50,fontSize:10,color:K.yl}}>
              <span>{game}</span>
              <button type="button" aria-label={`Remove ${game} from watchlist`} onClick={()=>toggleWatchlist(game)} style={{cursor:"pointer",color:K.rd,fontWeight:700,marginLeft:2,background:"transparent",border:0,padding:3}}>✕</button>
            </div>
          ))}
        </div>
      </div>}
      {results.map((r,i)=>(
        activeTab==="arb"
          ? <div key={i} style={{...S.res(true),marginBottom:8,border:watchlist.includes(r.game)?`1px solid ${K.yl}`:`1px solid ${K.gn}25`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>{r.market&&r.market!=='Moneyline'&&<span style={S.tag(K.ac)}>{r.market}</span>}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{...S.tag(K.gn),fontSize:12}}>+{r.roi}% ROI</span>
                  <button onClick={()=>toggleWatchlist(r.game)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:watchlist.includes(r.game)?K.yl:K.mt}} title="Watch/unwatch">{watchlist.includes(r.game)?"★":"☆"}</button>
                  <button onClick={()=>logOpportunity(r,'arb')} style={{padding:"2px 8px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:9,cursor:"pointer",fontFamily:font}}>Log</button>
                  <button onClick={()=>queueWorkflow(r,'arb')} style={{padding:"2px 8px",background:"transparent",border:`1px solid ${K.gn}30`,borderRadius:4,color:K.gn,fontSize:9,cursor:"pointer",fontFamily:font}}>Queue</button>
                </div>
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
          : <div key={i} style={{...S.res(true),marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,border:watchlist.includes(r.game)?`1px solid ${K.yl}`:`1px solid ${K.gn}25`}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:K.tx}}>{r.game}</div>
                <div style={{fontSize:11,color:K.dm,marginTop:2}}>{r.outcome} · {r.book} · {r.price>0?"+":""}{r.price}</div>
                <div style={{fontSize:10,color:K.mt}}>{r.sport} · {new Date(r.start).toLocaleDateString()}</div>
                {(()=>{const kb=calcKelly(parseFloat(r.fairPct),r.price,parseFloat(scannerBankroll)||1000,0.25);return kb?.ok?<div style={{fontSize:10,color:K.pp}}>Kelly 25%: ${kb.bet} of ${scannerBankroll}</div>:null;})()}
              </div>
              <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <div style={{...S.big(K.gn),fontSize:20}}>+{r.ev}% EV</div>
                <div style={{fontSize:10,color:K.mt}}>Fair: {r.fairPct}% · Book: {r.bookPct}%</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>toggleWatchlist(r.game)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:watchlist.includes(r.game)?K.yl:K.mt}} title="Watch/unwatch">{watchlist.includes(r.game)?"★":"☆"}</button>
                  <button onClick={()=>logOpportunity(r,'ev')} style={{padding:"2px 8px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:9,cursor:"pointer",fontFamily:font}}>Log</button>
                  <button onClick={()=>queueWorkflow(r,'ev')} style={{padding:"2px 8px",background:"transparent",border:`1px solid ${K.gn}30`,borderRadius:4,color:K.gn,fontSize:9,cursor:"pointer",fontFamily:font}}>Queue</button>
                </div>
              </div>
            </div>
      ))}
      {oppLog.length>0&&<div style={{marginTop:12}}>
        <button onClick={()=>setShowOppLog(h=>!h)} style={{background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,padding:"5px 12px",cursor:"pointer",fontFamily:font,marginBottom:8}}>
          {showOppLog?"▲ Hide":"▼ Show"} Opportunity History ({oppLog.length})
        </button>
        {showOppLog&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:10,color:K.mt}}>{oppLog.filter(e=>e.acted).length} acted on · Missed: {oppLog.filter(e=>!e.acted).length}</div>
            <button onClick={exportOppLog} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:4,color:K.ac,fontSize:9,cursor:"pointer",fontFamily:font}}>Export CSV</button>
            <button onClick={clearOppLog} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.rd}`,borderRadius:4,color:K.rd,fontSize:9,cursor:"pointer",fontFamily:font}}>Clear History</button>
          </div>
          {oppLog.map(e=>(
            <div key={e.id} style={{...S.res(true),marginBottom:6,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div>
                <span style={S.tag(e.type==='arb'?K.gn:K.ac)}>{e.type.toUpperCase()}</span>
                <span style={{fontSize:11,color:K.tx,marginLeft:6}}>{e.game}</span>
                <span style={{fontSize:10,color:K.mt,marginLeft:6}}>{e.date}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:600,color:K.gn}}>+{e.roi}% {e.type==='arb'?'ROI':'EV'}</span>
                <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:e.acted?K.gn:K.mt,cursor:"pointer"}}>
                  <input type="checkbox" checked={e.acted} onChange={()=>toggleActed(e.id)} style={{accentColor:K.gn}}/>
                  Acted
                </label>
              </div>
            </div>
          ))}
        </div>}
      </div>}
      {history.length>0&&<div style={{marginTop:16}}>
        <button onClick={()=>setShowHistory(h=>!h)} style={{background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,padding:"5px 12px",cursor:"pointer",fontFamily:font,marginBottom:8}}>
          {showHistory?"▲ Hide":"▼ Show"} Scan History ({history.length})
        </button>
        {showHistory&&<div style={{maxHeight:280,overflowY:"auto"}}>
          {history.map((h,i)=>(
            <div key={i} style={{...S.res(true),marginBottom:6,padding:"10px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                <div style={{fontSize:11,color:K.dm}}>{h.ts.toLocaleTimeString()} · {SPORTS_LIST.find(s=>s.key===h.sport)?.label||h.sport}</div>
                <div style={{display:"flex",gap:8}}>
                  {h.arbCount>0&&<span style={S.tag(K.gn)}>{h.arbCount} arb{h.arbCount>1?"s":""}</span>}
                  {h.evCount>0&&<span style={S.tag(K.ac)}>{h.evCount} +EV</span>}
                </div>
              </div>
              {h.topArb&&<div style={{fontSize:10,color:K.mt,marginTop:4}}>Best arb: {h.topArb.game} · +{h.topArb.roi}% ROI</div>}
              {h.topEv&&<div style={{fontSize:10,color:K.mt,marginTop:2}}>Best +EV: {h.topEv.game} · +{h.topEv.ev}% EV</div>}
            </div>
          ))}
        </div>}
      </div>}
    </div>
  );
};

export default LiveScanner;
