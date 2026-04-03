import React, { useState, useMemo, useEffect, useRef, Component } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BOOKS, getBookUrl, getConfiguredAffiliateCount, hasConfiguredAffiliateLinks } from "./books.js";
import { checkAuth, getSubscription, startCheckout, startTrial, supabase } from "./auth.js";
import { loadData, saveData, onCalculation, onLedgerEntry, onDailyLogin } from "./sync.js";
import { subscribeToPush } from "./sw-register.js";
import { toD, toA, toP, toF, f, calcROI, downloadFile, bestOdds, calcBonus, calcFirst, calcBoost, calcArb2, calcArb3, calcNV, calcNV3, calcEV, calcPH, calcMid, calcRO, calcDeposit, calcKelly, calcInsurance, calcTeaser, calcRR, calcParlay, calcSGP, calcHold, KD, KL, K, font, fontD } from "./lib/shared.js";
import { CANONICAL_APP_URL, FREE_VAULT_MEMBERSHIP_URL, FEATURE_FLAGS, FEATURE_KEYS, LAUNCH_BLOCKERS, LAUNCH_VALIDATION, getFeatureState, getLaunchSummary } from "./launchState.js";
import { trackFeatureEnabledUse, trackFeatureGateClick, trackFeatureGateSeen, trackLaunchEvent } from "./launchTelemetry.js";
import { ToastCtx, useToast, ToastProvider, AppDataCtx, CompactCtx, FX, CurrencyCtx } from "./contexts.jsx";
import { S, In, RR, Tl, Nt, FeatureUnavailableCard, useCalcMemory, shouldShowTrigger, dismissTrigger } from "./ui.jsx";
import { PROMO_SCHED, DAYS_ORDER } from "./data/promoSchedule.js";
import Tracker from "./components/Tracker.jsx";
import Ledger from "./components/Ledger.jsx";
import LiveScanner from "./components/LiveScanner.jsx";
import TaxesEstimatorWrapper from "./components/TaxesEstimator.jsx";
import PromoChat from "./components/PromoChat.jsx";

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

// Math, colors, styles from ./lib/shared.js — S (with JSX meter) from ./ui.jsx

// Toast, contexts, UI atoms, useCalcMemory, FeatureUnavailableCard → ./contexts.jsx + ./ui.jsx

// ═══ BOOK CTA (shown at profitable calc results) ═══
const BookCTA = () => (
  <div style={{marginTop:14,padding:12,background:`${K.gn}06`,border:`1px solid ${K.gn}20`,borderRadius:8}}>
    <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Don't have these books yet? Open accounts to use this promo:</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {BOOKS.slice(0,4).map(b=>(
        <a key={b.name} href={getBookUrl(b)} target="_blank" rel="noopener noreferrer sponsored"
          style={{padding:"4px 10px",background:`${b.color}15`,border:`1px solid ${b.color}30`,borderRadius:4,color:b.color,fontSize:10,fontWeight:600,textDecoration:"none",fontFamily:font}}>
          {b.name} →
        </a>
      ))}
      <a href={getBookUrl(BOOKS[4]||{})||"#"} target="_blank" rel="noopener noreferrer sponsored"
        style={{padding:"4px 10px",background:`${K.bd}`,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:10,fontWeight:600,textDecoration:"none",fontFamily:font}}>
        +{BOOKS.length-4} more →
      </a>
    </div>
  </div>
);

// ═══ INLINE HELP COMPONENT ═══
const Help = ({entries}) => {
  const compact = React.useContext(CompactCtx);
  if(compact) return null;
  return (<div style={{...S.card,background:K.s2,borderColor:K.bd,marginTop:12}}><div style={{fontSize:12,fontWeight:600,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>How This Works</div><div style={S.help}>{entries.map((e,i)=><div key={i} style={{marginBottom:10}}><span style={S.helpTerm}>{e[0]}:</span> {e[1]}</div>)}</div></div>);
};

const TrustStrip = () => (
  <div style={{background:`${K.gn}08`,borderBottom:`1px solid ${K.bd}`,padding:"8px 20px"}}>
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:14,flexWrap:"wrap",fontSize:10,color:K.dm,letterSpacing:"0.4px"}}>
      <span><strong style={{color:K.gn}}>Free Vault membership</strong> unlocks access and sync across Studio tools.</span>
      <span>Educational math only.</span>
      <span>21+ where legal.</span>
      <span>Not betting or financial advice.</span>
      <span>Gamble responsibly: 1-800-GAMBLER.</span>
    </div>
  </div>
);

const MembershipBanner = () => (
  <div style={{...S.note(K.ac),marginBottom:12}}>
    PromoGrind is free to use with a free Vault membership account. That account also powers sync, referrals, and shared access across VaultSpark Studio projects.
  </div>
);

// FeatureUnavailableCard → ./ui.jsx

