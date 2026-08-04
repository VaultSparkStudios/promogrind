import React, { useEffect, useState } from "react";
import { supabase } from "../auth.js";
import { BOOKS } from "../books.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { PUSH_UI } from "./appText.js";
import { subscribeToPush } from "../sw-register.js";
import { CANONICAL_APP_URL, FEATURE_FLAGS } from "../launchState.js";
import { K, f, font, fontD } from "../lib/shared.js";
import { S } from "../ui.jsx";
import { createEntityId } from "../lib/entityId.js";
import { ledgerEvidenceEntries } from "../lib/ledgerEvidence.js";

const PushEnableBtn = ({ proStatus }) => {
  const toast = useToast();
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
    bets.push({ id:createEntityId("bet"), book, stake, odds, notes, status:'open', date:new Date().toISOString().split('T')[0] });
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
            <label htmlFor="quick-add-book" style={S.label}>Sportsbook</label>
            <select id="quick-add-book" style={S.input} value={book} onChange={e=>setBook(e.target.value)}>
              {BOOKS.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div style={S.col}><label htmlFor="quick-add-stake" style={S.label}>Stake ($)</label><input id="quick-add-stake" style={S.input} value={stake} onChange={e=>setStake(e.target.value)} placeholder="100"/></div>
          <div style={S.col}><label htmlFor="quick-add-odds" style={S.label}>Odds</label><input id="quick-add-odds" style={S.input} value={odds} onChange={e=>setOdds(e.target.value)} placeholder="-110"/></div>
        </div>
        <div style={{marginBottom:10}}>
          <label htmlFor="quick-add-notes" style={S.label}>Notes (optional)</label>
          <input id="quick-add-notes" style={S.input} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Game, promo type, etc."/>
        </div>
        <button onClick={addBet} style={{padding:"8px 20px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:font}}>Add to Bet Tracker</button>
      </div>}
    </div>
  );
};

const WeeklyDecisionReview = () => {
  const { appData: data } = React.useContext(AppDataCtx);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const generate = () => {
    const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay()||7) + 1); mon.setHours(0,0,0,0);
    const ledger = ledgerEvidenceEntries(data.ledger).filter(e => e.date && new Date(e.date) >= mon);
    const feedback = (data.resultFeedback || []).filter(e => new Date(e.updatedAt || e.createdAt || 0) >= mon);
    const closed = feedback.filter(e => ['settled','skipped'].includes(e.status));
    const settled = closed.filter(e => e.status === 'settled' && Number.isFinite(Number.parseFloat(e.actualProfit)));
    const reasonedSkips = closed.filter(e => e.status === 'skipped' && String(e.skipReason || '').trim()).length;
    const paired = settled.filter(e => Number.isFinite(Number.parseFloat(e.expectedProfit)));
    const averageDrift = paired.length ? paired.reduce((sum,e)=>sum+(Number.parseFloat(e.actualProfit)-Number.parseFloat(e.expectedProfit)),0)/paired.length : null;
    const pl = ledger.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const reviewCoverage = feedback.length ? Math.round((closed.length/feedback.length)*100) : 0;
    const monStr = mon.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    setReport({ ledgerRows:ledger.length, closed:closed.length, settled:settled.length, reasonedSkips, reviewCoverage, pl:f(pl), averageDrift, monStr });
  };
  const copyReport = () => {
    if(!report) return;
    const drift = report.averageDrift === null ? 'not enough paired estimates/outcomes' : `${report.averageDrift>=0?'+':''}$${f(report.averageDrift)} average actual-vs-estimate drift`;
    const text = `PromoGrind Weekly Decision Review — Week of ${report.monStr}\nClosed loops: ${report.closed} (${report.settled} settled, ${report.reasonedSkips} reasoned skips) | Review coverage: ${report.reviewCoverage}%\nRecorded realized P/L: ${parseFloat(report.pl)>=0?'+':'-'}$${f(Math.abs(parseFloat(report.pl)))} across ${report.ledgerRows} local ledger rows | Calibration: ${drift}\nSelf-recorded operator data; not independently verified.\n${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(text);}catch(e){}
    setCopied(true); setTimeout(()=>setCopied(false),1500);
  };
  return (
    <div style={{...S.card,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:K.tx,marginBottom:4,fontFamily:fontD}}>Weekly Decision Review</div>
      <div style={{fontSize:10,color:K.mt,marginBottom:8,lineHeight:1.5}}>Measures closed feedback loops and calibration. Profit is context, never rank progress.</div>
      {!report&&<button onClick={generate} style={{padding:"7px 14px",background:`${K.ac}15`,border:`1px solid ${K.ac}30`,borderRadius:6,color:K.ac,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>Build Review</button>}
      {report&&<>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}>
          <div><div style={{fontSize:9,color:K.mt}}>CLOSED LOOPS</div><div style={{fontSize:20,fontWeight:700,color:K.ac,fontFamily:fontD}}>{report.closed}</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>REVIEW COVERAGE</div><div style={{fontSize:20,fontWeight:700,color:K.tx,fontFamily:fontD}}>{report.reviewCoverage}%</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>RECORDED P/L</div><div style={{fontSize:20,fontWeight:700,color:parseFloat(report.pl)>=0?K.ac:K.rd,fontFamily:fontD}}>{parseFloat(report.pl)>=0?'+':'-'}${f(Math.abs(parseFloat(report.pl)))}</div></div>
          <div><div style={{fontSize:9,color:K.mt}}>AVG CALIBRATION DRIFT</div><div style={{fontSize:20,fontWeight:700,color:K.dm,fontFamily:fontD}}>{report.averageDrift===null?'—':`${report.averageDrift>=0?'+':''}$${f(report.averageDrift)}`}</div></div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={copyReport} style={{padding:"6px 14px",background:copied?K.gn:K.pp,border:"none",borderRadius:6,color: K.ink,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>{copied?"✓ Copied!":"📋 Copy Report"}</button>
          <button onClick={()=>setReport(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Regenerate</button>
        </div>
      </>}
    </div>
  );
};

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
        <label htmlFor="bankroll-wizard-amount" style={{...S.label,marginBottom:0}}>Bankroll $</label>
        <input id="bankroll-wizard-amount" style={{...S.input,width:120}} value={bwBankroll} onChange={e=>setBwBankroll(e.target.value)} placeholder="3000"/>
        <button onClick={recalc} style={{padding:"6px 14px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>Recalculate</button>
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

// FX, CurrencyCtx -> ../contexts.jsx

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
    const totalProfit=ledgerEvidenceEntries(data.ledger).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
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
          <button onClick={copyLink} style={{padding:"7px 14px",background:copied?K.gn:K.ac,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{copied?"✓ Copied!":"Copy Setup Link"}</button>
          <button onClick={shareCard} style={{padding:"7px 14px",background:cardCopied?K.gn:K.pp,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:11,whiteSpace:"nowrap"}}>{cardCopied?"✓ Copied!":"Share Card"}</button>
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
              <button onClick={loadSetup} style={{flex:1,padding:"9px",background:K.gn,border:"none",borderRadius:6,color: K.ink,fontWeight:700,cursor:"pointer",fontFamily:font}}>Load Setup</button>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:"9px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:6,color:K.mt,cursor:"pointer",fontFamily:font}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { BankrollWizard, CopyMySetup, PushEnableBtn, QuickAddBet, WeeklyDecisionReview };