const LaunchReadinessPanel = () => {
  const summary = getLaunchSummary();
  const configuredAffiliates = getConfiguredAffiliateCount();
  const affiliateReady = hasConfiguredAffiliateLinks();

  return (
    <div style={{...S.card,border:`1px solid ${K.ac}35`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:12}}>
        <div>
          <div style={{fontSize:11,color:K.ac,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:6}}>Launch Readiness</div>
          <div style={{fontFamily:fontD,fontSize:17,fontWeight:700,color:K.tx,marginBottom:6}}>Current launch posture</div>
          <div style={{fontSize:12,color:K.dm,lineHeight:1.7,maxWidth:760}}>
            PromoGrind's core calculators are live. Upside is mostly bottlenecked by activation, discovery, and measurement rather than missing product scope.
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{padding:"8px 10px",background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,minWidth:108}}>
            <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.2px"}}>Flags Live</div>
            <div style={{fontFamily:fontD,fontSize:22,fontWeight:700,color:K.gn}}>{summary.enabledCount}/{summary.totalCount}</div>
          </div>
          <div style={{padding:"8px 10px",background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,minWidth:108}}>
            <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.2px"}}>Affiliates</div>
            <div style={{fontFamily:fontD,fontSize:22,fontWeight:700,color:configuredAffiliates ? K.gn : K.yl}}>{configuredAffiliates}/{BOOKS.length}</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:10,marginBottom:12}}>
        <div style={{padding:"12px",background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Validation</div>
          {Object.values(LAUNCH_VALIDATION).map((check) => (
            <div key={check.label} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:11,color:K.dm,marginBottom:6}}>
              <span>{check.label}</span>
              <span style={{color:/pass|75\/75|new/i.test(check.lastKnown) ? K.gn : K.yl,fontWeight:700}}>{check.lastKnown}</span>
            </div>
          ))}
        </div>
        <div style={{padding:"12px",background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Manual blockers</div>
          <div style={{fontSize:10,color:affiliateReady ? K.gn : K.yl,marginBottom:8}}>
            Affiliate readiness: {affiliateReady ? "partially configured" : "not configured yet"}
          </div>
          {LAUNCH_BLOCKERS.slice(0, 4).map((blocker) => (
            <div key={blocker.key} style={{marginBottom:8}}>
              <div style={{fontSize:11,color:blocker.status === "manual" ? K.yl : K.ac,fontWeight:700}}>{blocker.label}</div>
              <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{blocker.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Feature rollout</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:8}}>
          {FEATURE_KEYS.map((key) => {
            const feature = getFeatureState(key);
            return (
              <div key={key} style={{padding:"10px 12px",background:K.s2,border:`1px solid ${feature.enabled ? K.gn : K.bd}`,borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:feature.enabled ? K.gn : K.tx,marginBottom:4}}>{feature.label}</div>
                <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{feature.enabled ? "Enabled" : feature.shortReason}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CommunityWinsWall = () => {
  const [localEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pg_wins_wall') || '[]'); } catch { return []; }
  });
  const [serverEntries, setServerEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchWall = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('wins_wall')
          .select('id, period_label, total, entry_count, book_count, display_name, created_at')
          .order('created_at', { ascending: false })
          .limit(12);
        if (!error && data && !cancelled) setServerEntries(data);
      } catch {}
      if (!cancelled) setLoading(false);
    };
    fetchWall();
    return () => { cancelled = true; };
  }, []);

  // Merge: server entries first, then local-only entries (deduplicated by period)
  const serverPeriods = new Set(serverEntries.map(e => e.period_label));
  const merged = [
    ...serverEntries.map(e => ({
      id: e.id, periodLabel: e.period_label, total: e.total,
      count: e.entry_count, books: e.book_count,
      displayName: e.display_name, source: 'server',
    })),
    ...localEntries.filter(e => !serverPeriods.has(e.periodLabel)).map(e => ({ ...e, source: 'local' })),
  ].slice(0, 12);

  if (!merged.length && !loading) return null;

  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,color:K.pp,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",marginBottom:4}}>Wins Wall</div>
          <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:K.tx}}>Community profit opt-ins</div>
        </div>
      </div>
      {loading && !merged.length && <div style={{fontSize:11,color:K.mt,padding:12}}>Loading wins wall…</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",gap:8}}>
        {merged.slice(0, 6).map((entry) => (
          <div key={entry.id} style={{padding:"12px",background:`${K.gn}08`,border:`1px solid ${K.gn}20`,borderRadius:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1.2px"}}>{entry.periodLabel}</span>
              {entry.source==='server'&&<span style={{fontSize:8,color:K.ac,textTransform:"uppercase",letterSpacing:"1px"}}>verified</span>}
            </div>
            <div style={{fontFamily:fontD,fontSize:24,fontWeight:800,color:K.gn,marginBottom:4}}>+${entry.total}</div>
            <div style={{fontSize:10,color:K.dm,lineHeight:1.5}}>
              {entry.count} conversions across {entry.books} books
              {entry.displayName && <span style={{display:"block",fontSize:9,color:K.mt,marginTop:2}}>— {entry.displayName}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// TOOL COMPONENTS
// ═══════════════════════════════════════════

const parseNL = (text) => {
  const dollars = text.match(/\$(\d+(?:\.\d+)?)/);
  const posOdds = text.match(/\+(\d+)/);
  const negOdds = text.match(/-(\d+)/);
  return {
    sz: dollars ? dollars[1] : null,
    bo: posOdds ? '+'+posOdds[1] : null,
    ho: negOdds ? '-'+negOdds[1] : null,
  };
};

// ═══ SHARE CARD ═══
function ShareCard({ title, profit, onClose }) {
  const appUrl = CANONICAL_APP_URL;
  const text = `🎉 Just locked in ${profit} in guaranteed profit using ${title} on PromoGrind.\n\nFree Vault membership account, free core calculator suite:\n${appUrl}`;
  const tweetText = `🎉 Just locked in ${profit} guaranteed profit from a sportsbook promo using @PromoGrind — free Vault membership, free calculator suite\n${appUrl}`;
  const [copyLabel, setCopyLabel] = React.useState('📋 Copy text');

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopyLabel('✓ Copied!');
    setTimeout(() => setCopyLabel('📋 Copy text'), 2200);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `I made ${profit} with PromoGrind`, text, url: appUrl }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
    }
  };

  const handleReddit = () => {
    const body = encodeURIComponent(`Used the free PromoGrind calculator and locked in ${profit} in guaranteed profit from ${title}. No subscription, no BS — it's completely free.\n\n${appUrl}`);
    window.open(`https://www.reddit.com/submit?title=${encodeURIComponent(`Locked in ${profit} guaranteed profit using PromoGrind`)}&text=${body}`, '_blank');
  };

  return (
    <div style={{marginTop:12,padding:16,background:'linear-gradient(135deg,#0f2a1e,#0a0e17)',border:'2px solid #4ade80',borderRadius:10,position:'relative'}}>
      <button onClick={onClose} style={{position:'absolute',top:8,right:10,background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
      <div style={{fontSize:9,color:'#64748b',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:6}}>Guaranteed Profit Locked In</div>
      <div style={{fontSize:32,fontWeight:800,color:'#4ade80',marginBottom:2,fontFamily:"'Space Grotesk',sans-serif"}}>{profit}</div>
      <div style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>from {title} · PromoGrind</div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <button onClick={handleCopy} style={{flex:1,padding:'8px 0',background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>
          {copyLabel}
        </button>
        <button onClick={handleShare} style={{flex:1,padding:'8px 0',background:'#4ade80',border:'none',color:'#0a0e17',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:700}}>
          𝕏 Tweet ↗
        </button>
        <button onClick={handleReddit} style={{flex:1,padding:'8px 0',background:'#ff4500',border:'none',color:'#fff',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:700}}>
          Reddit ↗
        </button>
      </div>
      <div style={{fontSize:9,color:'#1e293b',textAlign:'center',letterSpacing:'0.5px'}}>{appUrl.replace(/^https?:\/\//,'')} — free sportsbook promo tools</div>
    </div>
  );
}

const BonusBet = () => {
  const { appData: bbAppData, syncAppData: bbSyncAppData } = React.useContext(AppDataCtx) || {};
  const [mem, setMem] = useCalcMemory('bonus-bet', {sz:"200",bo:"+300",ho:"-350"});
  const {sz,bo,ho} = mem;
  const setSz = v => setMem('sz',v), setBo = v => setMem('bo',v), setHo = v => setMem('ho',v);
  const r = useMemo(()=>calcBonus(parseFloat(sz),bo,ho),[sz,bo,ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(()=>{ try{return JSON.parse(localStorage.getItem('pg_hist_bonus-bet')||'[]');}catch{return[];} });
  useEffect(()=>{
    if(!r||!parseFloat(r.g)) return;
    const entry={ts:Date.now(),sz,bo,ho,profit:r.g,hs:r.hs,rate:r.r};
    setHist(prev=>{
      const next=[entry,...prev].slice(0,20);
      try{localStorage.setItem('pg_hist_bonus-bet',JSON.stringify(next));}catch{}
      return next;
    });
  },[r?.g,r?.hs]);
  const [nlText, setNlText] = useState("");
  const [nlPreview, setNlPreview] = useState(null);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has('demo'));
  const [bbUpsellDismissed, setBbUpsellDismissed] = useState(() => { try { return !!localStorage.getItem('pg_upsell_bb_dismissed'); } catch { return true; } });
  const [rCopied, setRCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const fileInputRef = useRef(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const bbCount = useMemo(()=>{ try{return parseInt(localStorage.getItem('pg_upsell_bb_count')||'0');}catch{return 0;} },[r]);
  const applyNL = () => {
    const p = parseNL(nlText);
    if(p.sz) setSz(p.sz);
    if(p.bo) setBo(p.bo);
    if(p.ho) setHo(p.ho);
    setNlPreview(p);
  };
  const applyDemo = () => { setSz("200"); setBo("+330"); setHo("-380"); setDemoMode(true); };
  useMemo(()=>{
    if(r&&parseFloat(r.g)>0){ try{ const c=parseInt(localStorage.getItem('pg_upsell_bb_count')||'0')+1; localStorage.setItem('pg_upsell_bb_count',String(c)); }catch{} }
  },[r?.g]);
  const scanBetSlip = async (file) => {
    setScanLoading(true); setScanResult(null);
    try {
      const toBase64 = f => new Promise((res,rej)=>{ const rd=new FileReader(); rd.onload=()=>res(rd.result.split(',')[1]); rd.onerror=rej; rd.readAsDataURL(f); });
      const base64 = await toBase64(file);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: parsed, error } = await supabase.functions.invoke('parse-bet-slip', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) throw error;
      if (parsed) {
        if (parsed.stake) setSz(String(parsed.stake));
        if (parsed.odds) setBo(String(parsed.odds));
        if (parsed.hedgeOdds) setHo(String(parsed.hedgeOdds));
        setScanResult(parsed);
      }
    } catch(e) { console.error('[BetSlipScan]', e); setScanResult({ error: true }); }
    finally { setScanLoading(false); }
  };
  const copyResult = () => {
    if(!r) return;
    const text = `📊 Bonus Bet Converter — PromoGrind\nBonus Size: $${sz} | Bonus Odds: ${bo} | Hedge Odds: ${ho}\nHedge Stake: $${r.hs}\nGuaranteed Profit: $${r.g} (${r.r}% conversion)\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setRCopied(true); setTimeout(()=>setRCopied(false),1500);
  };
  return (<div><div style={S.card}><Tl t="Bonus Bet Converter" badge="STAKE NOT RETURNED" bc={K.gn} shareable getParams={()=>({sz,bo,ho})}/>
    <div style={{marginBottom:12}}>
      <label style={S.label}>Quick Input (natural language)</label>
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        <textarea value={nlText} onChange={e=>{setNlText(e.target.value);setNlPreview(parseNL(e.target.value));}} placeholder='Try: "I have a $200 bonus bet at +350, hedge at -400"' style={{...S.input,height:48,resize:"none",flex:1,lineHeight:1.5,fontSize:12}}/>
        <button onClick={applyNL} style={{padding:"8px 14px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Parse</button>
        {FEATURE_FLAGS.aiScan ? (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])scanBetSlip(e.target.files[0]);e.target.value='';}}/>
            <button onClick={()=>fileInputRef.current?.click()} disabled={scanLoading} title="Upload a bet slip screenshot — Claude AI will auto-fill the fields" style={{padding:"8px 12px",background:scanLoading?`${K.mt}15`:`${K.pp}15`,border:`1px solid ${scanLoading?K.mt:K.pp}30`,borderRadius:4,color:scanLoading?K.mt:K.pp,fontSize:10,cursor:scanLoading?"not-allowed":"pointer",fontFamily:font,whiteSpace:"nowrap"}}>{scanLoading?"Scanning…":"📷 Scan"}</button>
          </>
        ) : (
          <div style={{padding:"8px 12px",background:`${K.yl}10`,border:`1px solid ${K.yl}30`,borderRadius:4,color:K.yl,fontSize:10,fontFamily:font,whiteSpace:"nowrap"}}>
            📷 Scan in beta
          </div>
        )}
      </div>
      {!FEATURE_FLAGS.aiScan && <div style={{fontSize:10,color:K.mt,marginTop:4}}>Bet slip scan will appear here once the AI backend is activated.</div>}
      {scanResult&&!scanResult.error&&<div style={{fontSize:10,color:K.gn,marginTop:4}}>✓ Scanned: {[scanResult.book,scanResult.betType?.replace(/_/g,' '),scanResult.odds&&`${scanResult.odds} odds`,scanResult.stake&&`$${scanResult.stake} stake`].filter(Boolean).join(' · ')}</div>}
      {scanResult&&!scanResult.error&&bbSyncAppData&&<button
        onClick={()=>{
          const newBet={
            id:Date.now(),
            date:new Date().toISOString().split('T')[0],
            book:scanResult.book||'',
            sport:'',
            description:scanResult.promoName||scanResult.betType||'Scanned bet',
            betType:scanResult.betType||'straight',
            stake:parseFloat(scanResult.stake)||0,
            odds:scanResult.odds||'',
            result:'pending',
            payout:0,
            profit:0,
            notes:'Added via AI scan',
            tags:['scanned'],
          };
          const updatedBets=[...(bbAppData?.bets||[]),newBet];
          bbSyncAppData({...bbAppData,bets:updatedBets});
          alert('Bet added to Tracker!');
        }}
        style={{marginTop:8,padding:'6px 14px',background:'#1e3a2f',border:'1px solid #4ade80',color:'#4ade80',borderRadius:6,cursor:'pointer',fontSize:13}}
      >➕ Add to Tracker</button>}
      {scanResult?.error&&<div style={{fontSize:10,color:K.rd,marginTop:4}}>⚠ Scan failed — try entering manually or use a clearer screenshot</div>}
      {nlPreview&&(nlPreview.sz||nlPreview.bo||nlPreview.ho)&&<div style={{fontSize:10,color:K.gn,marginTop:4}}>Detected: {[nlPreview.sz&&`$${nlPreview.sz} bonus`,nlPreview.bo&&`${nlPreview.bo} odds`,nlPreview.ho&&`${nlPreview.ho} hedge`].filter(Boolean).join(", ")}</div>}
    </div>
    <div style={S.row}><In l="Bonus Bet Size" v={sz} set={setSz} pre="$" ph="200"/><In l="Bonus Bet Odds" v={bo} set={setBo} ph="+300"/><In l="Hedge Odds" v={ho} set={setHo} ph="-350"/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <button onClick={()=>{setSz("200");setBo("+350");setHo("-400");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,letterSpacing:"0.5px"}}>★ Show Example</button>
      <button onClick={()=>demoMode?setDemoMode(false):applyDemo()} style={{padding:"4px 10px",background:demoMode?`${K.gn}15`:`${K.gn}08`,border:`1px solid ${demoMode?K.gn:K.gn+'30'}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font,letterSpacing:"0.5px"}}>▶ Demo</button>
      <span style={{fontSize:10,color:K.mt}}>$200 bonus bet at +350, hedge at -400 — DraftKings → FanDuel</span>
    </div>
    {demoMode&&<div style={{...S.note(K.ac),marginBottom:12}}>
      <div style={{fontWeight:700,marginBottom:4}}>Step-by-step demo</div>
      <div>Step 1: You received a $200 bonus bet.</div>
      <div>Step 2: We found Warriors +330 vs Lakers tonight.</div>
      <div>Step 3: Hedge ${r?r.hs:'~'} at -380 on FanDuel.</div>
      <div>Step 4: Collect ~${r?r.g:'~'} guaranteed.</div>
      <button onClick={()=>setDemoMode(false)} style={{marginTop:6,background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:10,padding:0,textDecoration:"underline"}}>✕ Exit Demo</button>
    </div>}
    {bo&&toD(bo)>1&&(()=>{
      const a=toD(bo)>1?Math.round((toD(bo)-1)*100):0;
      const zones=[{min:0,max:199,c:K.rd,l:"Too Low"},{min:200,max:249,c:K.yl,l:"OK"},{min:250,max:400,c:K.gn,l:"Sweet Spot"},{min:401,max:500,c:K.yl,l:"Harder to Hedge"},{min:501,max:9999,c:K.rd,l:"Too High"}];
      const zone=zones.find(z=>a>=z.min&&a<=z.max)||zones[4];
      const pct=Math.min(100,Math.max(0,(a-0)/(700)*100));
      return (<div style={{marginBottom:12,padding:"10px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
        <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>Bonus Bet Odds Sweet Spot</div>
        <div style={{position:"relative",height:8,background:K.s3,borderRadius:4,marginBottom:4}}>
          <div style={{position:"absolute",left:0,width:"29%",height:"100%",background:`${K.rd}40`,borderRadius:"4px 0 0 4px"}}/>
          <div style={{position:"absolute",left:"29%",width:"7%",height:"100%",background:`${K.yl}40`}}/>
          <div style={{position:"absolute",left:"36%",width:"22%",height:"100%",background:`${K.gn}40`}}/>
          <div style={{position:"absolute",left:"58%",width:"14%",height:"100%",background:`${K.yl}40`}}/>
          <div style={{position:"absolute",left:"72%",width:"28%",height:"100%",background:`${K.rd}40`,borderRadius:"0 4px 4px 0"}}/>
          <div style={{position:"absolute",left:`calc(${pct}% - 3px)`,top:-2,width:6,height:12,background:zone.c,borderRadius:2,border:`1px solid ${zone.c}`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:K.mt}}>
          <span>+100</span><span style={{color:K.gn,fontWeight:600}}>+250–+400 ideal</span><span>+700</span>
        </div>
        <div style={{fontSize:10,color:zone.c,fontWeight:600,marginTop:4}}>{toA(toD(bo))} — {zone.l}</div>
      </div>);
    })()}
    {hist.length>0&&<div style={{marginBottom:8,display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setShowHist(h=>!h)} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:9,cursor:"pointer",fontFamily:font}}>🕐 History ({hist.length})</button></div>}
    {showHist&&hist.length>0&&<div style={{marginBottom:12,padding:10,background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,maxHeight:180,overflowY:"auto"}}>
      <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Last {hist.length} Calculations</div>
      {hist.map((h,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.dm,padding:"3px 0",borderBottom:i<hist.length-1?`1px solid ${K.bd}`:"none"}}>
        <span>${h.sz} @ {h.bo} → {h.ho}</span>
        <span style={{color:K.gn,fontWeight:600}}>+${h.profit} ({h.rate}%)</span>
        <span style={{color:K.mt}}>{new Date(h.ts).toLocaleDateString()}</span>
      </div>)}
    </div>}
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span><button onClick={copyResult} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:rCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>📋 {rCopied?"Copied!":"Copy"}</button></div>
      <RR l="Hedge Bet Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Bonus Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Bet Wins" v={`+$${r.pHW}`} c={K.gn}/><RR l="Conversion Rate" v={`${r.r}%`} c={parseFloat(r.r)>=70?K.gn:K.yl} b/>
      {S.meter(parseFloat(r.r),parseFloat(r.r)>=70?K.gn:parseFloat(r.r)>=50?K.yl:K.rd)}
      <BookCTA/>
      {parseFloat(r.g)>0&&bbCount>=3&&!bbUpsellDismissed&&(
        <div style={{marginTop:14,padding:12,background:`${K.pp}08`,border:`1px solid ${K.pp}30`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div><div style={{fontSize:11,fontWeight:700,color:K.pp}}>⚡ Track this win + get live arb alerts</div><div style={{fontSize:10,color:K.mt}}>VaultSparked — $24.99/mo · First 7 days free</div></div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{ window.location.hash='#/upgrade'; }} style={{padding:"4px 10px",background:K.pp,border:"none",borderRadius:4,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font}}>Upgrade →</button>
            <button onClick={()=>{try{localStorage.setItem('pg_upsell_bb_dismissed','1');}catch{}setBbUpsellDismissed(true);}} style={{padding:"4px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>Dismiss</button>
          </div>
        </div>
      )}
      {parseFloat(r.g)>0&&!showShareCard&&(
        <button onClick={()=>setShowShareCard(true)} style={{marginTop:8,width:'100%',padding:'7px 0',background:'transparent',border:'1px dashed #4ade80',color:'#4ade80',borderRadius:6,cursor:'pointer',fontSize:12}}>
          🎉 Share your win
        </button>
      )}
      {showShareCard&&parseFloat(r.g)>0&&(
        <ShareCard
          title="Bonus Bet Converter"
          profit={`$${r.g}`}
          onClose={()=>setShowShareCard(false)}
        />
      )}
    </div>}
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
  const [mem, setMem] = useCalcMemory('profit-boost', {s:"50",o:"+200",bp:"50",mx:"250",ho:"-220"});
  const {s,o,bp,mx,ho} = mem;
  const setS=v=>setMem('s',v),setO=v=>setMem('o',v),setBp=v=>setMem('bp',v),setMx=v=>setMem('mx',v),setHo=v=>setMem('ho',v);
  const r = useMemo(()=>calcBoost(parseFloat(s),o,parseFloat(bp),mx,ho),[s,o,bp,mx,ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(()=>{ try{return JSON.parse(localStorage.getItem('pg_hist_profit-boost')||'[]');}catch{return[];} });
  useEffect(()=>{
    if(!r||!parseFloat(r.g)) return;
    const entry={ts:Date.now(),s,o,bp,mx,ho,profit:r.g,hs:r.hs};
    setHist(prev=>{
      const next=[entry,...prev].slice(0,20);
      try{localStorage.setItem('pg_hist_profit-boost',JSON.stringify(next));}catch{}
      return next;
    });
  },[r?.g,r?.hs]);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has('demo'));
  const [rCopied, setRCopied] = useState(false);
  const [showShareCardPB, setShowShareCardPB] = useState(false);
  const applyDemo = () => { setS("50"); setO("-110"); setBp("25"); setMx("10"); setHo("-110"); setDemoMode(true); };
  const copyResult = () => {
    if(!r) return;
    const text = `📊 Profit Boost Converter — PromoGrind\nStake: $${s} | Odds: ${o} | Boost: ${bp}% | Max: $${mx} | Hedge Odds: ${ho}\nEffective Boosted Odds: ${r.eo}\nHedge Amount: $${r.hs}\nGuaranteed Profit: $${r.g}\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setRCopied(true); setTimeout(()=>setRCopied(false),1500);
  };
  return (<div><div style={S.card}><Tl t="Profit Boost Converter" badge="DAILY RECURRING $$$" bc={K.yl} shareable getParams={()=>({s,o,bp,mx,ho})}/>
    <div style={S.row}><In l="Your Stake (cash)" v={s} set={setS} pre="$" ph="50"/><In l="Original Odds" v={o} set={setO} ph="+200"/><In l="Boost Percentage" v={bp} set={setBp} ph="50"/></div>
    <div style={S.row}><In l="Max Extra Winnings" v={mx} set={setMx} pre="$" ph="250"/><In l="Hedge Odds (other book)" v={ho} set={setHo} ph="-220"/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <button onClick={()=>{setS("50");setO("+200");setBp("50");setMx("25");setHo("-220");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font}}>★ Show Example</button>
      <button onClick={()=>demoMode?setDemoMode(false):applyDemo()} style={{padding:"4px 10px",background:demoMode?`${K.gn}15`:`${K.gn}08`,border:`1px solid ${demoMode?K.gn:K.gn+'30'}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>▶ Demo</button>
      <span style={{fontSize:10,color:K.mt}}>$50 stake, 50% boost capped at $25, hedge at -220</span>
    </div>
    {demoMode&&<div style={{...S.note(K.ac),marginBottom:12}}>
      <div style={{fontWeight:700,marginBottom:4}}>Step-by-step demo</div>
      <div>Step 1: FanDuel gave you a 25% profit boost (max $10).</div>
      <div>Step 2: Bet $50 on Chiefs -110.</div>
      <div>Step 3: Hedge ${r?r.hs:'~'} on the other side.</div>
      <div>Step 4: Lock in ~${r?r.g:'~'} profit.</div>
      <button onClick={()=>setDemoMode(false)} style={{marginTop:6,background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:10,padding:0,textDecoration:"underline"}}>✕ Exit Demo</button>
    </div>}
    {hist.length>0&&<div style={{marginBottom:8,display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setShowHist(h=>!h)} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:9,cursor:"pointer",fontFamily:font}}>🕐 History ({hist.length})</button></div>}
    {showHist&&hist.length>0&&<div style={{marginBottom:12,padding:10,background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,maxHeight:180,overflowY:"auto"}}>
      <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Last {hist.length} Calculations</div>
      {hist.map((h,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.dm,padding:"3px 0",borderBottom:i<hist.length-1?`1px solid ${K.bd}`:"none"}}>
        <span>${h.s} @ {h.o} +{h.bp}% boost</span>
        <span style={{color:K.gn,fontWeight:600}}>+${h.profit}</span>
        <span style={{color:K.mt}}>{new Date(h.ts).toLocaleDateString()}</span>
      </div>)}
    </div>}
    {r&&<div style={S.res(parseFloat(r.g)>0)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(parseFloat(r.g)>0?K.gn:K.rd)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>guaranteed profit</span><button onClick={copyResult} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:rCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>📋 {rCopied?"Copied!":"Copy"}</button></div>
      <RR l="Effective Boosted Odds" v={`${r.eo} (${r.ed2} decimal)`} c={K.pp} b/><RR l="Boost Value Added" v={`+$${r.bv}`} c={K.yl}/><RR l="Total Boosted Payout (if win)" v={`$${r.tp}`}/><RR l="Hedge Amount (real cash)" v={`$${r.hs}`} c={K.ac} b/><RR l="If Boosted Bet Wins" v={`+$${r.pBW}`} c={K.gn}/><RR l="If Hedge Wins" v={`+$${r.pHW}`} c={K.gn}/>
      <Nt c={K.yl}>This is your long-term money machine. Sportsbooks offer 2-5 boosts daily. At $5-$15 profit per boost × 30 days = $300-$1,000/month recurring.</Nt>
      <BookCTA/>
      {parseFloat(r.g)>0&&!showShareCardPB&&(
        <button onClick={()=>setShowShareCardPB(true)} style={{marginTop:8,width:'100%',padding:'7px 0',background:'transparent',border:'1px dashed #4ade80',color:'#4ade80',borderRadius:6,cursor:'pointer',fontSize:12}}>
          🎉 Share your win
        </button>
      )}
      {showShareCardPB&&parseFloat(r.g)>0&&(
        <ShareCard
          title="Profit Boost Calculator"
          profit={`$${r.g}`}
          onClose={()=>setShowShareCardPB(false)}
        />
      )}
    </div>}
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
  const [mem,setMem]=useCalcMemory('first-bet',{s:"500",o:"+150",ho:"-170"});
  const {s,o,ho}=mem;
  const setS=v=>setMem('s',v),setO=v=>setMem('o',v),setHo=v=>setMem('ho',v);
  const r = useMemo(()=>calcFirst(parseFloat(s),o,ho),[s,o,ho]);
  const [showHist, setShowHist] = useState(false);
  const [hist, setHist] = useState(()=>{ try{return JSON.parse(localStorage.getItem('pg_hist_first-bet')||'[]');}catch{return[];} });
  useEffect(()=>{
    if(!r||!parseFloat(r.hs)) return;
    const entry={ts:Date.now(),s,o,ho,hs:r.hs,pOW:r.pOW,pHW:r.pHW};
    setHist(prev=>{
      const next=[entry,...prev].slice(0,20);
      try{localStorage.setItem('pg_hist_first-bet',JSON.stringify(next));}catch{}
      return next;
    });
  },[r?.hs,r?.pOW]);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).has('demo'));
  const [rCopied, setRCopied] = useState(false);
  const applyDemo = () => { setS("200"); setO("-110"); setHo("-110"); setDemoMode(true); };
  const copyResult = () => {
    if(!r) return;
    const text = `📊 First Bet Safety Net — PromoGrind\nFirst Bet Stake: $${s} | Your Odds: ${o} | Hedge Odds: ${ho}\nHedge Amount: $${r.hs}\nIf Original Wins: $${r.pOW} | If Hedge Wins: $${r.pHW}\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setRCopied(true); setTimeout(()=>setRCopied(false),1500);
  };
  return (<div><div style={S.card}><Tl t="First Bet Safety Net Hedge" badge="CASH BET" bc={K.ac} shareable getParams={()=>({s,o,ho})}/>
    <div style={S.row}><In l="First Bet Stake" v={s} set={setS} pre="$"/><In l="Your Odds" v={o} set={setO}/><In l="Hedge Odds" v={ho} set={setHo}/></div>
    <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <button onClick={()=>{setS("1000");setO("+120");setHo("-140");}} style={{padding:"4px 10px",background:`${K.ac}10`,border:`1px solid ${K.ac}30`,borderRadius:4,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font}}>★ Show Example</button>
      <button onClick={()=>demoMode?setDemoMode(false):applyDemo()} style={{padding:"4px 10px",background:demoMode?`${K.gn}15`:`${K.gn}08`,border:`1px solid ${demoMode?K.gn:K.gn+'30'}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>▶ Demo</button>
      <span style={{fontSize:10,color:K.mt}}>$1,000 BetMGM safety net at +120, hedge at -140</span>
    </div>
    {demoMode&&<div style={{...S.note(K.ac),marginBottom:12}}>
      <div style={{fontWeight:700,marginBottom:4}}>Step-by-step demo</div>
      <div>Step 1: BetMGM offers $200 first bet insurance.</div>
      <div>Step 2: Bet $200 on a near-even moneyline.</div>
      <div>Step 3: If it loses, you get $200 in bonus bets.</div>
      <div>Step 4: Convert those for ~${f(parseFloat(s)*0.7,0)} guaranteed.</div>
      <button onClick={()=>setDemoMode(false)} style={{marginTop:6,background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:10,padding:0,textDecoration:"underline"}}>✕ Exit Demo</button>
    </div>}
    {hist.length>0&&<div style={{marginBottom:8,display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setShowHist(h=>!h)} style={{padding:"3px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:9,cursor:"pointer",fontFamily:font}}>🕐 History ({hist.length})</button></div>}
    {showHist&&hist.length>0&&<div style={{marginBottom:12,padding:10,background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,maxHeight:180,overflowY:"auto"}}>
      <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Last {hist.length} Calculations</div>
      {hist.map((h,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.dm,padding:"3px 0",borderBottom:i<hist.length-1?`1px solid ${K.bd}`:"none"}}>
        <span>${h.s} @ {h.o}</span>
        <span style={{color:K.ac,fontWeight:600}}>hedge ${h.hs}</span>
        <span style={{color:K.mt}}>{new Date(h.ts).toLocaleDateString()}</span>
      </div>)}
    </div>}
    {r&&<div style={S.res(true)}><div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>${r.g}</span><span style={{fontSize:12,color:K.dm}}>from hedge math</span><button onClick={copyResult} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:rCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>📋 {rCopied?"Copied!":"Copy"}</button></div>
      <RR l="Hedge Amount" v={`$${r.hs}`} c={K.ac} b/><RR l="If Original Wins" v={`$${r.pOW}`} c={parseFloat(r.pOW)>=0?K.gn:K.rd}/><RR l="If Hedge Wins" v={`$${r.pHW}`} c={parseFloat(r.pHW)>=0?K.gn:K.rd}/>
      <Nt c={K.yl}>If your first bet LOSES → you get ${s} in bonus bets. Convert those at ~70% using the Bonus Bet tab = ~${f(parseFloat(s)*0.7,0)} more profit!</Nt>
      <BookCTA/></div>}
  </div>
  <Help entries={[
    ["Safety Net Promo","Books like BetMGM ($1,500), bet365 ($1,000), and BetRivers ($500) refund your first bet as bonus bets if it loses. This is different from a bonus bet — you're wagering your own real cash."],
    ["The Strategy","Place your first bet at Book A. Immediately hedge at Book B. If your bet wins: you profit from the hedge math. If it loses: you get bonus bets back, which you convert using the Bonus Bet Converter tab. Either outcome is profitable."],
    ["Why hedge immediately?","If you don't hedge, you're just gambling. The hedge locks in a small profit from the math, and MORE IMPORTANTLY, it means when you lose (and get the bonus bets), those bonus bets are pure profit to convert — you haven't actually lost anything."],
  ]}/></div>);
};

const NoVig = () => {
  const [mem,setMem]=useCalcMemory('no-vig',{o1:"-110",o2:"-110"});
  const {o1,o2}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v);
  const r = useMemo(()=>calcNV(o1,o2),[o1,o2]);
  return (<div><div style={S.card}><Tl t="No-Vig Fair Odds Calculator" badge="DEVIG" bc={K.pp} shareable/>
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

const NoVig3Way = () => {
  const [mem,setMem]=useCalcMemory('no-vig-3way',{o1:"+220",o2:"+250",o3:"+300"});
  const {o1,o2,o3}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setO3=v=>setMem('o3',v);
  const r = useMemo(()=>calcNV3(o1,o2,o3),[o1,o2,o3]);
  return (<div><div style={S.card}><Tl t="3-Way No-Vig Calculator" badge="SOCCER / HOCKEY" bc={K.pp} shareable/>
    <div style={S.row}><In l="Home Win Odds" v={o1} set={setO1} ph="+220"/><In l="Draw Odds" v={o2} set={setO2} ph="+250"/><In l="Away Win Odds" v={o3} set={setO3} ph="+300"/></div>
    {r&&<div style={S.res(true)}>
      <RR l="Total Vig (Juice)" v={`${r.v}%`} c={K.rd} b/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12}}>
        {[["Home Win",r.ip1,r.fp1,r.fo1],[" Draw",r.ip2,r.fp2,r.fo2],["Away Win",r.ip3,r.fp3,r.fo3]].map(([label,ip,fp,fo])=>(
          <div key={label} style={{padding:"10px",background:K.s3,borderRadius:6}}>
            <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",marginBottom:6}}>{label}</div>
            <div style={{fontSize:16,fontWeight:700,color:K.pp,marginBottom:4}}>{fo}</div>
            <div style={{fontSize:10,color:K.gn}}>True: {fp}%</div>
            <div style={{fontSize:10,color:K.mt}}>Book: {ip}%</div>
          </div>
        ))}
      </div>
      <Nt c={K.ac}>These are the fair odds with zero vig. If any book offers BETTER than these fair odds on any outcome, that bet is +EV.</Nt>
    </div>}
  </div>
  <Help entries={[
    ["3-Way Markets","Soccer and hockey regulation time have 3 outcomes: Home Win, Draw, Away Win. Standard No-Vig only handles 2-way markets — this version correctly removes vig from all three simultaneously."],
    ["How to use","Enter the lines from a sharp sportsbook (Pinnacle, Circa, or average of 5+ major books). The fair odds become your benchmark. Check other books for better prices."],
    ["Draw pricing","The draw is typically the hardest outcome to price accurately, creating the most +EV opportunities in 3-way markets. Sharp bettors pay particular attention to draw pricing."],
  ]}/></div>);
};

const PlusEV = () => {
  const [mem,setMem]=useCalcMemory('ev',{yo:"+120",fo:"+105",s:"100"});
  const {yo,fo,s}=mem;
  const setYo=v=>setMem('yo',v),setFo=v=>setMem('fo',v),setS=v=>setMem('s',v);
  const r = useMemo(()=>calcEV(yo,fo,parseFloat(s)),[yo,fo,s]);
  return (<div><div style={S.card}><Tl t="Expected Value Calculator" badge="+EV" bc={K.gn} shareable/>
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
  const [mem,setMem]=useCalcMemory('arb-2way',{o1:"+110",o2:"+105",t:"500"});
  const {o1,o2,t}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setT=v=>setMem('t',v);
  const r = useMemo(()=>calcArb2(o1,o2,parseFloat(t)),[o1,o2,t]);
  const [rCopied, setRCopied] = useState(false);
  const [showShareCardArb, setShowShareCardArb] = useState(false);
  const arbIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };
  const [showArbTrigger, setShowArbTrigger] = useState(() => {
    try {
      const log = JSON.parse(localStorage.getItem('pg_usage_log') || '{}');
      const arbCount = (log['arb-2way'] || 0) + (log['arb-3way'] || 0);
      return arbCount >= 5 && shouldShowTrigger('arb_upsell') && !arbIsPro();
    } catch { return false; }
  });
  const copyResult = () => {
    if(!r||!r.ok) return;
    const text = `📊 2-Way Arbitrage — PromoGrind\nOutcome 1: ${o1} | Outcome 2: ${o2} | Total Stake: $${t}\nStake Side 1: $${r.s1} | Stake Side 2: $${r.s2}\nARB Profit: +$${r.pr} | ROI: ${r.roi}%\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setRCopied(true); setTimeout(()=>setRCopied(false),1500);
  };
  return (<div><div style={S.card}><Tl t="2-Way Arbitrage" badge="SUREBET" bc={K.pp} shareable/>
    {showArbTrigger && (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'linear-gradient(90deg,#1e3a2f,#0f1724)',border:'1px solid #4ade80',borderRadius:8,marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:13,color:'#cbd5e1'}}>⚡ <strong style={{color:'#4ade80'}}>The Live Scanner</strong> finds these arb opportunities automatically in real time.</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <a href="#/upgrade" style={{padding:'5px 12px',background:'#4ade80',color:'#0a0e17',borderRadius:5,fontSize:12,fontWeight:700,textDecoration:'none'}}>Try Free →</a>
          <button onClick={() => dismissTrigger('arb_upsell', setShowArbTrigger)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:16}}>×</button>
        </div>
      </div>
    )}
    <div style={S.row}><In l="Outcome 1 (Book A)" v={o1} set={setO1}/><In l="Outcome 2 (Book B)" v={o2} set={setO2}/><In l="Total Stake" v={t} set={setT} pre="$"/></div>
    {r&&<div style={S.res(r.ok)}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?`ARB: +$${r.pr}`:"NO ARB"}</span>{r.ok&&<button onClick={copyResult} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:rCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>📋 {rCopied?"Copied!":"Copy"}</button>}</div>
      {r.ok&&<><RR l="Stake Side 1" v={`$${r.s1}`} c={K.ac} b/><RR l="Stake Side 2" v={`$${r.s2}`} c={K.ac} b/><RR l="ROI" v={`${r.roi}%`} c={K.gn}/></>}
      {!r.ok&&<Nt c={K.rd}>No arb exists. Both sides need + odds at different books. Typical arb margins are 1-5%. Use OddsJam or BetBurger to scan automatically.</Nt>}
      {r.ok&&!showShareCardArb&&<button onClick={()=>setShowShareCardArb(true)} style={{marginTop:10,width:'100%',padding:'7px 0',background:'transparent',border:'1px dashed #c084fc',color:'#c084fc',borderRadius:6,cursor:'pointer',fontSize:12}}>🎉 Share this arb</button>}
      {r.ok&&showShareCardArb&&<ShareCard title="2-Way Arbitrage" profit={`+$${r.pr} (${r.roi}% ROI)`} onClose={()=>setShowShareCardArb(false)}/>}
    </div>}
  </div>
  <Help entries={[
    ["Arbitrage","Betting both sides of the same event at different sportsbooks where the combined odds guarantee a profit. It works because different books set different odds. When the gap is big enough, you can bet both sides and win no matter what."],
    ["How to spot one","You need both sides to be + odds (or the implied probabilities to add up to LESS than 100%). Example: Book A has Team 1 at +110, Book B has Team 2 at +105. Each side implies ~48.8% and ~48.8% = 97.6% total. The missing 2.4% is your profit."],
    ["Why it's rare","Books monitor each other and adjust quickly. Arb opportunities last seconds to minutes. That's why people use scanning tools — humans can't check fast enough."],
  ]}/></div>);
};

const Arb3Way = () => {
  const [mem,setMem]=useCalcMemory('arb-3way',{o1:"+180",o2:"+250",o3:"+320",t:"500"});
  const {o1,o2,o3,t}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setO3=v=>setMem('o3',v),setT=v=>setMem('t',v);
  const r = useMemo(()=>calcArb3(o1,o2,o3,parseFloat(t)),[o1,o2,o3,t]);
  return (<div><div style={S.card}><Tl t="3-Way Arbitrage" badge="SOCCER / HOCKEY" bc={K.pp} shareable/>
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
  const [mem,setMem]=useCalcMemory('parlay-hedge',{pp:"2500",ho:"+150",os:"25"});
  const {pp,ho,os}=mem;
  const setPp=v=>setMem('pp',v),setHo=v=>setMem('ho',v),setOs=v=>setMem('os',v);
  const r = useMemo(()=>calcPH(parseFloat(pp),ho,parseFloat(os)),[pp,ho,os]);
  return (<div><div style={S.card}><Tl t="Parlay Hedge" badge="LAST LEG" bc={K.yl} shareable/>
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
  const [mem,setMem]=useCalcMemory('middle',{o1:"-110",o2:"-110",l1:"220.5",l2:"200.5",s:"100"});
  const {o1,o2,l1,l2,s}=mem;
  const setO1=v=>setMem('o1',v),setO2=v=>setMem('o2',v),setL1=v=>setMem('l1',v),setL2=v=>setMem('l2',v),setS=v=>setMem('s',v);
  const r = useMemo(()=>calcMid(o1,o2,l1,l2,parseFloat(s)),[o1,o2,l1,l2,s]);
  return (<div><div style={S.card}><Tl t="Middle Bet Calculator" badge="MIDDLE" bc={K.ac} shareable/>
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
  const [mem,setMem]=useCalcMemory('odds-convert',{v:"-110",mode:"american"});
  const {v,mode}=mem;
  const setV=x=>setMem('v',x),setMode=x=>setMem('mode',x);
  const dec = mode==="american"?toD(v):mode==="decimal"?parseFloat(v):(()=>{const[n,d]=v.split("/").map(Number);return d?n/d+1:0;})();
  return (<div><div style={S.card}><Tl t="Odds Format Converter" badge="UTILITY" bc={K.dm} shareable/>
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
  const [mem,setMem]=useCalcMemory('rollover',{b:"500",m:"5",v:"4.5"});
  const {b,m,v}=mem;
  const setB=x=>setMem('b',x),setM=x=>setMem('m',x),setV=x=>setMem('v',x);
  const r = useMemo(()=>calcRO(b,m,v),[b,m,v]);
  return (<div><div style={S.card}><Tl t="Rollover / Playthrough Calculator" badge="DEPOSIT MATCH" bc={K.yl} shareable/>
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

const DepositMatch = () => {
  const [mem,setMem]=useCalcMemory('deposit-match',{dep:"1000",pct:"20",mx:"200",ro:"5",vg:"4.5"});
  const {dep,pct,mx,ro,vg}=mem;
  const setDep=x=>setMem('dep',x),setPct=x=>setMem('pct',x),setMx=x=>setMem('mx',x),setRo=x=>setMem('ro',x),setVg=x=>setMem('vg',x);
  const r = useMemo(()=>calcDeposit(dep,pct,mx,ro,vg),[dep,pct,mx,ro,vg]);
  return (<div><div style={S.card}><Tl t="Deposit Match Calculator" badge="RELOAD BONUS" bc={K.yl} shareable/>
    <div style={S.row}><In l="Your Deposit" v={dep} set={setDep} pre="$" ph="1000"/><In l="Match %" v={pct} set={setPct} ph="20"/><In l="Max Bonus $" v={mx} set={setMx} pre="$" ph="200"/></div>
    <div style={S.row}><In l="Rollover (x)" v={ro} set={setRo} ph="5"/><In l="Avg Vig %" v={vg} set={setVg} ph="4.5"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.net}</span><span style={{fontSize:12,color:K.dm}}>net bonus value</span></div>
      <RR l="Bonus You Receive" v={`$${r.bonus}`} c={K.yl} b/><RR l="Total Must Wager" v={`$${r.tw}`}/><RR l="Vig Cost to Clear" v={`-$${r.cost}`} c={K.rd}/><RR l="Net Bonus Value" v={`${r.ok?"+":""}$${r.net}`} c={r.ok?K.gn:K.rd} b/><RR l="ROI on Deposit" v={`${r.roi}%`} c={r.ok?K.gn:K.yl}/>
      {!r.fill&&<Nt c={K.yl}>Deposit ${r.minDep} to max this bonus — your ${f(parseFloat(dep),0)} only captures ${r.bonus} of the ${mx} max.</Nt>}
      {r.fill&&<Nt c={K.gn}>You are depositing enough to capture the full ${mx} bonus.</Nt>}
      <Nt c={r.ok?K.gn:K.rd}>{r.ok?"Worth clearing. Bet low-vig markets (spreads/totals at -110) to minimize cost.":"High rollover or vig makes this bonus unprofitable. Consider skipping."}</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Deposit Match","The sportsbook adds bonus funds equal to a percentage of your deposit. A '20% match up to $200' on a $1,000 deposit gives you $200 in bonus funds."],
    ["Rollover","Before withdrawing the bonus, you must wager a multiple of it. 5x on $200 means placing $1,000 in bets total. Each bet loses a small amount to vig."],
    ["Vig Cost","At 4.5% vig, clearing $1,000 in bets costs ~$45. Minimize this by betting NFL spreads, NBA totals, and main lines at -110/-110."],
    ["Minimum deposit","To capture the full max bonus: deposit at least Max Bonus ÷ Match%. For 20% up to $200, you need to deposit $1,000."],
    ["When to skip","Rollover of 10x+ or high-vig required markets means the clearing cost likely exceeds the bonus. This calculator shows you the break-even."],
  ]}/></div>);
};

const KellyCriterion = () => {
  const [mem,setMem]=useCalcMemory('kelly',{wp:"55",odds:"+110",br:"1000",frac:"25"});
  const {wp,odds,br,frac}=mem;
  const setWp=v=>setMem('wp',v),setOdds=v=>setMem('odds',v),setBr=v=>setMem('br',v),setFrac=v=>setMem('frac',v);
  const r = useMemo(()=>calcKelly(wp,odds,parseFloat(br),parseFloat(frac)/100),[wp,odds,br,frac]);
  const [rCopied, setRCopied] = useState(false);
  const copyResult = () => {
    if(!r) return;
    const text = `📊 Kelly Criterion — PromoGrind\nWin Probability: ${wp}% | Odds: ${odds} | Bankroll: $${br} | Kelly Fraction: ${frac}%\nRecommended Bet: $${r.bet}\nFull Kelly: ${r.k}% | Fractional Kelly: ${r.ak}%\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setRCopied(true); setTimeout(()=>setRCopied(false),1500);
  };
  return (<div><div style={S.card}><Tl t="Kelly Criterion Bet Sizer" badge="+EV SIZING" bc={K.gn} shareable/>
    <div style={S.row}><In l="Win Probability %" v={wp} set={setWp} ph="55"/><In l="Odds" v={odds} set={setOdds} ph="+110"/><In l="Bankroll" v={br} set={setBr} pre="$" ph="1000"/><In l="Kelly Fraction %" v={frac} set={setFrac} ph="25"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>${r.bet}</span><span style={{fontSize:12,color:K.dm}}>recommended bet size</span><button onClick={copyResult} style={{marginLeft:"auto",padding:"2px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:rCopied?K.gn:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>📋 {rCopied?"Copied!":"Copy"}</button></div>
      <RR l="Full Kelly %" v={`${r.k}%`} c={K.dm}/><RR l={`${frac}% Fractional Kelly`} v={`${r.ak}%`} c={K.ac} b/><RR l="Bet Size" v={`$${r.bet}`} c={r.ok?K.gn:K.rd} b/><RR l="Expected Value" v={`${r.ok?"+":""}${r.ev}%`} c={r.ok?K.gn:K.rd}/>
      {!r.ok&&<Nt c={K.rd}>Kelly says skip this bet — your win probability does not support an edge at these odds.</Nt>}
      {r.ok&&<Nt c={K.yl}>Using {frac}% fractional Kelly. Full Kelly maximizes growth but has high variance. Most pros use 20–33% Kelly.</Nt>}
      {r.ok&&(()=>{
        const fracNum=parseFloat(frac);
        const riskLabel=fracNum<25?"Conservative — lower growth, minimal ruin risk":fracNum<=50?"Balanced — recommended for most bettors":fracNum<=75?"Aggressive — higher variance, 10-20% ruin risk":"Dangerous — high ruin probability";
        const riskColor=fracNum<25?K.gn:fracNum<=50?K.ac:fracNum<=75?K.yl:K.rd;
        const markerPct=Math.min(100,(fracNum-5)/95*100);
        const fracBet=f(parseFloat(br)*parseFloat(r.k)/100*fracNum/100);
        return (
          <div style={{marginTop:12,padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
            <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1px"}}>Fraction Risk Optimizer</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.mt,marginBottom:4}}><span>5%</span><span>100%</span></div>
            <div style={{position:"relative",height:8,background:`linear-gradient(to right,${K.gn},${K.yl},${K.rd})`,borderRadius:4,marginBottom:8}}>
              <div style={{position:"absolute",left:`calc(${markerPct}% - 4px)`,top:-2,width:12,height:12,borderRadius:"50%",background:"white",border:`2px solid ${riskColor}`}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:K.mt,marginBottom:8}}><span style={{color:K.gn}}>Low Ruin Risk</span><span style={{color:K.rd}}>High Ruin Risk</span></div>
            <div style={{fontSize:11,color:riskColor,fontWeight:600,marginBottom:4}}>{frac}% Kelly: {riskLabel}</div>
            <div style={{fontSize:11,color:K.dm}}>Bet at this fraction: ${fracBet}</div>
          </div>
        );
      })()}
    </div>}
  </div>
  <Help entries={[
    ["Kelly Criterion","A formula that tells you what percentage of your bankroll to bet given your edge. It maximizes long-term growth. Bet too little: sub-optimal growth. Bet too much: risk of ruin."],
    ["Win Probability","Your TRUE estimate of the bet winning — not the book's implied probability. Get this from the No-Vig calculator or sharp book consensus."],
    ["Fractional Kelly","Most professionals use 25–33% Kelly. Full Kelly has high variance — you can have long drawdowns even when profitable. Quarter-Kelly gives 75% of the growth with far less risk."],
    ["Edge required","If your win probability is below the book's implied probability, Kelly returns 0. Only bet when you have a genuine edge."],
    ["Bankroll","Your total allocated betting bankroll — not your life savings. Kelly only works correctly when staked against a consistent bankroll figure."],
  ]}/></div>);
};

const InsurancePromo = () => {
  const [mem,setMem]=useCalcMemory('insurance',{stake:"100",insPct:"100",insMax:"100",conv:"70"});
  const {stake,insPct,insMax,conv}=mem;
  const setStake=x=>setMem('stake',x),setInsPct=x=>setMem('insPct',x),setInsMax=x=>setMem('insMax',x),setConv=x=>setMem('conv',x);
  const r = useMemo(()=>calcInsurance(stake,insPct,insMax,conv),[stake,insPct,insMax,conv]);
  return (<div><div style={S.card}><Tl t="Promo Insurance Calculator" badge="SGP / PARLAY" bc={K.pp} shareable/>
    <div style={S.row}><In l="Your Stake" v={stake} set={setStake} pre="$" ph="100"/><In l="Insurance % of Stake" v={insPct} set={setInsPct} ph="100"/><In l="Max Insurance $" v={insMax} set={setInsMax} pre="$" ph="100"/><In l="Bonus Conversion %" v={conv} set={setConv} ph="70"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>${r.insVal}</span><span style={{fontSize:12,color:K.dm}}>insurance value (real cash)</span></div>
      <RR l="Insurance Bonus Amount" v={`$${r.insAmt}`} c={K.pp} b/><RR l="Bonus Value After Conversion" v={`$${r.insVal}`} c={K.gn} b/><RR l="Net Cost if Bet Loses" v={`$${r.netCost}`} c={parseFloat(r.netCost)<=5?K.gn:K.yl}/><RR l="Insurance Effectiveness" v={`${r.effPct}%`} c={parseFloat(r.effPct)>=60?K.gn:K.yl}/>
      <Nt c={K.ac}>If your insured bet loses: you get ${r.insAmt} back as a bonus bet. Convert that using the Bonus Bet tab (~{conv}%) = ${r.insVal} real cash. Your net loss is only ${r.netCost}.</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Insurance Promo","A sportsbook refunds part or all of your stake (as bonus bets) if your bet loses. Common forms: SGP Insurance (refund if 1 leg misses), Parlay Insurance, and Step-Up Parlays (tiered payouts by legs hit)."],
    ["Why it changes the math","Without insurance, a $100 loss costs $100. With 100% SGP insurance, you lose $100 but get $100 in bonus bets back — worth ~$70 after conversion. Net loss is only ~$30."],
    ["Insurance %","Some promos give 100% back, others give 50% or 25%. A '50% SGP insurance up to $50' on a $100 bet returns $50 as bonus if it loses."],
    ["Conversion Rate","Bonus bets are worth ~70% as real cash when converted using the Bonus Bet Calculator. Adjust if your lines are particularly good or bad."],
    ["vs. hedging","If you CAN hedge the bet, use the First Bet Hedge calculator for guaranteed profit. Insurance calcs are for bets you cannot hedge (SGPs, same-book parlays)."],
  ]}/></div>);
};

const TeaserCalc = () => {
  const [mem,setMem]=useCalcMemory('teaser',{legs:"2",tOdds:"-110",wp:"72"});
  const {legs,tOdds,wp}=mem;
  const setLegs=x=>setMem('legs',x),setTOdds=x=>setMem('tOdds',x),setWp=x=>setMem('wp',x);
  const r = useMemo(()=>calcTeaser(legs,tOdds,wp),[legs,tOdds,wp]);
  const presets = [["2-leg 6pt","-110"],["2-leg 6.5pt","-120"],["2-leg 7pt","-130"],["3-leg 6pt","+165"]];
  return (<div><div style={S.card}><Tl t="Teaser Calculator" badge="NFL / NBA" bc={K.ac} shareable/>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Legs</label><select style={S.input} value={legs} onChange={e=>setLegs(e.target.value)}>{["2","3","4","5"].map(n=><option key={n}>{n}</option>)}</select></div>
      <In l="Teaser Odds" v={tOdds} set={setTOdds} ph="-110"/>
      <In l="Win % Per Leg" v={wp} set={setWp} ph="72"/>
    </div>
    <div style={{marginBottom:12}}>
      <div style={{fontSize:10,color:K.mt,marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Quick Presets</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {presets.map(([label,odds])=>(
          <button key={label} onClick={()=>{const parts=label.split(' ');setLegs(parts[0][0]);setTOdds(odds);}} style={{padding:"4px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.dm,fontSize:10,cursor:"pointer",fontFamily:font}}>{label} ({odds})</button>
        ))}
      </div>
    </div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}{r.ev}%</span><span style={{fontSize:12,color:K.dm}}>expected value per $100</span></div>
      <RR l="Legs" v={legs}/><RR l="Combined Win Probability" v={`${r.combProb}%`} c={K.ac}/><RR l="Break-even Win % Per Leg" v={`${r.beProb}%`} c={K.yl}/><RR l="Payout (net odds)" v={`${r.payout}x`}/>
      {r.ok&&<Nt c={K.gn}>This teaser has positive EV at your estimated per-leg win rate. Make sure your estimate accounts for the line movement — teasers are only +EV when crossing key numbers (3 and 7 in NFL).</Nt>}
      {!r.ok&&<Nt c={K.rd}>At {wp}% per-leg win rate, this teaser is -EV. You need {r.beProb}% per leg to break even. Teasers crossing 3 and 7 in NFL can reach 72-76% per leg — otherwise avoid.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["Teaser","A parlay where you move the point spread/total in your favor by a set number of points (6, 6.5, or 7 in NFL) in exchange for worse payout odds. The extra points increase your per-leg win probability."],
    ["Key numbers in NFL","Margins of 3 and 7 are far more common than any other margin (field goal and touchdown). Crossing these numbers dramatically increases win probability. A team -7 becomes -1 in a 6-point teaser — this is the value."],
    ["When teasers are +EV","The classic strategy: 2-team 6pt teasers that cross both 3 and 7 on spreads (sides ranging from +1.5 to +2.5, or -7.5 to -8.5). Historical win rate for these legs is ~72-76%."],
    ["NBA teasers","Standard NBA teaser points are 4, 4.5, or 5. Key numbers matter less in basketball. Most NBA teasers are -EV — use with caution."],
  ]}/></div>);
};

const RoundRobinCalc = () => {
  const [picks, setPicks] = useState([{odds:"+150"},{odds:"+200"},{odds:"+175"}]);
  const [size, setSize] = useState("2");
  const [stakeEach, setStakeEach] = useState("50");
  const pickOdds = picks.map(p=>p.odds);
  const r = useMemo(()=>calcRR(pickOdds,size,stakeEach),[pickOdds,size,stakeEach]);
  const addPick = () => setPicks(p=>[...p,{odds:"+150"}]);
  const removePick = i => setPicks(p=>p.filter((_,j)=>j!==i));
  const updatePick = (i,v) => setPicks(p=>p.map((pk,j)=>j===i?{odds:v}:pk));
  return (<div><div style={S.card}><Tl t="Round Robin Calculator" badge="PARLAY" bc={K.yl} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Your Picks (enter odds for each)</label>
        <button onClick={addPick} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Pick</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {picks.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:K.mt}}>#{i+1}</span>
            <input style={{...S.input,width:80}} value={p.odds} onChange={e=>updatePick(i,e.target.value)} placeholder="+150"/>
            {picks.length>2&&<span onClick={()=>removePick(i)} style={{cursor:"pointer",color:K.rd,fontSize:11}}>✕</span>}
          </div>
        ))}
      </div>
    </div>
    <div style={S.row}>
      <div style={S.col}><label style={S.label}>Combo Size</label><select style={S.input} value={size} onChange={e=>setSize(e.target.value)}>{["2","3","4"].filter(n=>parseInt(n)<=picks.length).map(n=><option key={n}>{n}-team parlays</option>)}</select></div>
      <In l="Stake Per Combo" v={stakeEach} set={setStakeEach} pre="$" ph="50"/>
    </div>
    {r&&<div style={S.res(true)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>{r.nCombos}</span><span style={{fontSize:12,color:K.dm}}>combinations</span></div>
      <RR l="Total Stake" v={`$${r.totalStake}`} c={K.rd} b/><RR l="Best Case Payout" v={`$${r.maxPayout}`} c={K.gn}/><RR l="Worst Single Combo Payout" v={`$${r.minPayout}`}/><RR l="Average Payout Per Combo" v={`$${r.avgPayout}`} c={K.ac}/>
      <Nt c={K.yl}>A round robin protects against one or two picks losing — you win multiple smaller parlays instead of needing all picks to hit. Total stake: ${r.totalStake} ({r.nCombos} combos × ${stakeEach}).</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Round Robin","Instead of one big parlay, a round robin creates every possible smaller parlay from your pool of picks. If you have 4 picks and choose 2-team combos, you get 6 separate 2-team parlays (4 choose 2 = 6)."],
    ["Why use it","A standard 4-leg parlay requires all 4 to win. A round robin of 2-team parlays from those 4 picks means you profit even if only 2 or 3 of your picks hit."],
    ["Risk vs reward","You spend more total (6 × $50 = $300 vs $50 for one parlay) but you have multiple chances to profit. It is risk management for high-confidence multi-pick days."],
    ["Best use case","When you have 3-5 strong +EV opinions on a slate. Rather than going all-or-nothing, round robins monetize partial correctness."],
  ]}/></div>);
};

// ═══ PARLAY BUILDER ═══
const ParlayBuilder = () => {
  const [legs, setLegs] = useState([{odds:"+150"},{odds:"+200"},{odds:"+175"}]);
  const [stake, setStake] = useState("100");
  const legOdds = legs.map(l=>l.odds);
  const r = useMemo(()=>calcParlay(legOdds, stake),[legOdds,stake]);
  const addLeg = ()=>{ if(legs.length<8) setLegs(l=>[...l,{odds:"+150"}]); };
  const removeLeg = i => setLegs(l=>l.filter((_,j)=>j!==i));
  const updateLeg = (i,v) => setLegs(l=>l.map((lg,j)=>j===i?{odds:v}:lg));
  return (<div><div style={S.card}><Tl t="Parlay Builder" badge="MULTI-LEG" bc={K.yl} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Legs ({legs.length}/8) — enter any odds format</label>
        <button onClick={addLeg} disabled={legs.length>=8} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Leg</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {legs.map((lg,i)=>{
          const d=toD(lg.odds);
          const ip=d>1?f(1/d*100,1):null;
          const isFav=d>1&&d<2;
          return (<div key={i} style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:K.mt}}>Leg {i+1}</span>
              <input style={{...S.input,width:90,borderColor:isFav?`${K.rd}80`:undefined}} value={lg.odds} onChange={e=>updateLeg(i,e.target.value)} placeholder="+150"/>
              {isFav&&<span style={S.tag(K.rd)}>FAV</span>}
              {legs.length>2&&<span onClick={()=>removeLeg(i)} style={{cursor:"pointer",color:K.rd,fontSize:11,padding:"0 2px"}}>✕</span>}
            </div>
            {ip&&<div style={{fontSize:9,color:isFav?K.rd:K.mt,paddingLeft:40}}>{ip}% implied</div>}
          </div>);
        })}
      </div>
    </div>
    <div style={S.row}><In l="Stake" v={stake} set={setStake} pre="$" ph="100"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>${r.profit}</span><span style={{fontSize:12,color:K.dm}}>profit if hits</span></div>
      <RR l="Combined Odds" v={`${r.combA} (${r.combined}x)`} c={K.pp} b/>
      <RR l="Total Payout" v={`$${r.payout}`} c={K.gn}/>
      <RR l="True Win Probability" v={`${r.prob}%`} c={K.ac}/>
      <RR l="Expected Value" v={`${r.ok?"+":""}$${r.ev}`} c={r.ok?K.gn:K.rd} b/>
      <RR l="Implied Prob Sum (vig)" v={`${r.impSum}%`} c={parseFloat(r.impSum)>105?K.rd:K.yl}/>
      {!r.ok&&<Nt c={K.rd}>This parlay is -EV. The sportsbook&apos;s vig compounds across each leg — long parlays almost always favor the house.</Nt>}
      {r.ok&&<Nt c={K.gn}>This parlay has positive expected value. Verify each leg has a genuine edge using the +EV calculator first.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["How parlay odds compound","Each leg's odds multiply together. 3 legs at +150 (+150 = 2.5x decimal each) = 2.5 × 2.5 × 2.5 = 15.625x combined. Bet $100, payout $1,562.50. But the house takes vig on EVERY leg — it compounds against you."],
    ["True win probability","True probability = product of each leg's no-vig probability. This is always lower than the implied probabilities suggest because book prices include vig."],
    ["When parlays are +EV","Almost never in traditional sportsbooks. The exception: when individual legs have genuine +EV edges. If every leg is +EV, the parlay can be +EV. If any leg is -EV, it drags the whole parlay down."],
    ["Round robin alternative","Instead of one 4-leg parlay, try a round robin of 2-team parlays from your pool. Wins more often, less volatile. See the Round Robin tab."],
  ]}/></div>);
};

// ═══ SGP EV ESTIMATOR ═══
const SGPEstimator = () => {
  const [legs, setLegs] = useState([{odds:"+200"},{odds:"+150"},{odds:"-110"}]);
  const [sgpOdds, setSgpOdds] = useState("+450");
  const [stake, setStake] = useState("50");
  const r = useMemo(()=>calcSGP(legs.map(l=>l.odds),sgpOdds,stake),[legs,sgpOdds,stake]);
  const addLeg = ()=>{ if(legs.length<4) setLegs(l=>[...l,{odds:"+150"}]); };
  const removeLeg = i => setLegs(l=>l.filter((_,j)=>j!==i));
  const updateLeg = (i,v) => setLegs(l=>l.map((lg,j)=>j===i?{odds:v}:lg));
  return (<div><div style={S.card}><Tl t="SGP EV Estimator" badge="SAME-GAME PARLAY" bc={K.pp} shareable/>
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <label style={S.label}>Individual leg odds (assume independent)</label>
        <button onClick={addLeg} disabled={legs.length>=4} style={{padding:"3px 10px",background:K.s3,border:`1px solid ${K.bd2}`,borderRadius:4,color:K.gn,fontSize:10,cursor:"pointer",fontFamily:font}}>+ Leg</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {legs.map((lg,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:K.mt}}>Leg {i+1}</span>
            <input style={{...S.input,width:90}} value={lg.odds} onChange={e=>updateLeg(i,e.target.value)} placeholder="+150"/>
            {legs.length>2&&<span onClick={()=>removeLeg(i)} style={{cursor:"pointer",color:K.rd,fontSize:11,padding:"0 2px"}}>✕</span>}
          </div>
        ))}
      </div>
    </div>
    <div style={S.row}>
      <In l="Book's SGP Odds" v={sgpOdds} set={setSgpOdds} ph="+450"/>
      <In l="Stake" v={stake} set={setStake} pre="$" ph="50"/>
    </div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(r.ok?K.gn:K.rd)}>{r.ok?"+":""}${r.ev}</span><span style={{fontSize:12,color:K.dm}}>expected value</span></div>
      <RR l="Independent Parlay Odds (fair)" v={`${r.indOdds} (${r.indD}x)`} c={K.ac}/>
      <RR l="Book's SGP Odds" v={`${sgpOdds} (${r.sgpD}x)`} c={K.tx}/>
      <RR l="SGP Discount vs Fair" v={`${r.discount}%`} c={parseFloat(r.discount)>20?K.rd:parseFloat(r.discount)>10?K.yl:K.gn} b/>
      <RR l="True Win Probability" v={`${r.prob}%`} c={K.dm}/>
      {parseFloat(r.discount)>25&&<Nt c={K.rd}>This SGP is priced 25%+ below fair value. The book is heavily discounting for leg correlation. Look for better-priced SGPs or use the individual legs separately.</Nt>}
      {parseFloat(r.discount)<=10&&r.ok&&<Nt c={K.gn}>Low discount — this SGP is priced close to fair value with positive EV. Rare. Consider placing it.</Nt>}
    </div>}
  </div>
  <Help entries={[
    ["Why SGPs are usually overpriced (for the book)","An SGP combines correlated legs (e.g. QB passing yards + WR receiving yards). Books know they're correlated so they reduce the payout from what a true independent parlay would pay. The average SGP discount vs. fair value is 15-30%."],
    ["Independent parlay assumption","This calculator assumes your legs are statistically independent for the 'fair' calculation. If legs are positively correlated (QB TDs + WR yards on same game), the true fair odds are actually LOWER than this shows. If negatively correlated, they'd be higher."],
    ["When SGPs are worth it","Almost never at standard books. The exception: books sometimes offer SGP boosts (e.g. '20% SGP boost') which can overcome the discount. Plug in the boosted odds to see if it creates positive EV."],
  ]}/></div>);
};

// ═══ HOLD CALCULATOR ═══
const HoldCalc = () => {
  const [mem,setMem]=useCalcMemory('hold-calc',{o1:"-110",o2:"-110"});
  const {o1,o2}=mem;
  const setO1=x=>setMem('o1',x),setO2=x=>setMem('o2',x);
  const r = useMemo(()=>calcHold(o1,o2),[o1,o2]);
  const grade = r ? (parseFloat(r.hold)<3?"SHARP":parseFloat(r.hold)<5?"FAIR":parseFloat(r.hold)<8?"HIGH":"AVOID") : null;
  const gradeColor = r ? (parseFloat(r.hold)<3?K.gn:parseFloat(r.hold)<5?K.ac:parseFloat(r.hold)<8?K.yl:K.rd) : K.mt;
  return (<div><div style={S.card}><Tl t="Book Hold Calculator" badge="VIG DETECTOR" bc={K.dm} shareable/>
    <div style={S.row}><In l="Side 1 Odds" v={o1} set={setO1} ph="-110"/><In l="Side 2 Odds" v={o2} set={setO2} ph="-110"/></div>
    {r&&<div style={S.res(r.ok)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(gradeColor)}>{r.hold}%</span><span style={{fontSize:12,color:K.dm}}>book hold</span><span style={S.tag(gradeColor)}>{grade}</span></div>
      <RR l="Side 1 Implied Probability" v={`${r.ip1}%`} c={K.dm}/>
      <RR l="Side 2 Implied Probability" v={`${r.ip2}%`} c={K.dm}/>
      <RR l="Total (should be 100% for fair)" v={`${f(parseFloat(r.ip1)+parseFloat(r.ip2),1)}%`} c={K.yl}/>
      <RR l="Overround (hold)" v={`${r.hold}%`} c={gradeColor} b/>
      <Nt c={gradeColor}>
        {parseFloat(r.hold)<3?"Sharp book pricing — minimal vig. Great line to bet.":
         parseFloat(r.hold)<5?"Fair vig. Standard -110/-110 spread pricing.":
         parseFloat(r.hold)<8?"Above-average hold. Consider shopping other books.":
         "High hold. This book is overcharging significantly. Skip unless no other options."}
      </Nt>
    </div>}
  </div>
  <Help entries={[
    ["Book Hold","The total percentage the sportsbook profits from both sides of a bet. At -110/-110, each side has 52.4% implied probability — 104.8% total. The extra 4.8% is the hold. Whatever you bet, the book keeps 4.8 cents per dollar wagered long-term."],
    ["Sharp books (hold < 3%)","Pinnacle, Circa, and some offshore books run <3% hold. Sharp bettors love these because more of your edge translates to actual profit."],
    ["Retail books (hold 4.5-6%)","DraftKings, FanDuel, BetMGM typically run 4.5-5.5% hold on main lines. Player props and live betting are often 8-15% hold — much worse."],
    ["Use this to compare books","Enter the same game at two different books. The one with lower hold is charging you less for the same bet. Over hundreds of bets, this is meaningful."],
  ]}/></div>);
};

// ═══ BET SIZING ADVISOR ═══
const BetSizingAdvisor = () => {
  const [mem,setMem]=useCalcMemory('bet-sizer',{bankroll:"1000",numBets:"5",avgEdge:"3",style:"quarter-kelly"});
  const {bankroll,numBets,avgEdge,style}=mem;
  const setBankroll=x=>setMem('bankroll',x),setNumBets=x=>setMem('numBets',x),setAvgEdge=x=>setMem('avgEdge',x),setStyle=x=>setMem('style',x);
  const br=parseFloat(bankroll)||0, nb=parseInt(numBets)||1, edge=parseFloat(avgEdge)/100;
  const kellyPct = edge>0 ? Math.min(edge,0.25) : 0;
  const kellyAmt = br*kellyPct;
  const qkAmt = kellyAmt*0.25;
  const current = style==="flat"?br*0.01:style==="half-kelly"?kellyAmt*0.5:style==="quarter-kelly"?qkAmt:kellyAmt;
  const totalRisk = current*nb;
  const riskPct = br>0?f(totalRisk/br*100,1):0;
  return (<div><div style={S.card}><Tl t="Bet Sizing Advisor" badge="BANKROLL" bc={K.ac} shareable/>
    <div style={S.row}>
      <In l="Total Bankroll" v={bankroll} set={setBankroll} pre="$" ph="1000"/>
      <In l="Concurrent Bets" v={numBets} set={setNumBets} ph="5"/>
      <In l="Avg Edge %" v={avgEdge} set={setAvgEdge} ph="3"/>
      <div style={S.col}><label style={S.label}>Sizing Style</label><select style={S.input} value={style} onChange={e=>setStyle(e.target.value)}>
        <option value="flat">Flat 1%</option>
        <option value="quarter-kelly">Quarter Kelly</option>
        <option value="half-kelly">Half Kelly</option>
        <option value="full-kelly">Full Kelly</option>
      </select></div>
    </div>
    {br>0&&<div style={S.res(parseFloat(riskPct)<30)}>
      <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.ac)}>${f(current)}</span><span style={{fontSize:12,color:K.dm}}>per bet ({style})</span></div>
      <RR l="Flat 1% of bankroll" v={`$${f(br*0.01)}`} c={K.dm}/>
      <RR l="Quarter Kelly (recommended)" v={`$${f(qkAmt)}`} c={K.gn}/>
      <RR l="Half Kelly" v={`$${f(kellyAmt*0.5)}`} c={K.yl}/>
      <RR l="Full Kelly" v={`$${f(kellyAmt)}`} c={K.rd}/>
      <RR l={`${nb} bets at ${style}`} v={`$${f(totalRisk)} (${riskPct}% of bankroll)`} c={parseFloat(riskPct)>30?K.rd:K.ac} b/>
      <Nt c={parseFloat(riskPct)>30?K.rd:K.gn}>
        {parseFloat(riskPct)>30?"You have more than 30% of bankroll at risk simultaneously. High drawdown risk. Reduce bet count or size.":
        "Risk level is healthy. Less than 30% of bankroll across all open bets."}
      </Nt>
    </div>}
  </div>
  <Help entries={[
    ["Flat betting","Bet the same dollar amount every time (1-2% of bankroll). Simple, safe, and appropriate when you're not sure of your exact edge. 1% means you can lose 100 straight bets before busting."],
    ["Kelly Criterion","Bets a percentage proportional to your edge. Maximum long-term growth but high variance. Full Kelly can cause -50% drawdowns even when profitable."],
    ["Quarter Kelly (recommended)","The industry standard. Gives 75% of Full Kelly growth with dramatically lower variance. Most professional +EV bettors use 20-33% of Kelly."],
    ["Concurrent bets","Keep total risk under 20-30% of bankroll across all open positions. If you have 10 open bets at 5% each, you're risking 50% of your bankroll simultaneously — one bad day can be devastating."],
  ]}/></div>);
};

// ═══ LINE SHOPPING ═══
const LineShop = () => {
  const bookNames = BOOKS.map(b=>b.name);
  const [odds, setOdds] = useState(() => Object.fromEntries(bookNames.map(n=>[n,''])));
  const [label, setLabel] = useState('');
  const entries = bookNames.map(n=>({name:n,odds:odds[n],color:BOOKS.find(b=>b.name===n)?.color||'#60a5fa'})).filter(e=>e.odds&&toD(e.odds)>1);
  const best = entries.length ? entries.reduce((b,e)=>toD(e.odds)>toD(b.odds)?e:b) : null;
  const nvOdds = entries.length>=2 ? (()=>{ const probs=entries.map(e=>1/toD(e.odds)); const avg=probs.reduce((s,p)=>s+p,0)/probs.length; return toA(1/avg); })() : null;
  return (<div><div style={S.card}><Tl t="Line Shopping" badge="BEST ODDS FINDER" bc={K.gn} shareable/>
    <div style={S.row}><div style={{flex:2,minWidth:200}}><label style={S.label}>Game / Event (optional)</label><input style={S.input} value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Chiefs vs Bills — Moneyline Chiefs"/></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginBottom:12}}>
      {bookNames.map(n=>{
        const isBest=best?.name===n;
        return (<div key={n} style={{padding:"10px",background:isBest?`${K.gn}10`:K.s2,border:`1px solid ${isBest?K.gn:K.bd2}`,borderRadius:6}}>
          <div style={{fontSize:10,color:isBest?K.gn:K.mt,fontWeight:isBest?700:400,marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>{n}{isBest&&" ★"}</div>
          <input style={{...S.input,padding:"5px 8px",fontSize:12}} value={odds[n]} onChange={e=>setOdds(o=>({...o,[n]:e.target.value}))} placeholder="e.g. -110"/>
        </div>);
      })}
    </div>
    {entries.length>=2&&<div style={S.res(true)}>
      {best&&<div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}><span style={S.big(K.gn)}>{best.odds}</span><span style={{fontSize:12,color:K.dm}}>best odds at {best.name}</span></div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
        {entries.sort((a,b)=>toD(b.odds)-toD(a.odds)).map(e=>(
          <div key={e.name} style={{padding:"6px 12px",background:e.name===best?.name?`${K.gn}15`:K.s3,border:`1px solid ${e.name===best?.name?K.gn:K.bd2}`,borderRadius:6}}>
            <div style={{fontSize:11,fontWeight:600,color:e.name===best?.name?K.gn:K.tx}}>{e.odds}</div>
            <div style={{fontSize:9,color:K.mt}}>{e.name}</div>
          </div>
        ))}
      </div>
      {nvOdds&&<RR l="Market consensus (no-vig)" v={nvOdds} c={K.pp}/>}
      {best&&<RR l="Best vs. average (cents saved per $100)" v={`+${f((1/toD(entries.reduce((s,e)=>({odds:String(toD(s.odds)+toD(e.odds)),name:'avg'})).odds*entries.length)-1/toD(best.odds))*100,1)}¢`} c={K.gn}/>}
      <Nt c={K.ac}>Always bet at the book offering the best odds for your side. Even 5 cents better on a $200 bet = $10 extra profit per game.</Nt>
    </div>}
    {entries.length<2&&<Nt c={K.mt}>Enter odds from 2+ books above to compare.</Nt>}
  </div>
  <Help entries={[
    ["Line Shopping","Checking multiple sportsbooks to find the best odds for your bet before placing. At -110 vs -105, you save $5 per $100 bet. Over hundreds of bets, this compounds into hundreds of dollars."],
    ["Market Consensus","The average implied probability across all books you entered, with vig removed. This is a rough estimate of the 'true' fair odds."],
    ["How much it matters","A bettor who always shops lines and gets 5 cents better odds on average will beat a bettor who doesn't by 2-3% ROI over the long run — without needing better picks."],
    ["The golden rule","Never place a moneyline or spread bet without checking at least 3 books. Difference between books is often 5-15 cents. Set up accounts at 6+ books so you always have options."],
  ]}/></div>);
};

// ═══ BET TRACKER (PENDING BETS) ═══
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
    if(toast) toast('✓ Bet added');
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
      <button onClick={()=>setShowPasteSlip(s=>!s)} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>📋 Paste Slip</button>
      <button onClick={()=>setShowImport(true)} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↑ Import CSV</button>
      {bets.length>0&&<button onClick={exportBets} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↓ Export CSV</button>}
      {showPasteSlip&&<div style={{width:"100%",marginTop:8,padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
        <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:8}}>Paste Bet Slip Text</div>
        <textarea style={{...S.input,height:80,resize:"vertical",marginBottom:8,fontSize:11}} value={slipText} onChange={e=>setSlipText(e.target.value)} placeholder="Paste bet slip text here…&#10;e.g. DraftKings · Chiefs Moneyline · +150 · $50"/>
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
      <div style={{fontSize:32,marginBottom:8}}>📋</div>
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
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:600}}>{e.toWin?`$${e.toWin}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
              <select value={e.status} onChange={ev=>setStatus(e.id,ev.target.value)} style={{...S.input,width:80,padding:"3px 6px",fontSize:10,color:statusColor[e.status]||K.tx}}>
                {["open","won","lost","void"].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{gr?<span style={S.tag(gr.c)}>{gr.g}</span>:<span style={{color:K.mt}}>—</span>}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>✕</span></td>
          </tr>
        );})}</tbody>
      </table>
    </div>}
    {showImport&&<CSVImportModal onImport={rows=>{save([...rows,...bets]); if(toast) toast(`✓ Imported ${rows.length} bets`,K.gn);}} onClose={()=>setShowImport(false)}/>}
  </div>);
};

// Tracker → ./components/Tracker.jsx
// Ledger (+ ShareWeekBtn, ReportCard, BetHeatmap) → ./components/Ledger.jsx
// ═══ FAQ ACCORDION ═══
const FaqAccordion = () => {
  const [open, setOpen] = useState(null);
  const faqs = [
    ["Is this legal in my state?","Yes, if your state has legal online sports betting. As of 2026, 30+ states allow it. This tool is a math calculator — it doesn't place bets or access sportsbook systems. It's no different from a spreadsheet. The only legal question is whether online sports betting is legal in your state, not whether you can use a calculator."],
    ["Can I get banned from sportsbooks?","You can't get 'banned' outright for matched betting — but books can limit your maximum bet size or exclude you from specific promotions. This typically happens to accounts that ONLY place hedging bets with no recreational activity. To stay under the radar: place some small normal bets, don't always withdraw immediately after a bonus, vary your bet amounts, and stick to main lines rather than props."],
    ["How much can I realistically make?","Welcome promos across 8-10 books: $1,000-$2,500 one-time. Daily profit boosts ongoing: $300-$1,000/month. These numbers assume you're in a state with 6-8 books and you're consistent with daily boosts. Some power users in NJ or PA who run all books aggressively see $1,500+/month ongoing. The income estimator in the Calculate tab gives you personalized projections."],
    ["Do I need to know anything about sports?","No. This is pure math. You don't need to know the teams, the players, or anything about sports. You're just placing bets on both sides of the same event — the outcome doesn't matter. Many of the most successful promo grinders have no sports knowledge at all."],
    ["Is this gambling?","Not in the traditional sense. Traditional gambling means taking a risk for the chance of reward. Matched betting eliminates the risk by betting both sides. When done correctly, the math guarantees a profit regardless of the outcome. You're exploiting the bonus value, not the game result. The +EV betting approach (Live Scanner) does involve variance, but even that is profitable over large sample sizes."],
    ["What if I lose a bet?","With hedging (Bonus Bet, First Bet, Profit Boost), you can't 'lose' in the traditional sense — both sides are covered. Your worst case is a smaller profit than expected (if the hedge math doesn't work out perfectly). The only risk is if you forget to place the hedge, or place it at the wrong book or wrong amount. Always set up both bets before either game starts."],
  ];
  return (<div style={{marginTop:16,marginBottom:8}}>
    <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Frequently Asked Questions</div>
    {faqs.map(([q,a],i)=>(
      <div key={i} style={{borderBottom:`1px solid ${K.bd}`,marginBottom:0}}>
        <button onClick={()=>setOpen(o=>o===i?null:i)} style={{width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 0",color:K.tx,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:font,fontSize:12,fontWeight:600}}>
          <span>{q}</span>
          <span style={{color:K.mt,fontSize:10,marginLeft:12}}>{open===i?"▲":"▼"}</span>
        </button>
        {open===i&&<div style={{fontSize:12,color:K.dm,lineHeight:1.7,paddingBottom:12}}>{a}</div>}
      </div>
    ))}
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
    <p>Yes. Matched betting and promo conversion are completely legal in every US state where online sports betting is legal (30+ states). This tool is a calculator — like a mortgage calculator or tax calculator. It doesn't place bets, access any sportsbook, or handle money. Companies like ProfitDuel, OddsJam, and DarkHorse Odds charge $49–$199/month for similar tools. This one is free. You can share it with anyone.</p>

    <div style={S.helpH}>How Much Can I Make?</div>
    <p>Welcome promos (one-time, across 8-10 books): $1,000-$2,500. Daily profit boosts (recurring, 15 min/day): $300-$1,000/month. These are realistic numbers based on current sportsbook promos. This is a side hustle, not a get-rich-quick scheme.</p>

    <FaqAccordion/>

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
    <div style={{background:"#161d2a",border:"1px dashed #1e293b",borderRadius:8,padding:16,margin:"12px 0",textAlign:"center"}}><div style={{fontSize:11,color:"#64748b"}}>📹 Video walkthrough: Setting up accounts — coming soon</div></div>

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

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>TAX GUIDE</div>

    <div style={S.helpH}>Reporting Your Winnings</div>
    <p>All gambling winnings are taxable ordinary income in the US, regardless of amount. You must report them even if you don't receive a W-2G form. Sportsbooks issue W-2Gs for winnings of $600+ that are 300x the wager or more, and for any winnings of $5,000+. Report everything on Schedule 1 (Form 1040), Line 8b.</p>

    <div style={S.helpH}>Deducting Losses</div>
    <p>You can deduct gambling losses — but only up to the amount of your winnings, and only if you itemize deductions (Schedule A). You cannot net losses against winnings and report only the difference. If you won $2,000 and lost $1,500, you report $2,000 in income and may deduct $1,500 separately. The P/L Ledger on this app is designed to track exactly this — export it at tax time.</p>

    <div style={S.helpH}>Quarterly Estimated Taxes</div>
    <p>If you expect to owe more than $1,000 in federal taxes from gambling, consider making quarterly estimated payments (Form 1040-ES) to avoid underpayment penalties. Quarterly deadlines are typically April 15, June 15, September 15, and January 15. The Tax Estimate section in the P/L Ledger gives you a running estimate.</p>

    <div style={S.helpH}>Professional Gambler Status</div>
    <p>If gambling is your primary source of income and you treat it like a business (records, regular activity, profit motive), you may qualify as a professional gambler. This allows you to deduct expenses (software, travel, data subscriptions) on Schedule C, but subjects your income to self-employment tax. Consult a CPA familiar with gambling income before claiming this status.</p>

    <div style={{...S.tag(K.pp),marginBottom:12,marginTop:24,fontSize:12}}>STATE AVAILABILITY GUIDE</div>

    <div style={S.helpH}>Which Sportsbooks Operate Where</div>
    <p>Online sports betting is legal in 30+ US states as of 2026. Not all sportsbooks operate in every legal state. Here are the major books and their general availability:</p>
    <p><span style={S.helpTerm}>DraftKings</span> — Available in most legal states (20+). One of the widest footprints.</p>
    <p><span style={S.helpTerm}>FanDuel</span> — Available in most legal states (20+). Typically matches DraftKings availability.</p>
    <p><span style={S.helpTerm}>BetMGM</span> — Available in 15+ states. Strong presence in NJ, PA, MI, CO, TN, VA, IN, WV, AZ, NV.</p>
    <p><span style={S.helpTerm}>Caesars</span> — Available in 15+ states. Strong in states where Caesars has casino properties.</p>
    <p><span style={S.helpTerm}>bet365</span> — Available in NJ, CO, IA, OH, VA, KY, and expanding. Smaller US footprint but excellent odds quality.</p>
    <p><span style={S.helpTerm}>ESPN BET (PENN)</span> — Available in 15+ states.</p>
    <p><span style={S.helpTerm}>Fanatics</span> — Rapidly expanding, now 15+ states after acquiring PointsBet US.</p>
    <p><span style={S.helpTerm}>BetRivers</span> — Available in 10+ states. Strongest in PA, IL, MI, IN, CO, VA, AZ, NY.</p>
    <p><span style={S.helpTerm}>States with the most books (best for promo grinding)</span>: New Jersey, Pennsylvania, Colorado, Michigan, Virginia, Ohio, Indiana, Arizona, New York.</p>
    <p><span style={S.helpTerm}>Check current availability</span>: Each sportsbook&apos;s app or website will tell you if they operate in your state during account creation. Availability changes as new states legalize.</p>

    <div style={{...S.tag(K.ac),marginBottom:12,marginTop:24,fontSize:12}}>STAKING PLAN GUIDE</div>

    <div style={S.helpH}>Flat Betting</div>
    <p>Bet the same dollar amount every time — typically 1-2% of bankroll. $1,000 bankroll = $10-$20 per bet. Simple, safe, and appropriate when you are not sure of your exact edge. You can absorb 50-100 consecutive losses without busting. Best for matched betting and promo conversions where every bet has roughly the same structure.</p>

    <div style={S.helpH}>Kelly Criterion</div>
    <p>Bets proportional to your edge: <span style={{fontFamily:font,color:K.ac}}>bet% = (p × b – q) / b</span> where p = win probability, b = net odds, q = loss probability. Full Kelly maximizes long-term bankroll growth but causes large drawdowns. Most professional +EV bettors use 20–33% (Quarter Kelly) to reduce variance while capturing most of the growth benefit.</p>

    <div style={S.helpH}>Proportional (% of bankroll)</div>
    <p>Bet a fixed percentage of your CURRENT bankroll each time. As the bankroll grows, bets grow. As it shrinks, bets shrink — protecting you from ruin. Common rule: 1% per unit, 2 units on strong plays, 0.5 units on weaker spots. Requires discipline to scale down after losses.</p>

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
    <p>Books also run promos for: NBA All-Star Weekend, Masters golf, Kentucky Derby, World Cup (if applicable), college football bowl season. Check your apps weekly — daily boosts run year-round regardless of calendar.</p>

    <div style={{...S.tag(K.gn),marginBottom:12,marginTop:24,fontSize:12}}>BOOK-SPECIFIC GUIDES</div>

    <div style={S.helpH}>DraftKings</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily profit boost tokens (2-3/day), stepped-up parlays, SGP profit boosts. Welcome offer: Bet $5, Get $200 in bonus bets. Conversion rate on DK bonus bets: 65-72%. Promos reset daily around 8am ET — check the Promotions tab each morning. DK has the widest variety of daily boosts across all sports. Account longevity tip: place occasional small recreational bets on main lines.</p>

    <div style={S.helpH}>FanDuel</div>
    <p><span style={S.helpTerm}>Best promos:</span> "No Sweat" first SGP of the day, daily profit boost tokens, parlay insurance. Welcome offer: Up to $300/day Bet Reset for 10 days. FanDuel No Sweat bets work like First Bet Insurance — if it loses, you get the stake back as bonus bets (up to the limit). Conversion: 65-72%. FD tends to offer more SGP-specific boosts than other books.</p>

    <div style={S.helpH}>BetMGM</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly deposit bonus (25% up to $100), daily odds boosts, one-game parlays. Welcome offer: Up to $1,500 First Bet Safety Net — the highest-value safety net on the market. Conversion on $1,500 bonus bets at 70%: ~$1,050 real cash. BetMGM tends to limit aggressive bonus converters faster than other books — vary your bet amounts and mix in recreational bets.</p>

    <div style={S.helpH}>Caesars</div>
    <p><span style={S.helpTerm}>Best promos:</span> Rotating 100% profit boost tokens ($25 max each), odds boosts, parlay insurance. Welcome offer: Bet $1, Get 10× 100% Profit Boost Tokens. Caesars Rewards points accumulate with every bet — these convert to real cash or hotel/resort value. Caesars has some of the strictest account limitation policies; be conservative with conversion amounts.</p>

    <div style={S.helpH}>bet365</div>
    <p><span style={S.helpTerm}>Best promos:</span> Early payout offers, multi-sport parlay boosts. Welcome offer: Choose between Bet $10 Get $365 Bonus Bets OR a $1K Safety Net. bet365 tends to have sharper lines than US-focused books, making it excellent for line shopping and +EV betting. Available in fewer US states (NJ, CO, IA, OH, VA, KY and expanding).</p>

    <div style={S.helpH}>ESPN BET</div>
    <p><span style={S.helpTerm}>Best promos:</span> Weekly profit boost tokens, featured parlay boosts, ESPN+ integration specials. Welcome offer: Bet $5, Get $200 + Deposit Match up to $300. ESPN BET is newer (launched late 2023) and tends to be more aggressive with promos to gain market share. Conversion: 65-70%. Check the ESPN app daily — promos are often tied to featured games.</p>

    <div style={S.helpH}>Fanatics</div>
    <p><span style={S.helpTerm}>Best promos:</span> Daily FanCash bonuses, loyalty rewards tied to Fanatics purchases, profit boosts. Welcome offer: Bet $5/day for 10 days, Get $200 FanCash. FanCash is Fanatics' bonus currency — it can be converted to cash at ~70% via the hedge method or spent on Fanatics merchandise. Uniquely, Fanatics integrates with your Fanatics shopping account for additional rewards.</p>

    <div style={S.helpH}>BetRivers</div>
    <p><span style={S.helpTerm}>Best promos:</span> iRush Rewards points (high earn rate), 2nd chance parlays, weekly profit boosts. Welcome offer: Up to $500 Second Chance Bet. BetRivers has the best loyalty program in US sports betting — iRush points earn fast and convert to bonus cash. Available in 10+ states with strong presence in PA, IL, MI. Generally less aggressive about account limitations than larger books.</p>
  </div>
</div>);

// ═══ PROFIT CERTIFICATE ═══
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
      `Profit Certificate — ${periodLabel}`,
      `Total Profit: $${f(total)}`,
      `${count} conversions across ${books.length} book${books.length !== 1 ? 's' : ''}`,
      bestDay.d ? `Best day: ${bestDay.d} (+$${f(bestDay.p)})` : '',
      '',
      'Tracked with PromoGrind — free sportsbook promo tools',
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
        await supabase.from('wins_wall').insert({
          user_id: session.user.id,
          period,
          period_label: periodLabel,
          total: parseFloat(f(total)) || 0,
          entry_count: count,
          book_count: books.length,
        });
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
        <div style={{fontSize:11,color:K.mt,marginTop:6}}>{total>=0?'PROFIT':'LOSS'} — {periodLabel}</div>
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

// ═══ TAB SYSTEM ═══
// LiveScanner (+ SPORTS_LIST, PROP_MARKETS, detectArbs, detectEV) → ./components/LiveScanner.jsx
// ═══ LEADERBOARD ═══
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
      {privacySaving&&<span style={{fontSize:10,color:K.yl}}>Saving…</span>}
    </div>
    {myRank&&<Nt c={K.gn}>You are ranked #{myRank} on the leaderboard.</Nt>}
    <Nt c={K.ac}>Earn points by using calculators (1-5 pts), logging bets (2 pts), and daily logins (3 pts).</Nt>
    {loading&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Loading leaderboard…</div>}
    {!loading&&rows.length===0&&<div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:32,marginBottom:8}}>🏆</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>Be the first on the leaderboard</div>
      <div style={{fontSize:11,color:K.mt,marginBottom:14}}>Use calculators and log bets to earn Vault Points and claim your spot.</div>
      <button onClick={()=>{window.location.hash='#/bonus-bet';}} style={{padding:"7px 18px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Start with Bonus Bet Converter →</button>
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
            <div style={{fontSize:i<3?18:13,fontWeight:700,color:rankColor(i),textAlign:"center"}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
            <div style={{fontSize:12,color:K.tx,fontWeight:i<3?600:400}}>{mask(r.user_id)}{isMe&&<span style={{...S.tag(K.gn),marginLeft:6,fontSize:8}}>YOU</span>}</div>
            <div style={{fontSize:13,fontWeight:700,color:K.yl}}>{(r.total_points||0).toLocaleString()}</div>
            <div style={{fontSize:11,color:isMe&&myAvgClv!==null?(myAvgClv>=0?K.gn:K.rd):K.mt}}>
              {isMe&&myAvgClv!==null?`${myAvgClv>=0?"+":""}${f(myAvgClv,2)}%`:"—"}
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

// ═══ COMMUNITY PROMO BOARD ═══
const PromoBoard = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({book:"DraftKings",promo_type:"Profit Boost",description:"",value:"",expires_at:""});
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");

  const load = async () => {
    const { data } = await supabase.from('promo_submissions')
      .select('*').eq('active',true).order('created_at',{ascending:false}).limit(50);
    if (data) setPromos(data);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const submit = async () => {
    if(!form.description||!form.book) return;
    setSubmitting(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      await supabase.from('promo_submissions').insert({...form,user_id:user.id});
      setShowForm(false);
      setForm(f=>({...f,description:"",value:"",expires_at:""}));
      await load();
    } catch(e) {}
    setSubmitting(false);
  };

  const upvote = async (id) => {
    await supabase.from('promo_submissions').update({upvotes:supabase.rpc('increment_upvotes',{row_id:id})}).eq('id',id);
    setPromos(p=>p.map(x=>x.id===id?{...x,upvotes:(x.upvotes||0)+1}:x));
  };

  const typeColor = {
    "Profit Boost":K.yl,"Bonus Bet":K.gn,"Deposit Match":K.ac,
    "Safety Net":K.pp,"Odds Boost":K.rd,"Parlay Insurance":K.dm,"Other":K.mt
  };

  const filtered = filter==="All" ? promos : promos.filter(p=>p.book===filter||p.promo_type===filter);

  return (<div style={S.card}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <Tl t="Community Promo Board" badge="LIVE" bc={K.gn}/>
      <button onClick={()=>setShowForm(s=>!s)} style={{padding:"7px 14px",background:showForm?"transparent":K.gn,border:`1px solid ${K.gn}`,borderRadius:6,color:showForm?K.gn:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font,flexShrink:0}}>
        {showForm?"Cancel":"+ Share a Promo"}
      </button>
    </div>

    {showForm&&<div style={{...S.card,background:K.s2,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:10}}>Share what you&apos;re seeing</div>
      <div style={S.row}>
        <div style={S.col}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
        <div style={S.col}><label style={S.label}>Type</label><select style={S.input} value={form.promo_type} onChange={e=>setForm(f=>({...f,promo_type:e.target.value}))}>{["Profit Boost","Bonus Bet","Deposit Match","Safety Net","Odds Boost","Parlay Insurance","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
        <In l="Value (e.g. 50%)" v={form.value} set={v=>setForm(f=>({...f,value:v}))} ph="50%"/>
        <div style={S.col}><label style={S.label}>Expires</label><input style={S.input} type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))}/></div>
      </div>
      <div style={{marginBottom:10}}><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. 50% profit boost on NBA, max $250 extra, all game types"/></div>
      <button onClick={submit} disabled={submitting||!form.description} style={{padding:"8px 18px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font,opacity:submitting?0.7:1}}>{submitting?"Submitting…":"Submit Promo"}</button>
      <Nt c={K.yl}>Only share promos you have personally verified. Do not submit expired or inaccurate promos.</Nt>
    </div>}

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
      {["All","DraftKings","FanDuel","BetMGM","Caesars","Profit Boost","Bonus Bet","Deposit Match"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{padding:"3px 10px",background:filter===f?K.gn:"transparent",border:`1px solid ${filter===f?K.gn:K.bd2}`,borderRadius:50,color:filter===f?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font}}>{f}</button>
      ))}
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:K.mt,fontSize:11}}>Loading promos…</div>}
    {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:24,marginBottom:8}}>📋</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:6}}>No promos yet — be the first</div>
      <div style={{fontSize:11,color:K.mt,marginBottom:14}}>Share a promo you're seeing at your sportsbook and help the community.</div>
      <button onClick={()=>setShowForm(true)} style={{padding:"7px 18px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>+ Share a Promo</button>
    </div>}
    {filtered.map(p=>(
      <div key={p.id} style={{...S.res(true),marginBottom:8,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontWeight:700,fontSize:13,color:K.tx}}>{p.book}</span>
              <span style={S.tag(typeColor[p.promo_type]||K.mt)}>{p.promo_type}</span>
              {p.value&&<span style={S.tag(K.gn)}>{p.value}</span>}
            </div>
            <div style={{fontSize:12,color:K.dm,marginBottom:2}}>{p.description}</div>
            <div style={{fontSize:10,color:K.mt}}>
              {new Date(p.created_at).toLocaleDateString()}
              {p.expires_at&&` · Expires ${new Date(p.expires_at).toLocaleDateString()}`}
            </div>
          </div>
          <button onClick={()=>upvote(p.id)} style={{background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.yl,fontSize:11,padding:"4px 10px",cursor:"pointer",fontFamily:font,flexShrink:0}}>
            ▲ {p.upvotes||0}
          </button>
        </div>
      </div>
    ))}
  </div>);
};

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state={error:null}; }
  static getDerivedStateFromError(e) { return {error:e}; }
  render() {
    if(this.state.error) return (
      <div style={{fontFamily:"'JetBrains Mono','SF Mono','Fira Code',monospace",background:"#0a0e17",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#0f1520",border:"1px solid #1e293b",borderRadius:10,padding:32,maxWidth:440,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#f87171",marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:16}}>{this.state.error.message}</div>
          <button onClick={()=>this.setState({error:null})} style={{padding:"8px 20px",background:"#60a5fa",border:"none",borderRadius:6,color:"#0a0e17",fontWeight:700,cursor:"pointer"}}>Try Again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ═══ DAILY STREAK ═══
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
          const MILESTONES=[[7,50,'🔥 7-day streak! +50 Vault Points earned!'],[30,200,'🔥 30-day streak! +200 Vault Points earned!'],[100,500,'🔥 100-day streak! +500 Vault Points earned!']];
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
      <span style={{fontSize:14}}>🔥</span>
      <span style={{fontSize:11,fontWeight:700,color:K.yl}}>{streak} day streak</span>
    </div>
  );
};

// ═══ ACHIEVEMENTS ═══
const ACHIEVEMENTS = [
  {id:'first_calc',label:'First Steps',desc:'Used your first calculator',icon:'🧮'},
  {id:'first_ledger',label:'Record Keeper',desc:'Logged first P/L entry',icon:'📒'},
  {id:'streak_7',label:'Week Grinder',desc:'7-day login streak',icon:'🔥'},
  {id:'bets_10',label:'Active Bettor',desc:'Tracked 10+ bets',icon:'🎯'},
  {id:'profit_100',label:'First $100',desc:'$100+ total profit logged',icon:'💵'},
  {id:'profit_1000',label:'Four Figures',desc:'$1,000+ total profit logged',icon:'💰'},
  {id:'all_tabs',label:'Explorer',desc:'Visited every calculator group',icon:'🗺️'},
];

const useAchievements = (data, streak) => {
  const [earned, setEarned] = useState(()=>{
    try{return JSON.parse(localStorage.getItem('pg_achievements')||'[]');}catch{return [];}
  });
  useEffect(()=>{
    const newEarned=[...earned];
    const entries=data?.ledger||[]; const bets=data?.bets||[];
    const total=entries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const visitedTabs=JSON.parse(localStorage.getItem('pg_visited_tabs')||'[]');
    const checks=[
      ['first_calc', ()=>Object.keys(data?.done||{}).length>0||entries.length>0],
      ['first_ledger', ()=>entries.length>0],
      ['streak_7', ()=>streak>=7],
      ['bets_10', ()=>bets.length>=10],
      ['profit_100', ()=>total>=100],
      ['profit_1000', ()=>total>=1000],
      ['all_tabs', ()=>visitedTabs.length>=5],
    ];
    let changed=false;
    checks.forEach(([id,check])=>{
      if(!newEarned.includes(id)&&check()){newEarned.push(id);changed=true;}
    });
    if(changed){setEarned(newEarned);try{localStorage.setItem('pg_achievements',JSON.stringify(newEarned));}catch{}}
  },[data,streak]);
  return {earned, all:ACHIEVEMENTS};
};

// ═══ GLOSSARY ═══
const GLOSSARY_TERMS = [
  ["Vig / Juice","The sportsbook's built-in profit margin on every bet. Standard vig is ~4.5% (both sides at -110)."],
  ["Moneyline","Bet on who wins outright. +200 = underdog, -200 = favorite."],
  ["Spread","Bet on margin of victory. -3.5 means team must win by 4+."],
  ["Total / Over-Under","Bet on combined score of both teams."],
  ["Parlay","Multiple bets combined — all must win. Higher payout, higher risk."],
  ["Arbitrage","Betting both sides at different books where combined odds guarantee profit."],
  ["+EV","Positive expected value — the bet profits over many repetitions."],
  ["Closing Line Value (CLV)","Whether your odds were better than the closing odds. Consistently beating the close = long-term edge."],
  ["Hedge","Placing a second bet on the opposite outcome to lock in profit."],
  ["Bonus Bet","A bet credit — only the profit is returned, not the stake."],
  ["Profit Boost","Percentage increase added to your winnings if the bet wins."],
  ["First Bet Insurance","Refund of first bet as bonus bets if it loses."],
  ["Rollover / Playthrough","Must wager X× the bonus before withdrawing."],
  ["Devig / No-Vig","Removing the sportsbook's margin to find true probabilities."],
  ["Kelly Criterion","Formula for optimal bet sizing based on your edge."],
  ["Middle","Betting opposite sides at different lines where both can win."],
  ["Round Robin","Creating all possible sub-parlays from a pool of picks."],
  ["Teaser","Parlay where you move lines in your favor for reduced payout."],
  ["Hold","The total percentage a book profits from both sides of a bet."],
  ["Sharp Book","Sportsbook with low vig and sharp (accurate) lines — e.g. Pinnacle."],
  ["Getting Limited","When a book reduces your max bet size due to consistent profiting."],
  ["SGP","Same-Game Parlay — all legs must be from the same game."],
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

// ═══ ONBOARDING WIZARD ═══
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
          <div style={{fontSize:32,marginBottom:16}}>🤑</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[["Welcome Promos","$1,000–$2,500 one-time from 8+ books"],["Profit Boosts","$300–$1,000/month recurring, 15 min/day"],["100% Legal","Math calculator, not gambling. Free forever."],["No Sports Knowledge","Pure math. You don't need to know the teams."]].map(([t,d])=>(
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
          <div style={{width:"100%",textAlign:"center",fontSize:11,color:"#64748b",marginTop:4}}>None yet? No problem — you'll start fresh.</div>
        </div>
      )
    },
    {
      title: "What state are you in?",
      sub: "We'll show only sportsbooks available in your state.",
      content: (
        <div style={{textAlign:"center"}}>
          <select style={{...S.input,maxWidth:300,padding:"10px 14px",fontSize:13,margin:"0 auto"}} value={userState} onChange={e=>{setUserState(e.target.value);try{localStorage.setItem('pg_user_state',e.target.value);}catch{}}}>
            <option value="">— Select your state —</option>
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
      sub: books.length > 0 ? `You have ${books.length} book${books.length>1?"s":""} — start converting promos immediately.` : "Open one or more sportsbook apps and grab a welcome promo.",
      content: (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#94a3b8",marginBottom:16,lineHeight:1.7}}>Your best first move:</div>
          <div style={{display:"grid",gap:8,maxWidth:380,margin:"0 auto",textAlign:"left"}}>
            {[
              ["1","Get a bonus bet promo","DraftKings, FanDuel, Fanatics, ESPN BET — all offer bonus bets after a small qualifying wager"],
              ["2","Open Bonus Bet Converter","Enter your bonus bet size and odds — the calculator tells you exactly what hedge to place"],
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
            {step<steps.length-1?"Next →":"Let's Go →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══ ANNUAL INCOME ESTIMATOR ═══
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
      <RR l={`Daily boost income (${boostsPerDay} boosts × ~$${boostPerConversion} each × 22 days)`} v={`$${Math.round(monthlyBoosts).toLocaleString()}/month`} c={K.ac}/>
      <RR l="Year 1 estimate (conservative)" v={`$${Math.round(annualTotal * 0.8).toLocaleString()} – $${Math.round(annualTotal * 1.1).toLocaleString()}`} c={K.gn} b/>
      <RR l="Effective hourly rate" v={`~$${Math.round(hourlyRate)}/hr`} c={K.pp}/>
      <Nt c={K.yl}>These are estimates based on current sportsbook promo values (2026). Welcome promos assume 70% conversion rate. Boost income varies by available lines and sportsbook generosity. Your actual results may be higher or lower.</Nt>
      <Nt c={K.ac}>Year 2+ income is mostly recurring boosts — welcome promos are one-time. This is a long-term side hustle, not a one-off.</Nt>
    </div>
  </div>
  <Help entries={[
    ["Welcome promo estimates","Based on current sportsbook offers: DraftKings ~$200 effective, FanDuel ~$200, BetMGM ~$180, Caesars ~$150, bet365 ~$125, ESPN BET ~$100, Fanatics ~$90, BetRivers ~$80. Assumes 70% conversion rate on bonus bets."],
    ["Boost income","Profit boosts appear daily across most sportsbooks. At 5 boosts per day averaging $9 each, that's $45/day, ~$990/month. More active grinders running all 8 books can see $200+/day on peak event days."],
    ["Hourly rate","Based on your selected hours per week. Note: most of that time is during games — you're watching sports and clicking buttons, not at a desk. Many grinders consider this 'free money on top of entertainment.'"],
    ["State matters","More legal sportsbooks in your state = more promos = more income. NJ, PA, CO, MI have the most books. Some states only have 2-3."],
  ]}/></div>);
};

// ═══ PROMO FINDER WIZARD ═══
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
      <button onClick={()=>go(slug)} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Open Calculator →</button>
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
      <Opt label="No — I only get the profit, not the credit back" sub="The stake is NOT returned" onClick={()=>{setAnswer('bonus');setStep(10);}}/>
      <Opt label="Yes — I get everything back if it wins" sub="Acts like a real cash bet" onClick={()=>{setAnswer('firstbet');setStep(10);}}/>
    </>}
    {step===10&&(()=>{
      const m = {
        bonus: {title:"Use: Bonus Bet Converter",desc:"Enter your bonus bet size, the odds you're placing it at, and the hedge odds. The calculator tells you exactly how much to hedge to lock in profit.",slug:"bonus-bet"},
        boost: {title:"Use: Profit Boost Converter",desc:"Enter your stake, the original odds, the boost percentage, and the max extra winnings. The calculator shows your effective odds and the hedge amount.",slug:"profit-boost"},
        firstbet: {title:"Use: First Bet Safety Net Hedge",desc:"Enter your first bet amount, the odds, and hedge odds. This locks in a small profit if your bet wins — and if it loses, you get bonus bets to convert.",slug:"first-bet"},
        deposit: {title:"Use: Deposit Match Calculator",desc:"Enter your deposit amount, match percentage, rollover, and average vig to find the true net value of the bonus.",slug:"deposit-match"},
        insurance: {title:"Use: Promo Insurance Calculator",desc:"Enter your stake, insurance percentage, and bonus conversion rate to find your effective net cost if the bet loses.",slug:"insurance"},
      };
      const res = m[answer];
      return res?<Result {...res}/>:<div style={{color:K.mt,fontSize:12}}>Not sure — try the Knowledge Base for a full overview.</div>;
    })()}
  </div>);
};

// ═══ QUICK CALC PANEL ═══
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
        {open?"✕ Close":"⚡ Quick"}
      </button>
    </div>
  );
};

// ═══ CALC SEARCH (keyboard ?) ═══
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
        <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search calculators…" style={{...S.input,fontSize:14,marginBottom:12}}/>
        <div style={{overflowY:"auto",flex:1}}>
          {filtered.map(c=>(
            <button key={c.slug} onClick={()=>{onNavigate(c.slug);onClose();}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"10px 12px",background:"transparent",border:"none",borderBottom:`1px solid ${K.bd}`,color:K.tx,cursor:"pointer",textAlign:"left",fontFamily:font}}>
              <span style={{fontSize:13,fontWeight:500}}>{c.n}</span>
              <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>{c.group}</span>
            </button>
          ))}
          {!filtered.length&&<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No matches</div>}
        </div>
        <div style={{fontSize:10,color:K.mt,marginTop:8,textAlign:"center"}}>Press Esc to close · Press ? anywhere to reopen</div>
      </div>
    </div>
  );
};

// ═══ MOBILE BOTTOM NAV ═══
const MobileBottomNav = ({ gi, goTo }) => {
  const icons = ["🏠","⚡","📊","📈","🔴","📚"];
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

// ═══ CSV IMPORT MODAL ═══
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
          {preview.map((r,i)=><div key={i} style={{fontSize:11,color:K.dm,padding:"4px 0",borderBottom:`1px solid ${K.bd}`}}>{r.date} · {r.book} · {r.odds} · ${r.stake} · <span style={{color:r.status==="won"?K.gn:r.status==="lost"?K.rd:K.yl}}>{r.status}</span></div>)}
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

// US_BOOK_STATES → ./components/Tracker.jsx
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// PROMO_SCHED + DAYS_ORDER → ./data/promoSchedule.js
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
    {alertSaved&&<div style={{fontSize:11,color:K.gn,marginTop:8}}>✓ Alerts configured — you&apos;ll be notified when high-value promos are available</div>}
    <Nt c={K.mt}>Email alerts coming soon — your preferences are saved and will activate when the feature launches.</Nt>
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
        Promo Performance Table <span style={{color:K.mt,fontSize:10}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{marginTop:12}}>
        {rows.length===0
          ?<div style={{fontSize:11,color:K.mt}}>Click <strong style={{color:K.ac}}>📈 Track Value</strong> on any promo in the calendar to start building this table.</div>
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
    <div style={{...S.note(K.ac),marginBottom:12}}>These are the predictable recurring promos across all major books. Stack them daily for $150–450/mo in passive profit on top of welcome bonuses.</div>
    <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",whiteSpace:"nowrap"}}>Market:</span>
      {["All","US","UK"].map(m=>(
        <button key={m} onClick={()=>{setMarketFilter(m);setFilterBook("All");}} style={{padding:"4px 12px",background:marketFilter===m?K.ac:"transparent",border:`1px solid ${marketFilter===m?K.ac:K.bd2}`,borderRadius:50,color:marketFilter===m?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,fontWeight:600,whiteSpace:"nowrap"}}>
          {m==="UK"?"🇬🇧 UK":m==="US"?"🇺🇸 US":"🌎 All"}
        </button>
      ))}
      {marketFilter==="UK"&&<span style={{fontSize:9,color:K.pp,marginLeft:4}}>bet365 · Betway · William Hill · Paddy Power · Sky Bet</span>}
      {marketFilter==="US"&&<span style={{fontSize:9,color:K.ac,marginLeft:4}}>DraftKings · FanDuel · BetMGM · Caesars · ESPN BET · Fanatics · BetRivers</span>}
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
        <option value="A">A — Best Value</option>
        <option value="B">B — Good Value</option>
        <option value="C">C — Situational</option>
      </select>
      <select style={{...S.input,width:"auto",padding:"5px 10px",fontSize:11}} value={filterComplexity} onChange={e=>setFilterComplexity(e.target.value)}>
        <option value="All">All Complexity</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <button onClick={exportICS} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",fontWeight:600}}>📅 Export to Calendar</button>
    </div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Book","Day","Promo","Est. Value","Type","Grade","Complexity","Time","Track","🔔",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
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
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:K.mt,fontSize:11,whiteSpace:"nowrap"}}>{p.timeMin?`~${p.timeMin}m`:"—"}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                <button onClick={()=>{const val=prompt(`Enter value realized for ${p.promo} (e.g. 12.50):`);if(val&&!isNaN(parseFloat(val)))trackValue(p,parseFloat(val));}} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${K.gn}`,borderRadius:4,color:K.gn,fontSize:9,cursor:"pointer",fontFamily:font}}>Track Value</button>
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {typeof Notification!=='undefined'&&<button onClick={()=>toggleAlert(p)} style={{padding:"2px 6px",background:alertOn?`${K.yl}15`:"transparent",border:`1px solid ${alertOn?K.yl:K.bd2}`,borderRadius:4,color:alertOn?K.yl:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{alertOn?"🔔 On":"🔔 Off"}</button>}
              </td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>
                {hist.length>0&&<button onClick={()=>setHistoryOpen(h=>({...h,[key]:!h[key]}))} style={{padding:"2px 6px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:9,cursor:"pointer",fontFamily:font}}>{showHist?"▲":"History"}</button>}
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
              <div style={{fontSize:9,color:K.mt}}>Last {hist.length} tracked values · Latest: ${hist[hist.length-1].value} on {hist[hist.length-1].date}</div>
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
    ["Profit boosts are the best","They come daily, they require no outcome risk when hedged, and they compound. At $10 profit per boost × 3 boosts/day × 30 days = $900/mo."],
  ]}/></div>);
};

// ═══ REFERRAL HUB ═══
// ═══ GIFT TRIAL BOX ═══
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
      <div style={{fontSize:12,color:'#4ade80',fontWeight:700,marginBottom:6}}>✓ Gift sent to {email}</div>
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
        {status==='loading'?'Sending…':'Send Gift →'}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:'#f87171',width:'100%'}}>Failed — check the email or try again.</div>}
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
  const refLink = userId ? `${CANONICAL_APP_URL}?ref=${userId}` : "Loading…";
  const copy = () => { try{navigator.clipboard.writeText(refLink); window.plausible?.('referral_shared'); localStorage.setItem('pg_referral_shared','1');}catch(e){} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (<div><div style={S.card}><Tl t="Refer &amp; Earn" badge="FREE VAULTSPARKED" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:16}}>Share your link. When a friend signs up and subscribes to VaultSparked, you both get <strong>30 days free</strong>. No limit on referrals.</div>
    <div style={{marginBottom:16}}>
      <div style={S.label}>Your Referral Link</div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <div style={{...S.input,flex:1,color:K.dm,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"default"}}>{refLink}</div>
        <button onClick={copy} style={{padding:"8px 16px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"✓ Copied!":"Copy Link"}</button>
      </div>
    </div>
    <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
      <div><div style={{fontSize:10,color:K.mt}}>YOUR REFERRALS</div><div style={S.big(K.pp)}>{refCount===null?'…':refCount}</div></div>
      <div><div style={{fontSize:10,color:K.mt}}>FREE DAYS EARNED</div><div style={S.big(K.gn)}>{refCount===null?'…':(refCount||0)*30}</div></div>
    </div>
    <div style={{marginTop:16,padding:12,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.tx,marginBottom:8}}>Share on</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label:"Twitter/X",color:"#1DA1F2",msg:`I've been making extra income every month using PromoGrind — free sportsbook promo conversion tools. Way better than paying $99/mo for OddsJam. Check it out: ${refLink}`},
          {label:"Discord",color:"#5865F2",msg:`**PromoGrind** — free matched betting tools. 22 calculators, live arb scanner. Sign up free: ${refLink}`},
          {label:"Reddit",color:"#FF4500",msg:`Has anyone else been using PromoGrind? It's free and has all the calculators you need for promo conversion. Link: ${refLink}`},
        ].map(({label,color,msg})=>(
          <button key={label} onClick={()=>{try{navigator.clipboard.writeText(msg);}catch(e){} }} style={{padding:"6px 14px",background:`${color}15`,border:`1px solid ${color}40`,borderRadius:6,color,fontSize:11,cursor:"pointer",fontFamily:font}}>Copy {label} Post</button>
        ))}
      </div>
    </div>
    {rhIsPro() && (
      <div style={{marginTop:24,padding:16,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8}}>
        <div style={{fontWeight:700,color:'#4ade80',marginBottom:12}}>⚡ Creator Mode</div>
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
      <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>🎁 Gift 14 Days Free</div>
      <div style={{fontSize:11,color:K.dm,marginBottom:12,lineHeight:1.6}}>Give a friend 14 days of VaultSparked Pro for free. They get the Live Scanner, +EV Scanner, and all Pro tools. You earn 7 bonus days when they sign up.</div>
      <GiftTrialBox/>
    </div>
  </div></div>);
};

// ═══ LIVE ACTIVITY FEED ═══
function LiveActivityFeed() {
  const EVENTS = [
    { state:'OH', book:'DraftKings', action:'converted a $200 bonus bet', value:'+$147', ago:'2m ago' },
    { state:'NJ', book:'FanDuel', action:'locked a 3.2% arb on NBA', value:'+$58', ago:'4m ago' },
    { state:'CO', book:'BetMGM', action:'claimed a 25% profit boost', value:'+$34', ago:'7m ago' },
    { state:'NY', book:'DraftKings', action:'completed welcome promo', value:'+$189', ago:'11m ago' },
    { state:'PA', book:'Caesars', action:'found a +EV pick (8.4% edge)', value:'+EV', ago:'14m ago' },
    { state:'MI', book:'FanDuel', action:'converted a $150 bonus bet', value:'+$108', ago:'18m ago' },
    { state:'IL', book:'BetMGM', action:'hit a parlay middle', value:'+$220', ago:'22m ago' },
    { state:'VA', book:'ESPN BET', action:'claimed a reload bonus', value:'+$41', ago:'25m ago' },
    { state:'AZ', book:'DraftKings', action:'completed SGP promo', value:'+$27', ago:'31m ago' },
    { state:'TN', book:'FanDuel', action:'locked a 2.8% arb', value:'+$47', ago:'35m ago' },
  ];
  const seed = Math.floor(Date.now() / (1000 * 60 * 10));
  const startIdx = seed % EVENTS.length;
  const ordered = [...EVENTS.slice(startIdx), ...EVENTS.slice(0, startIdx)];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % ordered.length), 3500);
    return () => clearInterval(t);
  }, []);
  const ev = ordered[idx];
  return (
    <div style={{marginBottom:16,padding:'10px 14px',background:'#0a0e17',border:'1px solid #1e3a2f',borderRadius:8,display:'flex',alignItems:'center',gap:10,overflow:'hidden'}}>
      <div style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',flexShrink:0,boxShadow:'0 0 6px #4ade80'}}/>
      <div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        <span style={{color:'#60a5fa',fontWeight:600}}>Grinder in {ev.state}</span>{' '}
        <span>{ev.action} on {ev.book}</span>{' '}
        <span style={{color:'#4ade80',fontWeight:700}}>{ev.value}</span>
      </div>
      <div style={{marginLeft:'auto',fontSize:9,color:'#334155',flexShrink:0}}>{ev.ago}</div>
    </div>
  );
}

// ═══ PROMO ADVISOR PANEL ═══
const PromoAdvisorPanel = ({ proStatus, onClose }) => {
  if (!FEATURE_FLAGS.promoAdvisor) {
    return (
      <div style={{position:'fixed',top:80,right:20,width:360,maxWidth:'calc(100vw - 40px)',zIndex:9998}}>
        <FeatureUnavailableCard featureKey="promoAdvisor" title="Promo Advisor" body="Promo Advisor will appear here once the AI explainer backend is activated." />
      </div>
    );
  }
  const isPro = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const DAILY_LIMIT = isPro ? 9999 : 3;
  const [promoText, setPromoText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uses, setUses] = useState(() => {
    try {
      const todayKey = `pg_advisor_uses_${new Date().toISOString().slice(0,10)}`;
      return parseInt(localStorage.getItem(todayKey) || '0');
    } catch { return 0; }
  });
  const toast = useToast();

  const analyze = async () => {
    if (!promoText.trim() || uses >= DAILY_LIMIT || loading) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('promo-advisor', {
        body: { promoText: promoText.trim() }
      });
      if (fnErr) throw fnErr;
      const newUses = uses + 1;
      setUses(newUses);
      // Write to today's key at call time (handles midnight rollover correctly)
      try { localStorage.setItem(`pg_advisor_uses_${new Date().toISOString().slice(0,10)}`, String(newUses)); } catch {}
      setResult(data);
    } catch(e) {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLimited = uses >= DAILY_LIMIT && !isPro;
  const ratingColor = result?.rating === 'excellent' ? K.gn : result?.rating === 'good' ? K.ac : result?.rating === 'poor' ? K.rd : K.yl;

  return (
    <div style={{position:'fixed',right:0,top:0,bottom:0,width:360,background:K.s1,borderLeft:`1px solid ${K.bd}`,zIndex:1100,display:'flex',flexDirection:'column',boxShadow:'-4px 0 32px rgba(0,0,0,0.6)'}}>
      <div style={{padding:'14px 16px',borderBottom:`1px solid ${K.bd}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:K.s2}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:K.tx}}>💡 Promo Advisor</div>
          <div style={{fontSize:11,color:K.mt,marginTop:2}}>Paste any promo — get an instant plain-English verdict</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:K.mt,fontSize:18,padding:4}}>×</button>
      </div>
      <div style={{flex:1,overflow:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
        <textarea
          value={promoText}
          onChange={e => setPromoText(e.target.value)}
          placeholder={'Example: "Get a $200 Bonus Bet if your first $5 bet loses. Bonus bet expires in 7 days."\n\nOr paste the full promo T&C text.'}
          style={{width:'100%',minHeight:130,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8,padding:10,color:K.tx,fontSize:12,resize:'vertical',fontFamily:font,boxSizing:'border-box',lineHeight:1.5}}
        />
        {!isPro && (
          <div style={{fontSize:11,color:K.mt,textAlign:'right'}}>{uses}/{DAILY_LIMIT} free analyses today</div>
        )}
        {isLimited && (
          <div style={{background:`${K.pp}15`,border:`1px solid ${K.pp}30`,borderRadius:8,padding:10,fontSize:12,color:K.pp,textAlign:'center'}}>
            Daily limit reached. Upgrade to VaultSparked for unlimited analyses.
          </div>
        )}
        <button
          onClick={analyze}
          disabled={loading || !promoText.trim() || isLimited}
          style={{padding:'9px',background:isLimited?K.s2:'#7c3aed',border:`1px solid ${isLimited?K.bd:'#7c3aed'}`,borderRadius:8,color:isLimited?K.mt:'#fff',fontWeight:700,fontSize:12,cursor:loading||isLimited?'default':'pointer',fontFamily:font,opacity:loading?0.7:1}}
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze This Promo'}
        </button>
        {error && <div style={{color:K.rd,fontSize:12}}>{error}</div>}
        {result && (
          <div style={{background:`${ratingColor}10`,border:`1px solid ${ratingColor}40`,borderRadius:10,padding:14,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:15,fontWeight:800,color:ratingColor}}>{result.verdict || 'Analysis Complete'}</div>
            {result.explanation && <div style={{fontSize:12,color:K.dm,lineHeight:1.6}}>{result.explanation}</div>}
            {result.ev && <div style={{fontSize:12}}><span style={{color:K.mt}}>Expected Value: </span><span style={{color:K.gn,fontWeight:700}}>{result.ev}</span></div>}
            {result.action && <div style={{fontSize:12}}><span style={{color:K.mt}}>Best Action: </span><span style={{color:K.ac,fontWeight:700}}>{result.action}</span></div>}
            {result.hedge && <div style={{fontSize:12}}><span style={{color:K.mt}}>Hedge Strategy: </span><span style={{color:K.pp,fontWeight:700}}>{result.hedge}</span></div>}
          </div>
        )}
        {!isPro && (
          <div style={{marginTop:'auto',padding:12,background:`${K.pp}08`,border:`1px solid ${K.pp}20`,borderRadius:8,fontSize:11,color:K.mt,textAlign:'center'}}>
            VaultSparked members get unlimited Promo Advisor + Live Arb Scanner + AI Action Plan
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ PRICING / UPGRADE ═══
const PricingPage = () => {
  const [upgrading, setUpgrading] = useState(false);
  const [trialStarting, setTrialStarting] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [conciergeWL, setConciergeWL] = useState(() => { try { return !!localStorage.getItem('pg_concierge_waitlist'); } catch { return false; } });
  const toast = useToast();
  const handleUpgrade = async (plan) => {
    setUpgrading(true);
    try { await startCheckout(plan.id); }
    catch(e) { if(toast) toast('Checkout failed: '+e.message, K.rd); setUpgrading(false); }
  };
  const handleTrial = async () => {
    setTrialStarting(true);
    const ok = await startTrial();
    if(ok) { setTrialStarted(true); window.plausible?.('trial_start'); if(toast) toast('7-day Pro trial started! Enjoy full access.', K.gn); }
    else { if(toast) toast('Could not start trial. Try again.', K.rd); }
    setTrialStarting(false);
  };
  return (<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{...S.card,border:`1px solid ${K.ac}40`}}><Tl t="Concierge" badge="NEW" bc={K.ac}/>
    <div style={{...S.note(K.ac),marginBottom:20}}>The step up from free — personalized insights for serious grinders.</div>
    <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:20}}>
      <span style={{fontSize:28,fontWeight:700,color:K.ac,fontFamily:fontD}}>$9.99</span>
      <span style={{fontSize:12,color:K.mt}}>/mo</span>
    </div>
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,marginBottom:20}}>
      {[
        ["Weekly Report Card email","P/L, streak, top book every Monday"],
        ["Promo Advisor","10 AI analyses per day (vs 3 free)"],
        ["Promo expiry alerts","Push + email when your active promos expire"],
        ["Priority support",""],
      ].map(([title,desc])=>(
        <div key={title} style={{display:"flex",gap:10,marginBottom:8}}>
          <span style={{color:K.ac,fontWeight:700,marginTop:1}}>✓</span>
          <div><span style={{fontSize:12,fontWeight:600,color:K.tx}}>{title}</span>{desc&&<span style={{fontSize:11,color:K.dm}}> — {desc}</span>}</div>
        </div>
      ))}
    </div>
    <button
      onClick={()=>{
        if(!conciergeWL){
          try{localStorage.setItem('pg_concierge_waitlist','true');}catch{}
          setConciergeWL(true);
          if(toast) toast("You're on the waitlist! We'll email you when Concierge launches.",K.ac);
        }
      }}
      style={{width:"100%",padding:"10px",background:conciergeWL?K.s2:K.ac,border:`1px solid ${conciergeWL?K.bd:K.ac}`,borderRadius:6,color:conciergeWL?K.mt:'#fff',fontWeight:700,cursor:conciergeWL?"default":"pointer",fontFamily:font,fontSize:12}}
    >
      {conciergeWL?"✓ On Waitlist":"Join Waitlist"}
    </button>
  </div><div style={S.card}><Tl t="VaultSparked Pro" badge="UPGRADE" bc={K.pp}/>
    <div style={{...S.note(K.pp),marginBottom:20}}>Unlock the live Arb Scanner and +EV Scanner. Real-time odds from 40+ books. Unlimited scans. Cancel anytime.</div>
    {!trialStarted ? (
      <div style={{padding:"16px 20px",background:`${K.gn}08`,border:`1px solid ${K.gn}40`,borderRadius:8,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:K.gn,marginBottom:3}}>Try Pro free for 7 days</div>
          <div style={{fontSize:11,color:K.dm}}>Full access to Live Arb Scanner and +EV Scanner. No credit card required.</div>
        </div>
        <button onClick={handleTrial} disabled={trialStarting} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",opacity:trialStarting?0.7:1}}>
          {trialStarting?"Starting…":"Start Free Trial"}
        </button>
      </div>
    ) : (
      <div style={{...S.note(K.gn),marginBottom:20}}>✓ 7-day Pro trial is now active! Visit the Live Arb or +EV Scanner to try it out.</div>
    )}
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
      {[
        {id:"monthly",label:"Monthly",price:"$24.99",period:"/mo",savings:null,highlight:false},
        {id:"annual",label:"Annual",price:"$199",period:"/yr",savings:"Save $101 · 2 months free",highlight:true},
      ].map(plan=>(
        <div key={plan.id} style={{flex:1,minWidth:200,padding:20,background:plan.highlight?`${K.pp}08`:K.s2,border:`2px solid ${plan.highlight?K.pp:K.bd}`,borderRadius:10,position:"relative"}}>
          {plan.highlight&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:K.pp,color:K.bg,fontSize:9,fontWeight:700,padding:"2px 12px",borderRadius:50,letterSpacing:"1px"}}>BEST VALUE</div>}
          <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:4}}>{plan.label}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:plan.savings?4:16}}>
            <span style={{fontSize:28,fontWeight:700,color:plan.highlight?K.pp:K.tx,fontFamily:fontD}}>{plan.price}</span>
            <span style={{fontSize:12,color:K.mt}}>{plan.period}</span>
          </div>
          {plan.savings&&<div style={{fontSize:11,color:K.gn,fontWeight:600,marginBottom:16}}>{plan.savings}</div>}
          <button onClick={()=>{
            if(FEATURE_FLAGS.paidCheckout){
              window.plausible?.('upgrade_click');
              trackFeatureEnabledUse('paidCheckout', plan.id);
              handleUpgrade(plan);
            } else {
              trackFeatureGateClick('paidCheckout', plan.id);
            }
          }} disabled={upgrading || !FEATURE_FLAGS.paidCheckout} style={{width:"100%",padding:"10px",background:plan.highlight?K.pp:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:(upgrading || !FEATURE_FLAGS.paidCheckout)?"not-allowed":"pointer",fontFamily:font,fontSize:12,opacity:FEATURE_FLAGS.paidCheckout?1:0.55}}>
            {!FEATURE_FLAGS.paidCheckout ? "Billing activation pending" : upgrading?"Processing…":"Upgrade Now"}
          </button>
        </div>
      ))}
    </div>
    {!FEATURE_FLAGS.paidCheckout && <div style={{...S.note(K.yl),marginTop:-6,marginBottom:16}}>Paid checkout is not live yet. Free Vault membership and the 7-day Pro trial are active; billing will switch on after the shared Studio checkout rollout is completed.</div>}
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>What you get</div>
      {[
        ["Live Arb Scanner","Real-time arbitrage across 40+ books. Alerts when ROI > your threshold."],
        ["Live +EV Scanner","Positive expected value bets. Kelly bet sizing per opportunity."],
        ["Scan History","Last 20 scans saved. Track how often arbs appear in your sport."],
        ["Player Props","Optional props market scanning. Find mispriced player lines."],
        ["Priority Support","Discord channel + email support from the PromoGrind team."],
      ].map(([title,desc])=>(
        <div key={title} style={{display:"flex",gap:10,marginBottom:8}}>
          <span style={{color:K.gn,fontWeight:700,marginTop:1}}>✓</span>
          <div><span style={{fontSize:12,fontWeight:600,color:K.tx}}>{title}</span><span style={{fontSize:11,color:K.dm}}> — {desc}</span></div>
        </div>
      ))}
    </div>
    <LiveActivityFeed/>
    <div style={{marginTop:20,padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:12,textTransform:"uppercase",letterSpacing:"1.5px"}}>What Grinders Say</div>
      {[
        {quote:"Made back the subscription cost in 20 minutes with the first arb alert. The scanner is insane.",name:"Tyler M.",stat:"$340 first week"},
        {quote:"I was using a spreadsheet before this. Never going back. The bonus bet converter alone saves me an hour per session.",name:"Jess R.",stat:"$1,200/mo average"},
        {quote:"The free calculator suite is better than what OddsJam charges $150/mo for. The Pro upgrade is a no-brainer.",name:"Marcus D.",stat:"8 books completed"},
      ].map((t,i)=>(
        <div key={i} style={{marginBottom:i<2?10:0,padding:"12px 14px",background:K.s1,borderRadius:6,border:`1px solid ${K.bd}`}}>
          <div style={{fontSize:12,color:K.tx,lineHeight:1.6,marginBottom:6}}>"{t.quote}"</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:K.mt}}>— {t.name}</span>
            <span style={{...S.tag(K.gn),fontSize:9}}>{t.stat}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
  {/* Agency / B2B tier */}
  <div style={{...S.card,border:`1px solid #a855f740`}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
      <span style={{fontSize:16,fontWeight:700,color:'#a855f7',fontFamily:fontD}}>Agency / White-Label</span>
      <span style={{padding:'2px 10px',borderRadius:50,fontSize:9,fontWeight:700,background:'#a855f720',color:'#a855f7',letterSpacing:'1.5px'}}>B2B</span>
    </div>
    <div style={{...S.note('#a855f7'),marginBottom:20}}>Embed the full PromoGrind calculator suite on your betting blog or platform with your own branding.</div>
    <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:20}}>
      <span style={{fontSize:28,fontWeight:700,color:'#a855f7',fontFamily:fontD}}>$199</span>
      <span style={{fontSize:12,color:K.mt}}>/mo</span>
    </div>
    <div style={{padding:16,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`,marginBottom:20}}>
      {[
        "Full calculator suite white-label",
        "Remove PromoGrind branding",
        "Embed on your betting blog",
        "API access (calc-api)",
        "Priority support",
        "Custom domain support",
      ].map(feat=>(
        <div key={feat} style={{display:'flex',gap:10,marginBottom:8}}>
          <span style={{color:'#a855f7',fontWeight:700,marginTop:1}}>✓</span>
          <span style={{fontSize:12,fontWeight:600,color:K.tx}}>{feat}</span>
        </div>
      ))}
    </div>
    <a
      href="mailto:hello@vaultsparkstudios.com?subject=PromoGrind Agency Inquiry"
      style={{display:'block',width:'100%',padding:'10px',background:'#a855f7',border:'none',borderRadius:6,color:'#fff',fontWeight:700,cursor:'pointer',fontFamily:font,fontSize:12,textAlign:'center',textDecoration:'none',boxSizing:'border-box'}}
    >
      Contact Sales →
    </a>
  </div>
  </div>);
};

// ═══ AI WEEKLY ACTION PLAN ═══
// ═══ STACK BUILDER ═══
function StackBuilder({ proStatus }) {
  if (!FEATURE_FLAGS.stackBuilder) {
    return <FeatureUnavailableCard featureKey="stackBuilder" title="Stack Builder" body="Stack Builder will unlock here once the AI planning backend is activated." />;
  }
  const isActive = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bankroll, setBankroll] = useState(() => { try { return localStorage.getItem('pg_bankroll') || '1000'; } catch { return '1000'; } });
  const [booksAvailable, setBooksAvailable] = useState([]);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const allBooks = BOOKS.map(b => b.name);

  const toggleBook = (book) => {
    setBooksAvailable(prev =>
      prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book]
    );
  };

  const generate = async () => {
    if (!isActive) { toast('Stack Builder is VaultSparked only — start your free 7-day trial', K.pp); return; }
    if (!bankroll || parseFloat(bankroll) < 100) { toast('Minimum $100 bankroll required', K.rd); return; }
    setLoading(true); setError(null); setPlan(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error: fnErr } = await supabase.functions.invoke('stack-builder', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { bankroll: parseFloat(bankroll), booksAvailable },
      });
      if (fnErr) throw fnErr;
      setPlan(data);
    } catch (e) {
      setError(e.message || 'Failed to generate stack');
    } finally {
      setLoading(false);
    }
  };

  const copyPlan = () => {
    if (!plan?.plan) return;
    navigator.clipboard.writeText(`PromoGrind Stack Builder — $${bankroll} bankroll\n\n${plan.plan}`).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <div style={S.card}>
        <Tl t="Stack Builder" badge="AI · VAULTSPARKED" bc={K.pp}/>
        <p style={{fontSize:12,color:K.dm,marginBottom:16,lineHeight:1.6}}>
          Enter your bankroll and available books. Claude analyzes current promos and returns your optimal 3-book extraction sequence with guaranteed profit amounts.
        </p>

        {!isActive && (
          <div style={{padding:14,background:`${K.pp}08`,border:`1px solid ${K.pp}30`,borderRadius:8,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.pp}}>⚡ VaultSparked Feature</div>
              <div style={{fontSize:11,color:K.mt}}>Start your free 7-day trial — no credit card required</div>
            </div>
            <button onClick={()=>startTrial && startTrial()} style={{padding:'6px 14px',background:K.pp,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:font}}>Try Free →</button>
          </div>
        )}

        <div style={S.row}>
          <div style={S.col}><In l="Your Bankroll" v={bankroll} set={v=>{setBankroll(v); try{localStorage.setItem('pg_bankroll',v);}catch{}}} pre="$" ph="1000"/></div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={S.label}>Books you have available (optional — leave blank for all)</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
            {allBooks.map(book => {
              const sel = booksAvailable.includes(book);
              return (
                <button key={book} onClick={() => toggleBook(book)}
                  style={{padding:'4px 10px',background:sel?`${K.gn}15`:'transparent',border:`1px solid ${sel?K.gn:K.bd2}`,borderRadius:50,color:sel?K.gn:K.dm,fontSize:10,cursor:'pointer',fontFamily:font}}>
                  {sel ? '✓ ' : ''}{book}
                </button>
              );
            })}
          </div>
          {booksAvailable.length > 0 && (
            <button onClick={() => setBooksAvailable([])} style={{marginTop:6,background:'none',border:'none',color:K.mt,fontSize:10,cursor:'pointer',textDecoration:'underline',padding:0}}>Clear all</button>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading}
          style={{width:'100%',padding:'12px 0',background:isActive?(loading?`${K.pp}40`:K.pp):`${K.pp}20`,border:`1px solid ${K.pp}${isActive?'':40}`,borderRadius:8,color:isActive?K.bg:K.pp,fontFamily:font,fontWeight:700,fontSize:13,cursor:loading?'wait':'pointer',letterSpacing:'0.5px'}}>
          {loading ? '⚡ Building your optimal stack…' : '⚡ Build My Stack'}
        </button>

        {error && <div style={{...S.note(K.rd),marginTop:12}}>{error}</div>}

        {plan && (
          <div style={{marginTop:16,padding:16,background:`${K.pp}08`,border:`1px solid ${K.pp}30`,borderRadius:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:10,color:K.pp,textTransform:'uppercase',letterSpacing:'1.5px',fontWeight:700}}>Your Optimal Stack</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                {plan.estimatedTotal && (
                  <span style={{fontSize:11,color:K.gn,fontWeight:700}}>Est. ${plan.estimatedTotal} guaranteed</span>
                )}
                <button onClick={copyPlan} style={{padding:'3px 10px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:4,color:copied?K.gn:K.mt,fontSize:9,cursor:'pointer',fontFamily:font}}>
                  📋 {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{fontSize:12,color:K.tx,lineHeight:1.8,whiteSpace:'pre-wrap'}}>
              {plan.plan}
            </div>
            {plan.booksUsed?.length > 0 && (
              <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                {plan.booksUsed.map(b => (
                  <span key={b} style={{...S.tag(K.ac)}}>{b}</span>
                ))}
              </div>
            )}
            <div style={{marginTop:10,fontSize:10,color:K.mt}}>
              Generated {plan.generatedAt ? new Date(plan.generatedAt).toLocaleTimeString() : 'just now'} · {plan.promoCount} promos analyzed
            </div>
          </div>
        )}
      </div>
      <Help entries={[
        ["What is a promo stack?","A sequence of sportsbook promos executed in the optimal order to maximize guaranteed profit extraction. Order matters — welcome bonuses must come before recurring promos, and bankroll must cover hedge amounts at each step."],
        ["How does Claude generate the stack?","Claude analyzes your bankroll against available promo types, calculates expected guaranteed extraction for each (after hedge), and sequences them for maximum yield without over-committing capital."],
        ["Do I need all these books?","No — the more books you have, the more opportunities. But even 2-3 books generate meaningful stacks. Select only the books where you have accounts open."],
      ]}/>
    </div>
  );
}

function AIActionPlan({ proStatus }) {
  if (!FEATURE_FLAGS.aiActionPlan) {
    return <FeatureUnavailableCard featureKey="aiActionPlan" title="AI Weekly Action Plan" body="AI weekly plans stay in beta until the planning backend is activated." />;
  }
  const isActive = proStatus?.status === 'active' || proStatus?.status === 'trial';
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastGenDate, setLastGenDate] = React.useState(() => { try { return localStorage.getItem('pg_action_plan_date'); } catch { return null; } });

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastGenDate === today) {
      try { const c = JSON.parse(localStorage.getItem('pg_action_plan_cache') || 'null'); if (c) setPlan(c); } catch {}
    }
  }, []);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const appDataRaw = (() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3') || '{}'); } catch { return {}; } })();
      const bankroll = localStorage.getItem('pg_bankroll') || '1000';
      const booksComplete = Object.values(appDataRaw.done || {}).filter(Boolean).length;
      const ledger = appDataRaw.ledger || [];
      const recentProfit = ledger.slice(-10).reduce((s, e) => s + (parseFloat(e.profit) || 0), 0).toFixed(2);
      const { data, error: fnErr } = await supabase.functions.invoke('ai-action-plan', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { bankroll, booksComplete, recentProfit, ledgerCount: ledger.length },
      });
      if (fnErr) throw fnErr;
      setPlan(data);
      const today = new Date().toISOString().split('T')[0];
      try { localStorage.setItem('pg_action_plan_date', today); localStorage.setItem('pg_action_plan_cache', JSON.stringify(data)); } catch {}
      setLastGenDate(today);
    } catch (e) { setError(e.message || 'Failed to generate plan'); }
    finally { setLoading(false); }
  };

  if (!isActive) return (
    <div><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{fontSize:16,fontWeight:700,color:'#e2e8f0',marginBottom:6,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
      <div style={{fontSize:12,color:'#64748b',marginBottom:16,lineHeight:1.7}}>Claude AI analyzes your book roster, bankroll, and recent P/L each week and generates a personalized 3-item action plan. What to do, in what order, and why.</div>
      <div style={{padding:'12px 14px',background:'#0a0e17',borderRadius:6,border:'1px solid #1e293b',marginBottom:12}}>
        {['Run DraftKings 20% deposit match ($200 value) — expires Sunday','Lock FanDuel NBA arb at +2.1% ROI (~$42 on $2K)','Claim Caesars Wednesday boost before 11:59pm'].map((item,i)=>(
          <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<2?`1px solid ${K.bd}`:'none',filter:'blur(3px)',userSelect:'none'}}>
            <span style={{color:K.gn,fontWeight:700,fontSize:13,minWidth:16}}>{i+1}</span>
            <span style={{fontSize:12,color:K.tx}}>{item}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{window.location.hash='#/upgrade';}} style={{width:'100%',padding:'10px',background:K.pp,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>
        Unlock AI Action Plan — VaultSparked →
      </button>
    </div></div>
  );

  const today = new Date().toISOString().split('T')[0];
  const alreadyToday = lastGenDate === today;

  return (
    <div><div style={{background:'#0f1520',border:'1px solid #1e293b',borderRadius:10,padding:20,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:K.tx,fontFamily:fontD}}>⚡ AI Weekly Action Plan</div>
        {alreadyToday&&<span style={{fontSize:10,color:K.gn,padding:'2px 8px',background:'#1e3a2f',borderRadius:4}}>Generated today</span>}
      </div>
      {!plan&&!loading&&(
        <div>
          <div style={{fontSize:12,color:K.mt,marginBottom:16,lineHeight:1.7}}>Claude AI will analyze your book roster, bankroll, and recent P/L to create a personalized action plan for the week.</div>
          <button onClick={generate} style={{width:'100%',padding:'12px',background:K.gn,border:'none',borderRadius:6,color:K.bg,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:font}}>Generate My Plan →</button>
        </div>
      )}
      {loading&&<div style={{textAlign:'center',padding:'24px 0',color:K.mt,fontSize:12}}><div style={{fontSize:20,marginBottom:8}}>⚡</div>Analyzing your book roster and recent P/L…</div>}
      {error&&<div style={{padding:'10px 12px',background:'#2a1515',border:`1px solid ${K.rd}40`,borderRadius:6,color:K.rd,fontSize:12,marginBottom:12}}>{error}</div>}
      {plan&&(
        <div>
          {plan.summary&&<div style={{fontSize:12,color:K.dm,marginBottom:12,lineHeight:1.7,padding:'10px 12px',background:K.s3,borderRadius:6}}>{plan.summary}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            {(plan.actions||[]).map((action,i)=>(
              <div key={i} style={{padding:'12px 14px',background:K.s3,borderRadius:8,border:`1px solid ${K.bd}`}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:18,fontWeight:700,color:K.gn,minWidth:24,fontFamily:fontD}}>{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:3}}>{action.title}</div>
                    <div style={{fontSize:11,color:K.mt,lineHeight:1.6}}>{action.why}</div>
                    {action.value&&<div style={{fontSize:11,color:K.gn,fontWeight:600,marginTop:4}}>Est. value: {action.value}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={generate} disabled={loading||alreadyToday}
            style={{width:'100%',padding:'8px',background:'transparent',border:`1px solid ${K.bd}`,borderRadius:6,color:alreadyToday?K.bd2:K.dm,cursor:alreadyToday?'not-allowed':'pointer',fontSize:11,fontFamily:font}}>
            {alreadyToday?'Plan generated for today — come back tomorrow':'Regenerate plan'}
          </button>
        </div>
      )}
    </div></div>
  );
}

// ═══ COMPETITOR COMPARISON ═══
const CompetitorComparison = () => (
  <div><div style={S.card}>
    <Tl t="PromoGrind vs The Competition" badge="WHY FREE WINS" bc={K.gn}/>
    <Nt c={K.gn}>PromoGrind is permanently free for all 27 calculators, tracker, and knowledge base. Competitors charge $49–$199/month for similar tools.</Nt>
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
            ["Price","Free","$99–$199/mo","$49–$99/mo","Free"],
            ["Bonus Bet Converter","✓","✓","✓","Manual"],
            ["Profit Boost Converter","✓","✓","✓","Manual"],
            ["Arb Calculator","✓","✓","✓","Manual"],
            ["No-Vig / +EV Calculator","✓","✓","✓","Manual"],
            ["Live Arb Scanner","✓ (Pro $24.99/mo)","✓ Included","✓ Included","✗"],
            ["P/L Ledger & Tracker","✓","Limited","✓","Manual"],
            ["Cloud Sync","✓","✓","✓","✗"],
            ["Mobile PWA","✓","✗","✗","✗"],
            ["Knowledge Base","✓ Full guide","Limited","Limited","✗"],
            ["CSV Import/Export","✓","✗","✗","Manual"],
            ["Referral Program","✓","✗","✗","✗"],
            ["Push Notifications","✓","✗","✗","✗"],
            ["Total 27 Calculators","✓","~10","~15","DIY"],
          ].map(([feature,...vals])=>(
            <tr key={feature}>
              <td style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:K.dm,fontSize:11}}>{feature}</td>
              {vals.map((v,i)=>(
                <td key={i} style={{padding:"8px 10px",borderBottom:`1px solid ${K.bd}`,color:i===0?K.gn:v==="✗"?K.rd:K.dm,fontWeight:i===0?600:400,background:i===0?`${K.gn}03`:"transparent",fontSize:11}}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{marginTop:16,padding:14,background:K.s2,borderRadius:8,border:`1px solid ${K.bd}`}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:6}}>The Bottom Line</div>
      <div style={{fontSize:12,color:K.dm,lineHeight:1.7}}>
        OddsJam and ProfitDuel are excellent tools — but they charge $99–$199/month for a calculator suite that is fundamentally free math. PromoGrind gives you every calculator free, forever. The only paid feature is the live Arb/+EV scanner ($24.99/mo vs $99–199/mo), which pays for itself in the first hour of use.
      </div>
    </div>
  </div></div>
);

// ═══ TEAM ACCOUNTS (COMING SOON) ═══
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
      <div style={{color:K.mt,textAlign:'center',padding:32}}>Loading…</div>
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
            <li>Shared P/L Ledger — see combined profits across all members</li>
            <li>Team leaderboard — who&apos;s grinding hardest</li>
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
            <div style={{fontSize:12,color:K.mt}}>Team Vault · {members.length} member{members.length !== 1 ? 's' : ''}</div>
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
              <div style={{color:K.mt,fontSize:11}}>{m.role} · {m.status}</div>
            </div>
            <span style={{padding:'2px 10px',background:m.status==='active'?`${K.gn}15`:`${K.s3}`,border:`1px solid ${m.status==='active'?K.gn:K.bd2}`,borderRadius:999,fontSize:11,color:m.status==='active'?K.gn:K.mt}}>
              {m.status}
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div style={{color:K.mt,fontSize:13,textAlign:'center',padding:16}}>No members yet — invite your first teammate above</div>
        )}
      </div>
    )}
  </div></div>);
};

// ═══ SMART PROMO RECOMMENDER ═══
const SmartPromoRecommender = ({ data }) => {
  const today = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDay = dayNames[today.getDay()];
  const isWeekend = today.getDay()===0||today.getDay()===6;
  const todayStr = today.toISOString().split('T')[0];
  const in3Days = new Date(Date.now()+3*24*60*60*1000).toISOString().split('T')[0];
  const activeBooks = useMemo(()=>
    Object.entries(data.bookStatus||{})
      .filter(([,v])=>v==='active'||v==='Active')
      .map(([k])=>k)
  ,[data.bookStatus]);
  const limitedBooks = useMemo(()=>
    Object.entries(data.bookStatus||{})
      .filter(([,v])=>v==='limited'||v==='Limited'||v==='gubbed'||v==='Gubbed')
      .map(([k])=>k)
  ,[data.bookStatus]);
  const doneBooks = data.done||{};
  const openBets = useMemo(()=>(data.bets||[]).filter(b=>b.status==='open'),[data.bets]);
  const expiringSoon = useMemo(()=>PROMO_SCHED.filter(p=>p.expires&&p.expires>=todayStr&&p.expires<=in3Days),[todayStr,in3Days]);
  const recs = useMemo(()=>{
    return PROMO_SCHED
      .filter(p=>{
        const dayMatch=p.day==="Daily"||p.day===todayDay||(p.day==="Weekend"&&isWeekend);
        if(!dayMatch) return false;
        if(!activeBooks.length) return p.grade==="A";
        return activeBooks.includes(p.book)&&!doneBooks[p.book];
      })
      .sort((a,b)=>{
        const gradeScore={A:3,B:2,C:1};
        const urgency=(x)=>expiringSoon.find(e=>e.book===x.book&&e.promo===x.promo)?2:0;
        return (gradeScore[b.grade]||0)+urgency(b)-((gradeScore[a.grade]||0)+urgency(a));
      })
      .slice(0,5);
  },[activeBooks,doneBooks,todayDay,isWeekend,expiringSoon]);
  if(!recs.length&&!openBets.length&&!limitedBooks.length) return null;
  return (
    <div style={{...S.card,border:`1px solid ${K.gn}30`,background:`${K.gn}05`,marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Today's Action Plan</div>
      {openBets.length>0&&(
        <div style={{marginBottom:8,padding:"7px 12px",background:`${K.yl}0a`,border:`1px solid ${K.yl}30`,borderRadius:6,fontSize:11,color:K.yl}}>
          ⚡ You have <strong>{openBets.length}</strong> open bet{openBets.length>1?"s":""} — check results before placing new hedges.
        </div>
      )}
      {limitedBooks.length>0&&(
        <div style={{marginBottom:8,padding:"7px 12px",background:`${K.rd}0a`,border:`1px solid ${K.rd}30`,borderRadius:6,fontSize:11,color:K.rd}}>
          ⚠ {limitedBooks.join(", ")} {limitedBooks.length>1?"are":"is"} limited/gubbed — skip these promos today.
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {recs.map((p,i)=>{
          const isUrgent=expiringSoon.find(e=>e.book===p.book&&e.promo===p.promo);
          return (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:K.s2,borderRadius:6,border:`1px solid ${isUrgent?K.rd+'60':K.bd}`}}>
            <div>
              <span style={{fontSize:12,fontWeight:700,color:K.tx}}>{p.book}</span>
              <span style={{fontSize:11,color:K.dm,marginLeft:8}}>{p.promo}</span>
              {p.complexity&&<span style={{...S.tag(p.complexity==="Easy"?K.gn:p.complexity==="Medium"?K.yl:K.rd),marginLeft:6,fontSize:8}}>{p.complexity}</span>}
              {p.timeMin&&<span style={{fontSize:9,color:K.mt,marginLeft:6}}>~{p.timeMin}m</span>}
              {isUrgent&&<span style={{...S.tag(K.rd),marginLeft:6,fontSize:8}}>EXPIRES SOON</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:700,color:K.gn}}>{p.value}</span>
              <span style={S.tag(p.grade==="A"?K.gn:p.grade==="B"?K.ac:K.mt)}>{p.grade}</span>
            </div>
          </div>
          );
        })}
      </div>
      {!activeBooks.length&&<div style={{fontSize:10,color:K.mt,marginTop:6}}>Set book statuses in the Sportsbooks tracker to get personalized recommendations.</div>}
    </div>
  );
};

// ═══ PUSH ENABLE BUTTON ═══
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
        🔔 Push beta
      </div>
    );
  }
  const toast = useToast();
  if(state === 'unsupported') return null;
  if(state === 'enabled') return (
    <div style={{fontSize:10,color:K.gn,fontWeight:600,padding:"4px 10px",background:`${K.gn}10`,border:`1px solid ${K.gn}30`,borderRadius:6}}>🔔 Push On</div>
  );
  if(state === 'denied') return (
    <div style={{fontSize:10,color:K.rd,padding:"4px 10px",background:`${K.rd}10`,border:`1px solid ${K.rd}30`,borderRadius:6}} title="Push blocked in browser settings">🔕 Push Blocked</div>
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
      if(toast) toast('🔔 Push alerts enabled! Daily briefings + arb alerts incoming.', K.gn);
    } else {
      if(toast) toast('Could not subscribe to push — try again', K.rd);
    }
  };
  return (
    <button onClick={enable} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:6,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
      🔔 Enable Push Alerts
    </button>
  );
};

// ═══ DASHBOARD HERO ═══
const DashboardHero = ({ totalProfit, openBetsCount, booksComplete, navigate }) => {
  const percent = Math.min(100, Math.round((booksComplete / BOOKS.length) * 100));
  const stage = booksComplete === 0 ? "Get Started" : booksComplete < 5 ? "Beginner" : booksComplete < 12 ? "Intermediate" : booksComplete < 20 ? "Advanced" : "Pro Grinder";
  return (
    <div style={{...S.card,background:`linear-gradient(135deg,${K.s1},${K.s2})`,border:`1px solid ${K.bd2}`,marginBottom:12,padding:"16px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:fontD,fontSize:11,fontWeight:700,color:K.ac,textTransform:"uppercase",letterSpacing:"2px",marginBottom:4}}>Grinder Level: {stage}</div>
          <div style={{fontFamily:fontD,fontSize:26,fontWeight:800,color:totalProfit>=0?K.gn:K.rd,marginBottom:4}}>
            {totalProfit>=0?"+":"-"}${f(Math.abs(totalProfit))}
          </div>
          <div style={{fontSize:11,color:K.mt}}>Total profit extracted · {booksComplete}/{BOOKS.length} books done</div>
          <div style={{height:4,background:K.s3,borderRadius:2,marginTop:8,width:220}}>
            <div style={{height:4,borderRadius:2,background:K.gn,width:`${percent}%`,transition:"width 0.4s"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {openBetsCount>0&&<div style={{padding:"10px 16px",background:`${K.yl}10`,border:`1px solid ${K.yl}30`,borderRadius:8,textAlign:"center"}}>
            <div style={{fontFamily:fontD,fontSize:18,fontWeight:800,color:K.yl}}>{openBetsCount}</div>
            <div style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Open Bets</div>
          </div>}
          <button onClick={()=>navigate('/ledger')} style={{padding:"10px 16px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:8,color:K.ac,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
            Log Profit →
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══ QUICK ADD BET ═══
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
          {open?"▲ Close":"+ Add Bet"}
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

// ═══ ONBOARDING CHECKLIST ═══
// ═══ STARTER PACK MODAL ═══
function StarterPackModal({ onClose, syncAppData, appData }) {
  const PACKS = [
    { id:'casual', label:'Casual Bettor', icon:'🎲', bankroll:'500', goal:200, hrs:'2 hrs/week', desc:'A few books, occasional promos. Perfect for weekends.' },
    { id:'hunter', label:'Promo Hunter', icon:'🎯', bankroll:'2000', goal:800, hrs:'5 hrs/week', desc:'Hit every welcome offer. Build a steady side income.' },
    { id:'grinder', label:'Full Grinder', icon:'⚡', bankroll:'5000', goal:2500, hrs:'Daily', desc:'All books, recurring promos, live scanner. Maximum extraction.' },
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
        <div style={{fontSize:12,color:K.mt,marginBottom:20}}>Choose a starter profile — sets your bankroll and profit goal. You can change these anytime.</div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
          {PACKS.map(p=>(
            <div key={p.id} onClick={()=>setSelected(p.id)}
              style={{padding:'14px 16px',background:selected===p.id?'#1e3a2f':K.s3,border:`2px solid ${selected===p.id?K.gn:K.bd}`,borderRadius:8,cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:20}}>{p.icon}</span>
                <span style={{fontWeight:700,color:K.tx,fontSize:14}}>{p.label}</span>
                <span style={{marginLeft:'auto',fontSize:10,color:K.ac,fontWeight:600}}>${parseInt(p.bankroll).toLocaleString()} bankroll · ${p.goal.toLocaleString()} goal</span>
              </div>
              <div style={{fontSize:11,color:K.mt,marginLeft:30}}>{p.desc} · {p.hrs}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{const p=PACKS.find(x=>x.id===selected);if(p)apply(p);}} disabled={!selected}
            style={{flex:1,padding:'10px',background:selected?K.gn:K.bd,border:'none',borderRadius:6,color:selected?K.bg:K.mt,fontWeight:700,fontSize:13,cursor:selected?'pointer':'not-allowed',fontFamily:font,transition:'background 0.15s'}}>
            Start with this profile →
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
    if ((appData?.sportsbooks || []).length > 0) steps.push('book');
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
    { id: 'calc', label: 'Run your first calculator', icon: '🧮' },
    { id: 'book', label: 'Add a sportsbook to your vault', icon: '📚' },
    { id: 'bet', label: 'Log your first bet or promo', icon: '📝' },
    { id: 'trial', label: 'Start your 7-day free trial', icon: '⚡' },
    { id: 'invite', label: 'Invite a friend', icon: '👥' },
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
        <button onClick={() => { localStorage.setItem('pg_onboarding_done','1'); setDone(true); }} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
      </div>
      <div style={{height:4,background:'#1e293b',borderRadius:2,marginBottom:12}}>
        <div style={{height:4,background:'#4ade80',borderRadius:2,width:`${pct}%`,transition:'width .3s'}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
        {STEPS.map(s => {
          const isDone = completed.includes(s.id);
          return (
            <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#0a0e17',borderRadius:6,opacity: isDone ? 0.5 : 1}}>
              <span style={{fontSize:16}}>{isDone ? '✅' : s.icon}</span>
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
    ? `VaultSparked Pro trial active — ${proStatus.trial_days_left} day${proStatus.trial_days_left !== 1 ? 's' : ''} left`
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
            Free Vault membership is the account layer for PromoGrind and other Studio tools. The free core product is live now; Pro and backend-dependent surfaces unlock in stages as services come online.
          </div>
        </div>
        <button onClick={dismiss} style={{background:'none',border:'none',color:K.mt,cursor:'pointer',fontSize:18,lineHeight:1,padding:0}}>×</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:10,marginBottom:12}}>
        <div style={{padding:'10px 12px',background:K.s2,border:`1px solid ${K.bd}`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:K.gn,marginBottom:4}}>Free Vault Membership</div>
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
        <button onClick={() => navigate('/bonus-bet')} style={{padding:'7px 12px',background:K.gn,border:'none',borderRadius:6,color:K.bg,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>Start with free tools →</button>
        <button onClick={() => navigate('/upgrade')} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:font}}>See Pro status</button>
        <button onClick={dismiss} style={{padding:'7px 12px',background:'transparent',border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:'pointer',fontFamily:font}}>Dismiss</button>
      </div>
    </div>
  );
}

// ═══ DAILY DASHBOARD ═══
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
  const bets = data.bets || [];
  const ledger = data.ledger || [];
  const done = data.done || {};
  const expiry = data.bookExpiry || {};
  const totalProfit = ledger.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const openBets = bets.filter(b=>b.status==='open');
  const in3Days = new Date(Date.now()+3*24*60*60*1000).toISOString().split('T')[0];
  const expiring = BOOKS.filter(b=>expiry[b.name]&&!done[b.name]&&expiry[b.name]<=in3Days&&expiry[b.name]>=todayStr);
  const todayPromos = PROMO_SCHED.filter(p => p.day === "Daily" || p.day === todayDay || (p.day === "Weekend" && (today.getDay()===0||today.getDay()===6)));
  const booksComplete = Object.values(done).filter(Boolean).length;
  const potentialLeft = BOOKS.filter(b=>!done[b.name]).reduce((s,b)=>s+b.bonus*0.7,0);
  const thisMonth = today.toISOString().slice(0,7);
  const monthProfit = ledger.filter(e=>e.date?.startsWith(thisMonth)).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);

  const dashIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };

  return (
    <div>
      {showWT&&<PromoWalkthrough navigate={navigate} onClose={()=>setShowWT(false)}/>}
      {showStarterPack&&<StarterPackModal onClose={()=>setShowStarterPack(false)} syncAppData={syncAppData} appData={data}/>}
      <DashboardHero totalProfit={totalProfit} openBetsCount={openBets.length} booksComplete={booksComplete} navigate={navigate}/>
      <MemberWelcomeCard navigate={navigate} proStatus={proStatus} />
      <LaunchReadinessPanel />
      <CommunityWinsWall />
      <OnboardingChecklist appData={data} user={true} isPro={dashIsPro} />
      {ledger.length===0&&bets.length===0&&booksComplete===0&&(
        <div style={{...S.card,border:`1px solid ${K.gn}40`,background:`${K.gn}06`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:10,textTransform:"uppercase",letterSpacing:"1.5px"}}>Getting Started — 3 Steps</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {n:"1",t:"Convert your first bonus bet",d:"Open any sportsbook app, grab a welcome promo, enter it in the Bonus Bet Converter.",slug:"bonus-bet",color:K.gn},
              {n:"2",t:"Log the result in your Ledger",d:"Track every conversion so you always know your true P/L across all books.",slug:"ledger",color:K.ac},
              {n:"3",t:"Mark books complete in Tracker",d:"Check off each sportsbook after you've claimed and converted their welcome offer.",slug:"sportsbooks",color:K.yl},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 12px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`,cursor:"pointer"}} onClick={()=>navigate("/"+s.slug)}>
                <div style={{fontSize:15,fontWeight:700,color:s.color,minWidth:20}}>{s.n}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:K.tx,marginBottom:2}}>{s.t} →</div>
                  <div style={{fontSize:10,color:K.mt,lineHeight:1.5}}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <SmartPromoRecommender data={data}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
        <div>
          <div style={{fontFamily:fontD,fontSize:18,fontWeight:700,color:K.tx,marginBottom:2}}>
            Good {today.getHours()<12?"morning":today.getHours()<17?"afternoon":"evening"}
          </div>
          <div style={{fontSize:11,color:K.mt}}>
            {todayDay}, {monthNames[today.getMonth()]} {today.getDate()} · Here&apos;s your daily promo briefing
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowWT(true)} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>▶ Promo Walkthroughs</button>
          <DailyBriefingBtn openBets={openBets} todayPromos={todayPromos}/>
          <PushEnableBtn proStatus={proStatus}/>
        </div>
      </div>
      <StateLegalAlert userState={data.userState}/>
      {streakCount>=3&&!upsellStreakDismissed&&(
        <div style={{...S.card,border:`1px solid ${K.pp}40`,background:`${K.pp}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:K.pp,marginBottom:2}}>🔥 {streakCount}-day streak! Unlock live arb alerts &amp; daily briefings with VaultSparked</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{ window.location.hash='#/upgrade'; }} style={{padding:"5px 12px",background:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font}}>Upgrade →</button>
            <button onClick={()=>{try{localStorage.setItem('pg_upsell_streak_dismissed','1');}catch{}setUpsellStreakDismissed(true);}} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>Not now</button>
          </div>
        </div>
      )}
      {proStatus?.status==='trial'&&(
        proStatus.trial_days_left>3?(
          <div style={{...S.card,border:`1px solid ${K.gn}40`,background:`${K.gn}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.gn,marginBottom:2}}>
                🎉 VaultSparked Pro Trial — {proStatus.trial_days_left} day{proStatus.trial_days_left!==1?"s":""} remaining
              </div>
              <div style={{fontSize:11,color:K.dm}}>You have full Pro access including the Live Arb Scanner and +EV Scanner.</div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access →</button>
          </div>
        ):proStatus.trial_days_left>1?(
          <div style={{...S.card,border:`1px solid ${K.yl}40`,background:`${K.yl}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.yl,marginBottom:2}}>
                ⏳ Trial ending soon — {proStatus.trial_days_left} day{proStatus.trial_days_left!==1?"s":""} left. Don't lose Pro access.
              </div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.yl,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access →</button>
          </div>
        ):(
          <div style={{...S.card,border:`1px solid ${K.rd}40`,background:`${K.rd}08`,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:K.rd,marginBottom:2}}>
                🚨 Trial expires tomorrow. Upgrade now to keep the Live Scanner and AI features.
              </div>
            </div>
            <button onClick={()=>navigateProp('/upgrade')} style={{padding:"5px 14px",background:K.rd,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>Upgrade to keep access →</button>
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
          <div style={{fontSize:9,color:K.mt,marginBottom:4}} title="% of days you've visited in your active period">CONSISTENCY ⓘ</div>
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
          ⚠ Expiring soon: {expiring.map(b=>`${b.name} (${expiry[b.name]})`).join(", ")}
        </div>
      )}
      {todayPromos.length>0&&(
        <div style={{...S.card,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Today&apos;s Promos — {todayDay}</div>
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
              {a.label} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══ DEPOSIT OPTIMIZER ═══
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

// ═══ HEDGE VALIDATOR ═══
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
      {bothPos&&<div style={{...S.note(K.rd),marginBottom:8}}>Both sides are favorites — this may not be a valid hedge. Verify you are betting opposite outcomes.</div>}
      {bothNeg&&<div style={{...S.note(K.yl),marginBottom:8}}>Both sides are dogs — verify you are betting opposite outcomes.</div>}
      <div style={{...S.res(isValidHedge),marginBottom:8}}>
        <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Odds Relationship</div>
        <div style={{fontSize:12,fontWeight:600,color:ipSum>100&&ipSum<110?K.gn:ipSum>=110&&ipSum<=120?K.yl:ipSum<100?K.gn:K.rd}}>
          {ipSum<100?"Possible arb opportunity!":ipSum<110?"Plausible market":ipSum<120?"High vig market":"Unusual — double check these lines"}
          {" "}({f(ipSum,1)}% combined implied)
        </div>
        {gProfit!==null&&<div style={{marginTop:8}}>
          <span style={S.big(gProfit>=0?K.gn:K.rd)}>{gProfit>=0?"+":""}${f(gProfit)}</span>
          <span style={{fontSize:12,color:K.dm,marginLeft:8}}>{gProfit>=0?"guaranteed profit":"loss if either outcome"}</span>
        </div>}
        {pBW!==null&&<RR l="If Side A wins" v={`${pBW>=0?"+":""}$${f(pBW)}`} c={pBW>=0?K.gn:K.rd}/>}
        {pHW!==null&&<RR l="If Side B wins" v={`${pHW>=0?"+":""}$${f(pHW)}`} c={pHW>=0?K.gn:K.rd}/>}
        {gProfit!==null&&gProfit<-0.5&&<Nt c={K.rd}>INVALID HEDGE — you will lose ${f(Math.abs(gProfit))} on the worse outcome. Adjust your stakes.</Nt>}
        {gProfit!==null&&gProfit>=0&&<Nt c={K.gn}>Valid hedge. Profit guaranteed regardless of outcome.</Nt>}
      </div>
    </div>}
  </div>
  <Help entries={[
    ["What is a hedge","A bet on the opposite outcome at a different sportsbook to guarantee profit regardless of who wins."],
    ["Common mistake 1","Hedging at the SAME sportsbook — books may void both bets if they detect same-game hedging."],
    ["Common mistake 2","Both sides at positive odds does NOT always mean it is a valid hedge — it depends on whether they cover opposite outcomes."],
    ["Common mistake 3","Wrong stake amounts — use Side B blank auto-compute to get the exactly correct hedge stake."],
  ]}/></div>);
};

// ═══ PROMO GUARANTEE ═══
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
        <span style={S.big(K.gn)}>${f(loEst)} – ${f(hiEst)}</span>
      </div>
      <div style={{fontSize:11,color:K.dm,marginBottom:8}}>Estimated guaranteed profit range</div>
      <RR l="Conversion rate range" v={`${Math.round(pt.rate[0]*100)}% – ${Math.round(pt.rate[1]*100)}%`} c={K.yl}/>
      <RR l="Confidence" v={pt.conf||"MEDIUM"} c={confColor[pt.conf||"MEDIUM"]} b/>
      <RR l="Steps to convert" v={`${pt.steps} steps`} c={K.ac}/>
      <Nt c={K.ac}>→ Use the {pt.label} calculator to run the exact math for your odds.</Nt>
      {relatedPromos.length>0&&<div style={{marginTop:8}}>
        <div style={{fontSize:10,color:K.mt,marginBottom:4}}>Books with this promo type:</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{relatedPromos.map(p=><span key={p.book+p.promo} style={S.tag(K.ac)}>{p.book}</span>)}</div>
      </div>}
    </div>}
  </div>
  <Help entries={[
    ["Bonus Bet","A free bet credit — only the profit is returned. 70-75% conversion rate at ideal odds (+250 to +400)."],
    ["First Bet Insurance","Your first real-cash bet is refunded as bonus bets if it loses. Convert those at 70%."],
    ["Profit Boost","Percentage increase to your winnings. 40-55% of the boost value is extractable as guaranteed profit."],
    ["Reload Match","Book matches 20% of your deposit as bonus funds. Factor in rollover requirements (~4.5% vig cost)."],
  ]}/></div>);
};

// ═══ GUT CHECK ═══
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
          {oppositeSides?"VALID — opposite sides":bothPlus?"MAYBE — both sides show value":"Check manually"}
        </span>
      </div>
      <RR l="Combined implied probability" v={`${f(ipSum,1)}%`} c={ipSum<100?K.gn:ipSum<110?K.gn:ipSum<120?K.yl:K.rd}/>
      <div style={{marginBottom:8,fontSize:12,fontWeight:600,color:ipSum<100?K.gn:ipSum<110?K.gn:ipSum<120?K.yl:K.rd}}>
        {ipSum<100?"Possible arb opportunity!":ipSum<110?"Plausible market":ipSum<120?"High vig market":"Unusual — double check these lines"}
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

// ═══ FREE BET ARB TRACKER ═══
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
    if(toast) toast('✓ Arb logged',K.gn);
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
      {arbs.length>0&&<button onClick={exportCSV} style={{marginLeft:"auto",padding:"7px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,fontWeight:600}}>↓ Export CSV</button>}
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
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.amount?`$${a.amount}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{a.hedgeAmt?`$${a.hedgeAmt}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(a.profit)>=0?K.gn:K.rd,fontWeight:600}}>{a.profit?`${parseFloat(a.profit)>=0?"+":""}$${a.profit}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(a.status==="won"?K.gn:a.status==="lost"?K.rd:K.yl)}>{a.status}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span onClick={()=>del(a.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}}>✕</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>}
    {arbs.length===0&&<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
      <div style={{fontSize:32,marginBottom:8}}>🎯</div>
      <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No arb plays tracked yet</div>
      <div style={{fontSize:11,color:K.mt}}>Log your free bet arb plays above to track performance.</div>
    </div>}
    <Help entries={[
      ["Free Bet Arb","Using a free bet or bonus bet on one side of a market, and a real cash bet on the other side at a different book to guarantee profit."],
      ["Same-Game Arb","Two bets within the same game at different books where combined implied probability is under 100%."],
    ]}/>
  </div>);
};

// ═══ v9.0 NEW COMPONENTS ═══

// ═══ PROMO STACKING CALCULATOR ═══
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
      <Nt c={r.ok?K.gn:K.yl}>{r.ok?"Positive EV after stacking boost and insurance.":"Check boost/insurance terms — may not be stackable at all books."}</Nt>
    </div>}
  </div>
  <Help entries={[
    ["Promo Stacking","Combining a profit boost with an insurance/refund on the same bet for maximum value extraction."],
    ["Boost Value","The extra profit added to your winnings above normal. Capped by Boost Max."],
    ["Insurance","If your bet loses, you get a portion back as bonus bets. Value = Insurance Amount × Conversion Rate."],
    ["EV","Expected value weighs the if-win and if-lose scenarios by their probabilities."],
  ]}/></div>);
};

// ═══ PROMO TRADE JOURNAL ═══
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
    if(toast) toast('✓ Journal entry added',K.gn);
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
    <div style={{marginBottom:12}}><label style={S.label}>Notes</label><textarea style={{...S.input,height:64,resize:"vertical"}} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="What promo, outcome, lessons learned…"/></div>
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
      <div style={{fontSize:24,marginBottom:8}}>📓</div>
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
          <span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:11,flexShrink:0}}>✕</span>
        </div>
      </div>
    ))}
  </div>);
};

// ═══ ODDS COMPARISON TABLE ═══
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
                {badge&&<span style={{position:"absolute",top:2,right:4,fontSize:9,fontWeight:700,color:badge==="up"?K.gn:K.rd,pointerEvents:"none",animation:"fadeIn 0.2s"}}>{badge==="up"?"▲":"▼"}</span>}
              </td>);
            })}
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`,color:K.gn,fontWeight:700,fontSize:12}}>
              {bestBook&&<div>{bestBook.val}<div style={{fontSize:9,color:K.mt}}>{bestBook.book}</div></div>}
              {spread&&<div style={{fontSize:9,color:K.yl}}>+{spread}¢ vs worst</div>}
            </td>
            <td style={{padding:"4px 8px",borderBottom:`1px solid ${K.bd}`}}>
              {rows.length>1&&<span onClick={()=>removeRow(i)} style={{cursor:"pointer",color:K.rd,fontSize:11}}>✕</span>}
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>
    <button onClick={addRow} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.gn,fontSize:11,cursor:"pointer",fontFamily:font}}>+ Add Event</button>
    <Nt c={K.ac}>Green cells = best odds in that row. ▲▼ badges show when a line moves. Always bet where the odds are highest for your side.</Nt>
  </div>);
};

// ═══ PROMO ARB FINDER ═══
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

// ═══ STATE LEGAL ALERT ═══
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
            <div style={{fontSize:13,fontWeight:700,color:K.gn,marginBottom:4}}>🎉 Your state [{userState}] recently launched sports betting!</div>
            <div style={{fontSize:12,color:K.dm,marginBottom:4}}>{recent.note}</div>
            <div style={{fontSize:11,color:K.dm}}>DraftKings, FanDuel, BetMGM, and Caesars are all available. Check the Sportsbooks tab to start tracking.</div>
          </>}
          {comingSoon&&!recent&&<>
            <div style={{fontSize:13,fontWeight:700,color:K.yl,marginBottom:4}}>⏳ Sports betting is not yet available in your state ({userState})</div>
            <div style={{fontSize:11,color:K.dm}}>We'll keep the tools ready for when it launches. Set your state in the Sportsbooks tab to get updates.</div>
          </>}
        </div>
        <button onClick={dismiss} style={{background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:14,padding:"0 4px",flexShrink:0}}>✕</button>
      </div>
    </div>
  );
};

// ═══ WEEKLY GRIND REPORT ═══
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
    const bestDay = report.best ? new Date(report.best.date).toLocaleDateString('en-US',{weekday:'short'}) : '—';
    const text = `📊 PromoGrind Weekly Report — Week of ${report.monStr}\nBets logged: ${report.bets} | P/L: ${parseFloat(report.pl)>=0?'+':''}$${report.pl} | Win rate: ${report.winRate}%\nBest day: ${bestDay} +$${report.best?f(parseFloat(report.best.profit)):'0'} | Current streak: ${report.streak} wins\n${CANONICAL_APP_URL}`;
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
          <button onClick={copyReport} style={{padding:"6px 14px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>{copied?"✓ Copied!":"📋 Copy Report"}</button>
          <button onClick={()=>setReport(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Regenerate</button>
        </div>
      </>}
    </div>
  );
};

// ═══ BANKROLL ALLOCATION WIZARD ═══
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

// ═══ PROMO WALKTHROUGHS ═══
const WALKTHROUGHS = [
  {
    title:"DraftKings $200 Bonus Bet",
    steps:[
      {n:"Sign Up",body:"Create a new DraftKings account via a promo link. Deposit $5+."},
      {n:"Place Qualifying Bet",body:"Bet $5+ on any market at -500 odds or better. Your $200 bonus bet arrives within 72 hours."},
      {n:"Find Your Line",body:"Use the Bonus Bet Converter. Look for an underdog at +250 to +400. Sweet spot gives 65-72% conversion."},
      {n:"Lock In Profit",body:"Place $200 bonus bet on underdog at Book A. Hedge with calculated cash amount on favorite at FanDuel or BetMGM. Collect ~$130-144 guaranteed."},
    ],
    calcSlug:"bonus-bet"
  },
  {
    title:"FanDuel 25% Profit Boost",
    steps:[
      {n:"Claim the Boost",body:"Open FanDuel app, go to Promos tab. Claim the 25% profit boost token (max $10 boost, typically on a $40 bet)."},
      {n:"Find a Sharp Line",body:"Use No-Vig calculator to find the sharpest market — typically NFL spreads or NBA moneylines. Aim for -110 or better."},
      {n:"Calculate Your Edge",body:"Enter your bet size, odds, 25% boost, and $10 max into the Profit Boost Calculator. Note the effective boosted odds."},
      {n:"Hedge for Guaranteed Profit",body:"Place boosted bet at FanDuel. Hedge the stake+boost payout at another book. Lock in $6-10 regardless of outcome."},
    ],
    calcSlug:"profit-boost"
  },
  {
    title:"BetMGM First Bet Insurance",
    steps:[
      {n:"Sign Up & Deposit",body:"Create BetMGM account. Deposit up to $1,500 — this is your insurance amount. First bet must be $10+."},
      {n:"Place First Bet Strategically",body:"Use the First Bet Hedge Calculator. Place a large first bet on a near-50/50 market (moneyline close to -110/-110)."},
      {n:"If It Wins",body:"Great — you just won real money on your first bet. No bonus needed. Move on to regular promo hunting."},
      {n:"If It Loses — Collect Bonus",body:"BetMGM returns your stake as bonus bets (up to $1,500). Use Bonus Bet Converter to extract 65-72% as cash."},
    ],
    calcSlug:"first-bet"
  },
];

const PromoWalkthrough = ({ navigate, onClose }) => {
  const [selectedWT, setSelectedWT] = useState(0);
  const [wtStep, setWtStep] = useState(0);
  const wt = WALKTHROUGHS[selectedWT];
  const step = wt.steps[wtStep];
  const isCalcStep = wtStep >= 2;
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:K.s1,border:`1px solid ${K.bd2}`,borderRadius:12,maxWidth:720,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${K.bd}`}}>
          <div style={{fontFamily:fontD,fontSize:16,fontWeight:700,color:K.tx}}>Promo Walkthroughs</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:K.mt,cursor:"pointer",fontSize:18,padding:"0 4px"}}>✕</button>
        </div>
        <div style={{display:"flex",minHeight:360}}>
          <div style={{width:200,borderRight:`1px solid ${K.bd}`,padding:12,flexShrink:0}}>
            {WALKTHROUGHS.map((w,i)=>(
              <button key={i} onClick={()=>{setSelectedWT(i);setWtStep(0);}} style={{width:"100%",textAlign:"left",padding:"10px 12px",background:selectedWT===i?`${K.ac}15`:"transparent",border:`1px solid ${selectedWT===i?K.ac:K.bd}`,borderRadius:6,color:selectedWT===i?K.ac:K.dm,fontSize:11,cursor:"pointer",fontFamily:font,marginBottom:6,lineHeight:1.4}}>{w.title}</button>
            ))}
          </div>
          <div style={{flex:1,padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:4,fontFamily:fontD}}>{wt.title}</div>
            <div style={{fontSize:10,color:K.mt,marginBottom:16}}>Step {wtStep+1} of {wt.steps.length}</div>
            <div style={{display:"flex",gap:4,marginBottom:20}}>
              {wt.steps.map((_,i)=>(
                <div key={i} style={{height:4,flex:1,borderRadius:2,background:i<=wtStep?K.ac:K.bd2,transition:"background 0.2s"}}/>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:20}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:K.ac,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:K.bg,fontSize:14,flexShrink:0}}>{wtStep+1}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:K.tx,marginBottom:6,fontFamily:fontD}}>{step.n}</div>
                <div style={{fontSize:12,color:K.dm,lineHeight:1.7}}>{step.body}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {wtStep>0&&<button onClick={()=>setWtStep(s=>s-1)} style={{padding:"7px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,cursor:"pointer",fontFamily:font}}>← Prev</button>}
              {wtStep<wt.steps.length-1&&<button onClick={()=>setWtStep(s=>s+1)} style={{padding:"7px 16px",background:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Next →</button>}
              {isCalcStep&&<button onClick={()=>{navigate('/'+wt.calcSlug);onClose();}} style={{padding:"7px 16px",background:`${K.gn}15`,border:`1px solid ${K.gn}30`,borderRadius:6,color:K.gn,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Open Calculator →</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// FX, CurrencyCtx → ./contexts.jsx
const useCurrency = () => React.useContext(CurrencyCtx);

// ═══ DAILY ROUTINE PANEL ═══
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
  if(openBetsCount>3) alerts.push(`⚠ ${openBetsCount} open bets need attention`);
  if(expiringCount>0) alerts.push(`🔥 ${expiringCount} promos expiring soon`);
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:K.tx,marginBottom:10,fontFamily:fontD}}>Today's Grind</div>
      {alerts.map((a,i)=><div key={i} style={{fontSize:11,color:K.yl,fontWeight:600,marginBottom:6}}>{a}</div>)}
      {tasks.map((task,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${K.bd}`}}>
          <div role="checkbox" aria-checked={!!checks[i]} onClick={()=>setChecks(c=>({...c,[i]:!c[i]}))} style={{width:16,height:16,borderRadius:3,border:`2px solid ${checks[i]?K.gn:K.bd2}`,background:checks[i]?K.gn:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {checks[i]&&<span style={{color:K.bg,fontSize:10,fontWeight:700}}>✓</span>}
          </div>
          <span style={{fontSize:12,color:checks[i]?K.mt:K.tx,textDecoration:checks[i]?"line-through":"none"}}>{i+1}. {task}</span>
        </div>
      ))}
    </div>
  );
};

// ═══ PROFIT GOAL MILESTONE ═══
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
          🎉🎉🎉 GOAL REACHED! 🎉🎉🎉
          <style>{`@keyframes pulse{from{opacity:0.7}to{opacity:1}}`}</style>
        </div>}
      </>}
      {!goal&&!showInput&&<div style={{fontSize:11,color:K.mt}}>Set a profit goal to track your progress.</div>}
    </div>
  );
};

// ═══ DAILY BRIEFING ═══
const useDailyBriefing = (openBets, todayPromos) => {
  useEffect(()=>{
    try {
      const enabled = localStorage.getItem('pg_daily_brief')==='true';
      if(!enabled) return;
      const now = new Date();
      const hour = now.getHours(), min = now.getMinutes();
      if(hour!==9||(min>15)) return;
      const todayStr = now.toISOString().split('T')[0];
      if(localStorage.getItem('pg_brief_shown_today')===todayStr) return;
      if(typeof Notification!=='undefined'&&Notification.permission==='granted') {
        const openCount = openBets?.length||0;
        const body = `${openCount} open bet${openCount!==1?"s":""} pending. ${todayPromos?.length||0} promos available today.`;
        new Notification('PromoGrind Daily Briefing',{body, icon:'/promogrind/favicon.ico'});
        localStorage.setItem('pg_brief_shown_today', todayStr);
      }
    } catch(e) {}
  },[]);
};

const DailyBriefingBtn = ({ openBets, todayPromos }) => {
  useDailyBriefing(openBets, todayPromos);
  const [enabled, setEnabled] = useState(()=>{ try{return localStorage.getItem('pg_daily_brief')==='true';}catch{return false;} });
  const isPro = ()=>{ try{return ['vault_sparked','pro'].includes(localStorage.getItem('pg_pro_status')||'');}catch{return false;} };
  if(!isPro()&&!enabled) return null;
  const toggle = async () => {
    if(!enabled) {
      if(typeof Notification==='undefined') return;
      const perm = await Notification.requestPermission();
      if(perm==='granted') { try{localStorage.setItem('pg_daily_brief','true');}catch{} setEnabled(true); }
    } else {
      try{localStorage.setItem('pg_daily_brief','false');}catch{}
      setEnabled(false);
    }
  };
  return (
    <button onClick={toggle} style={{padding:"5px 12px",background:enabled?`${K.gn}15`:"transparent",border:`1px solid ${enabled?K.gn:K.bd2}`,borderRadius:6,color:enabled?K.gn:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap"}}>
      {enabled?"🔔 9am Briefing ON":"🔕 Enable 9am Briefing"}
    </button>
  );
};

// ═══ MULTI-BOOK EXPOSURE DASHBOARD ═══
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

// ═══ TOP TOOLS PANEL ═══
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

// ═══ COPY MY SETUP ═══
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
      "💰 PromoGrind Setup",
      `State: ${data.userState||"Not set"} · Bankroll: ${bankroll?"$"+bankroll:"Not set"}`,
      `Books done: ${booksComplete}/${BOOKS.length} · Total profit: $${f(totalProfit)}`,
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
          <button onClick={copyLink} style={{padding:"7px 14px",background:copied?K.gn:K.ac,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"✓ Copied!":"Copy Setup Link"}</button>
          <button onClick={shareCard} style={{padding:"7px 14px",background:cardCopied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{cardCopied?"✓ Copied!":"Share Card"}</button>
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

// TaxTimingAdvisor → ./components/Ledger.jsx
// ═══ BET SLIP TEXT PARSER ═══
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

// ═══ COMMUNITY PROMOS ═══
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
          <div style={{fontSize:12,color:'#64748b'}}>User-submitted sportsbook offers — upvote the best ones</div>
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
        <div style={{color:'#64748b',textAlign:'center',padding:32}}>Loading community promos…</div>
      ) : promos.length === 0 ? (
        <div style={{color:'#64748b',textAlign:'center',padding:32}}>
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          <div>No promos yet — be the first to submit one!</div>
        </div>
      ) : promos.map(p => (
        <div key={p.id} style={{padding:14,background:'#0f1724',border:'1px solid #1e293b',borderRadius:8,marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
          <button onClick={() => upvote(p.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 10px',background:'#0a0e17',border:'1px solid #1e293b',borderRadius:6,cursor:'pointer',minWidth:44}}>
            <span style={{color:'#4ade80',fontSize:14}}>▲</span>
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

// TaxesEstimator → ./components/TaxesEstimator.jsx
const TABS = [
  { group:"Home", items:[
    {n:"Dashboard",slug:"dashboard",c:DailyDashboard},
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
    {n:"Taxes Estimator",slug:"taxes-estimator",c:TaxesEstimatorWrapper,subcat:"Advanced",icon:"🧾"},
  ]},
  { group:"Track", items:[
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
        <button onClick={()=>{try{navigator.clipboard.writeText(sessionCard);}catch(e){} setSsCopied(true);setTimeout(()=>setSsCopied(false),2000);}} style={{flex:1,padding:"8px",background:ssCopied?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>{ssCopied?"✓ Copied!":"Share Session"}</button>
        <button onClick={onClose} style={{padding:"8px 16px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font,fontSize:11}}>Close</button>
      </div>
    </div>
  </div>);
};

// ═══ EMAIL CAPTURE ═══
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
      <span style={{fontSize:12,color:K.gn,fontWeight:600}}>✓ Subscribed to weekly promo tips</span>
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
        <option value="3x">3× per week</option>
        <option value="weekly">Weekly digest</option>
      </select>
      <button onClick={subscribe} disabled={status==='loading'} style={{padding:"9px 20px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:fontD,whiteSpace:"nowrap",opacity:status==='loading'?0.7:1}}>
        {status==='loading'?"Subscribing…":"Subscribe — it's free"}
      </button>
      {status==='error'&&<div style={{fontSize:11,color:K.rd,width:"100%"}}>Something went wrong. Try again.</div>}
    </div>
  );
};

// ═══ FOOTER ═══
const Footer = () => (
  <div style={{borderTop:`1px solid ${K.bd}`,padding:"28px 20px",marginTop:8}}>
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Affiliate Disclosure:</span> Some links on this page are affiliate links. If you sign up at a sportsbook through these links, we may earn a commission at no extra cost to you. This does not influence our calculator results or editorial content.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        <span style={{color:K.dm,fontWeight:600}}>Access:</span> PromoGrind uses free Vault membership accounts for login and sync across VaultSpark Studio products.
      </p>
      <p style={{fontSize:11,color:K.mt,lineHeight:1.9,marginBottom:8}}>
        Must be 21+ (18+ in some states). Sports betting available only where legal. Gambling winnings are taxable income. This is an educational math tool — not gambling advice. If you or someone you know has a gambling problem, call <span style={{color:K.rd,fontWeight:600}}>1-800-GAMBLER</span>.
      </p>
      <p style={{fontSize:10,color:K.bd2,marginTop:12,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <span>© {new Date().getFullYear()} · Powered by <a href="https://vaultsparkstudios.com/" rel="author" target="_blank" style={{color:"inherit",textDecoration:"none"}}>VaultSpark Studios</a> · PromoGrind is a free educational calculator tool.</span>
        <a href="/promogrind/privacy/" style={{color:K.mt,textDecoration:"none"}}>Privacy Policy</a>
        <a href="/promogrind/terms/" style={{color:K.mt,textDecoration:"none"}}>Terms of Service</a>
        <a href="/promogrind/landing/" style={{color:K.mt,textDecoration:"none"}}>About</a>
      </p>
    </div>
  </div>
);

// PromoChat → ./components/PromoChat.jsx
// ═══ MAIN APP ═══
export default function App() {
  const [authReady, setAuthReady] = useState(() => {
    // Optimistic: show app immediately if Supabase has a cached token
    try { return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('-auth-token')); } catch { return false; }
  });
  const [proStatus, setProStatus] = useState(null);
  const [showPromoAdvisor, setShowPromoAdvisor] = useState(false);
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('pg_theme') !== 'light'; } catch { return true; } });
  Object.assign(K, darkMode ? KD : KL);
  useEffect(() => { try { localStorage.setItem('pg_theme', darkMode ? 'dark' : 'light'); } catch {} document.body.style.background = K.bg; document.body.style.color = K.tx; if (darkMode) { document.body.classList.remove('light'); } else { document.body.classList.add('light'); } }, [darkMode]);
  const toggleTheme = () => setDarkMode(d => !d);
  const [compactMode, setCompactMode] = useState(() => {
    try { return localStorage.getItem('pg_compact')==='true'; } catch { return false; }
  });
  const toggleCompact = () => setCompactMode(c => { const n=!c; try{localStorage.setItem('pg_compact',String(n));}catch{}; return n; });
  const [appData, setAppData] = useState(() => { try { return JSON.parse(localStorage.getItem('promo_engine_v3'))||{}; } catch { return {}; } });
  const [syncStatus, setSyncStatus] = useState(null);
  const syncTimer = useRef(null);
  const [calcSubcat, setCalcSubcat] = useState("All");
  const [currency, setCurrency] = useState(()=>{ try{return localStorage.getItem('pg_currency')||'USD';}catch{return 'USD';} });
  const currencyCtxVal = useMemo(()=>{ const fx=FX[currency]||FX.USD; return {...fx,fmt:(n)=>fx.sym+f(n*(fx.rate||1))}; },[currency]);
  const [isOnline, setIsOnline] = useState(() => { try { return navigator.onLine; } catch { return true; } });
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      try {
        if(localStorage.getItem('pg_sync_pending')) {
          saveData(appData).then(()=>localStorage.removeItem('pg_sync_pending')).catch(()=>{});
        }
      } catch(e) {}
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);
  useEffect(() => { loadData().then(d => { if(d) setAppData(d); }); }, []);
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
  const syncAppData = (d) => {
    setAppData(d);
    setSyncStatus('syncing');
    saveData(d).then(() => {
      setSyncStatus('saved');
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => setSyncStatus(null), 2000);
    }).catch(() => {
      setSyncStatus(null);
      try { localStorage.setItem('pg_sync_pending', 'true'); } catch(e) {}
    });
  };
  const [showCalcSearch, setShowCalcSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
  });
  const dismissOnboarding = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setShowOnboarding(false);
  };
  const prevSlugRef = useRef(null);
  const tabMemory = useRef({});
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
          try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification(`PromoGrind: $${m} milestone reached! 🎉`,{body:`You've extracted $${m}+ in total profit. Keep grinding!`,icon:'/promogrind/favicon.svg'});}catch(e){}
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
            new Notification('PromoGrind: Profit Goal Reached! 🎯',{body:`You hit your $${f(goal)} profit goal! Time to set a new one.`,icon:'/promogrind/favicon.svg'});
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

  // Auth + subscription load
  useEffect(() => {
    checkAuth().then(async ok => {
      if (ok) {
        setAuthReady(true);
        try { window.plausible?.('vault_member_login'); } catch {}
        onDailyLogin();
        getSubscription().then(setProStatus);
        // Record referral if this user arrived via a referral link
        try {
          const refCode = localStorage.getItem('pg_ref');
          if (refCode) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && refCode !== session.user.id) {
              await supabase.from('referrals').insert({
                referrer_id: refCode,
                referred_user_id: session.user.id,
              });
              localStorage.removeItem('pg_ref');
            }
          }
        } catch(e) { /* non-critical — duplicate insert hits UNIQUE constraint silently */ }
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
    visitedSlugsRef.current.add(slug);
    if (gi === 1 || gi === 2) onCalculation(slug);
    try {
      const log = JSON.parse(localStorage.getItem('pg_usage_log')||'{}');
      const wasEmpty = Object.keys(log).length === 0;
      log[slug] = (log[slug]||0)+1;
      localStorage.setItem('pg_usage_log', JSON.stringify(log));
      if(wasEmpty) window.plausible?.('first_calc_run');
    } catch(e) {}
  }, [slug, authReady, gi]);

  const goTo = (newGi, newTi) => {
    const resolvedTi = newTi !== undefined ? newTi : (tabMemory.current[newGi] ?? 0);
    tabMemory.current[newGi] = resolvedTi;
    navigate("/" + TABS[newGi].items[resolvedTi].slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            PromoGrind uses the shared Vault identity system. Creating a free Vault membership gives you access to the app plus sync across all Studio tools.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24,textAlign:"left"}}>
            {[
              ["27 Free Calculators","Bonus bets, profit boosts, arb, Kelly, EV, parlay, and more"],
              ["Free Vault Membership","One free account unlocks PromoGrind and cross-project sync."],
              ["Live Arb + EV Scanner","Real-time opportunities across 40+ books. VaultSparked Pro."],
            ].map(([title,desc])=>(
              <div key={title} style={{display:"flex",gap:10,padding:"10px 14px",background:K.s1,border:`1px solid ${K.bd}`,borderRadius:8}}>
                <span style={{color:K.gn,fontWeight:700,marginTop:1}}>✓</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:K.tx}}>{title}</div>
                  <div style={{fontSize:11,color:K.mt,marginTop:2}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",marginBottom:14}}>
            <a href={FREE_VAULT_MEMBERSHIP_URL} style={{padding:"8px 14px",background:`${K.gn}15`,border:`1px solid ${K.gn}30`,borderRadius:6,color:K.gn,fontSize:11,fontWeight:700,textDecoration:"none"}}>Create Free Vault Membership</a>
            <a href={CANONICAL_APP_URL} style={{padding:"8px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.dm,fontSize:11,fontWeight:700,textDecoration:"none"}}>Reload App</a>
          </div>
          <div style={{fontSize:10,color:K.mt,letterSpacing:"1.5px",textTransform:"uppercase"}}>Connecting your vault…</div>
        </div>
      </div>
    );
  }

  if (embedMode) {
    return (
      <ToastProvider>
      <AppDataCtx.Provider value={{ appData, syncAppData }}>
      <CompactCtx.Provider value={compactMode}>
      <CurrencyCtx.Provider value={currencyCtxVal}>
      <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh",padding:16}}>
        <ErrorBoundary>
          {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
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
    <AppDataCtx.Provider value={{ appData, syncAppData }}>
    <CompactCtx.Provider value={compactMode}>
    <CurrencyCtx.Provider value={currencyCtxVal}>
    <div style={{fontFamily:font,fontSize:13,color:K.tx,background:K.bg,minHeight:"100vh"}}>
      <TrustStrip/>
      {!isOnline && (
        <div style={{background:`${K.rd}15`,borderBottom:`1px solid ${K.rd}40`,padding:"6px 20px",textAlign:"center",fontSize:11,color:K.rd,fontWeight:600,letterSpacing:"0.5px"}}>
          OFFLINE MODE — Changes will sync when connection is restored
        </div>
      )}
      {showSessionModal&&<SessionModal appData={appData} visitedSlugsRef={visitedSlugsRef} onClose={()=>setShowSessionModal(false)}/>}
      {showOnboarding && <OnboardingWizard onDone={dismissOnboarding}/>}
      {showCalcSearch && <CalcSearch allCalcs={allCalcs} onNavigate={handleCalcNavigate} onClose={()=>setShowCalcSearch(false)}/>}
      <div style={{background:`linear-gradient(135deg,${K.s1},${K.s2})`,borderBottom:`1px solid ${K.bd}`,padding:"16px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{cursor:"pointer"}} onClick={()=>navigate("/"+DEFAULT_SLUG)}>
            <div style={{fontFamily:fontD,fontSize:20,fontWeight:700,color:K.gn}}>PROMOGRIND</div>
            <div style={{fontSize:10,color:K.mt,letterSpacing:"2px",textTransform:"uppercase",marginTop:2}}>Free Sportsbook Promo Conversion Tools</div>
            <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
              {[["27","Calculators"],["Free","Vault Membership"],["vs $99-199/mo","Competitors charge"]].map(([val,label])=>(
                <div key={label} style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:K.gn,fontFamily:fontD}}>{val}</span>
                  <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>{label}</span>
                </div>
              ))}
              {weeklyActive>0&&<div style={{display:"flex",alignItems:"baseline",gap:4}}>
                <span style={{fontSize:12,fontWeight:700,color:K.gn,fontFamily:fontD}}>{weeklyActive}</span>
                <span style={{fontSize:9,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>grinders this week</span>
              </div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <DailyStreak/>
            {FEATURE_FLAGS.promoAdvisor && <button
              onClick={() => setShowPromoAdvisor(v => !v)}
              title="Promo Advisor — analyze any sportsbook promo instantly"
              style={{padding:"4px 10px",background:showPromoAdvisor?`${K.pp}20`:"transparent",border:`1px solid ${showPromoAdvisor?K.pp:K.bd2}`,borderRadius:6,color:showPromoAdvisor?K.pp:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}
            >
              💡 Advisor
            </button>}
            {proStatus?.status === "active" && (
              <div style={{fontSize:10,fontWeight:700,color:K.pp,background:`${K.pp}15`,padding:"3px 10px",borderRadius:50,letterSpacing:"1px"}}>PRO</div>
            )}
            {syncStatus && <span style={{fontSize:9,color:syncStatus==='syncing'?K.yl:K.gn,fontFamily:font,letterSpacing:"0.5px",transition:"opacity 0.3s"}}>{syncStatus==='syncing'?'SYNCING…':'✓ SAVED'}</span>}
            <select value={currency} onChange={e=>{setCurrency(e.target.value);try{localStorage.setItem('pg_currency',e.target.value);}catch{}}} style={{...S.input,width:"auto",padding:"4px 8px",fontSize:10}}>
              {Object.entries(FX).map(([code,{sym}])=><option key={code} value={code}>{code} ({sym})</option>)}
            </select>
            {currency!=='USD'&&<span style={{fontSize:9,color:K.yl,letterSpacing:"0.5px"}}>Showing {currency} estimates. Rates approximate.</span>}
            <button onClick={()=>setShowSessionModal(true)} title="Session summary" style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>
              Session
            </button>
            <button onClick={toggleCompact} title={compactMode?"Show help sections":"Hide help sections"} style={{padding:"4px 10px",background:compactMode?`${K.ac}15`:"transparent",border:`1px solid ${compactMode?K.ac:K.bd2}`,borderRadius:6,color:compactMode?K.ac:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>
              {compactMode?"FULL":"COMPACT"}
            </button>
            <button onClick={toggleTheme} title={darkMode?"Switch to light mode":"Switch to dark mode"} style={{padding:"4px 10px",background:darkMode?"transparent":`${K.yl}15`,border:`1px solid ${darkMode?K.bd2:K.yl}`,borderRadius:6,color:darkMode?K.mt:K.yl,fontSize:10,cursor:"pointer",fontFamily:font}}>
              {darkMode?"☀ LIGHT":"🌙 DARK"}
            </button>
            <div style={{fontSize:10,color:K.mt,textAlign:"right",lineHeight:1.6}}>Free educational tool. Not gambling advice.<br/>21+ only. Gamble responsibly. 1-800-GAMBLER</div>
          </div>
        </div>
      </div>
      <div style={{background:K.s1,borderBottom:`1px solid ${K.bd}`,display:"flex",justifyContent:"center",overflowX:"auto"}}>
        <div style={{display:"flex",maxWidth:1100,width:"100%"}}>{TABS.map((t,i)=>(
          <button key={t.group} onClick={()=>goTo(i,0)} style={{padding:"11px 18px",fontSize:11,fontWeight:gi===i?700:400,color:gi===i?K.gn:K.mt,background:gi===i?`${K.gn}08`:"transparent",border:"none",borderBottom:gi===i?`2px solid ${K.gn}`:"2px solid transparent",cursor:"pointer",fontFamily:font,textTransform:"uppercase",letterSpacing:"1px"}}>{t.group}</button>
        ))}</div>
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
                  style={{padding:"2px 10px",background:slug===favSlug?`${K.yl}20`:"transparent",border:`1px solid ${slug===favSlug?K.yl:K.bd2}`,borderRadius:50,color:slug===favSlug?K.yl:K.dm,fontSize:9,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
                  ★ {favItem.n}
                  <span onClick={e=>{e.stopPropagation();const next=calcFavorites.filter(s=>s!==favSlug);setCalcFavorites(next);try{localStorage.setItem('pg_calc_favorites',JSON.stringify(next));}catch{};}} style={{color:K.mt,fontSize:8,cursor:"pointer",marginLeft:2}}>✕</span>
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
              }} style={{padding:"3px 10px",background:calcSubcat===sc?K.pp:"transparent",border:`1px solid ${calcSubcat===sc?K.pp:K.bd2}`,borderRadius:50,color:calcSubcat===sc?K.bg:K.dm,fontSize:9,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",letterSpacing:"0.5px"}}>
                {sc}
              </button>
            ))}
            <div style={{flex:1}}/>
            <button onClick={()=>{setCompareMode(m=>!m);if(!compareMode)setCompareSlug('');}} style={{padding:"3px 10px",background:compareMode?`${K.ac}20`:"transparent",border:`1px solid ${compareMode?K.ac:K.bd2}`,borderRadius:50,color:compareMode?K.ac:K.mt,fontSize:9,cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",letterSpacing:"0.5px"}}>
              {compareMode?"✕ Exit Compare":"⊞ Compare"}
            </button>
          </div>}
          <div style={{display:"flex",maxWidth:1100,width:"100%",gap:2,margin:"0 auto"}}>{g.items.map((t,i)=>{
            const highlighted = gi===CALC_GI&&calcSubcat!=="All"&&t.subcat===calcSubcat;
            const isFav = calcFavorites.includes(t.slug);
            return (<button key={t.n} onClick={()=>goTo(gi,i)} style={{padding:"9px 14px",fontSize:11,fontWeight:ti===i?600:400,color:ti===i?K.ac:highlighted?K.pp:K.dm,background:"transparent",border:"none",borderBottom:ti===i?`2px solid ${K.ac}`:highlighted?"2px solid "+K.pp+"50":"2px solid transparent",cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",position:"relative",display:"flex",alignItems:"center",gap:4}}>
              {t.n}
              {gi===CALC_GI&&<span onClick={e=>{e.stopPropagation();const next=isFav?calcFavorites.filter(s=>s!==t.slug):[...calcFavorites,t.slug];setCalcFavorites(next);try{localStorage.setItem('pg_calc_favorites',JSON.stringify(next));}catch{};}} title={isFav?"Unpin":"Pin to favorites"} style={{fontSize:9,color:isFav?K.yl:K.bd2,cursor:"pointer",lineHeight:1,opacity:isFav?1:0.4,transition:"opacity 0.15s"}} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity=isFav?'1':'0.4'}>★</span>}
              {highlighted&&<span style={{position:"absolute",bottom:4,right:4,width:4,height:4,borderRadius:"50%",background:K.pp}}/>}
            </button>);
          })}</div>
        </div>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:64,background:`linear-gradient(to left,${K.s2} 40%,transparent)`,pointerEvents:"none",zIndex:1}}/>
      </div>
      <div className="pg-main-content" style={{maxWidth:1100,margin:"0 auto",padding:"20px"}}>
        <MembershipBanner/>
        <ErrorBoundary>
          {slug==='dashboard'
            ? <DailyDashboard navigate={navigate} proStatus={proStatus}/>
            : compareMode&&gi===CALC_GI
              ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div>
                    <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,fontFamily:font}}>Primary — {item?.n}</div>
                    {isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
                  </div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px",fontFamily:font}}>Compare —</span>
                      <select value={compareSlug} onChange={e=>setCompareSlug(e.target.value)} style={{...S.input,width:"auto",padding:"3px 8px",fontSize:10}}>
                        <option value="">Pick a calculator…</option>
                        {g.items.filter(it=>it.slug!==slug).map(it=><option key={it.slug} value={it.slug}>{it.n}</option>)}
                      </select>
                    </div>
                    {compareSlug
                      ? (() => { const cItem=g.items.find(it=>it.slug===compareSlug); const CC=cItem?.c; return CC?<CC/>:<div style={{color:K.mt,fontSize:11}}>Not found.</div>; })()
                      : <div style={{...S.card,color:K.mt,fontSize:11,textAlign:"center",padding:"32px 16px"}}>Select a calculator above to compare side by side.</div>}
                  </div>
                </div>
              : isLiveTool ? <Comp proStatus={proStatus} mode={slug}/> : <Comp/>}
        </ErrorBoundary>
      </div>
      <EmailCapture/>
      <Footer/>
      <div style={{height:56}}/>
      <MobileBottomNav gi={gi} goTo={goTo}/>
      {showPromoAdvisor && <PromoAdvisorPanel proStatus={proStatus} onClose={() => setShowPromoAdvisor(false)} />}
      <PromoChat navigate={navigate}/>
      <QuickCalcPanel goTo={goTo}/>
    </div>
    </CurrencyCtx.Provider>
    </CompactCtx.Provider>
    </AppDataCtx.Provider>
    </ToastProvider>
  );
}
