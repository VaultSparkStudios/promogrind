import React, { useState, useMemo } from "react";
import { toD, f, calcROI, downloadFile, K, font, fontD, S } from "../lib/shared.js";
import { BOOKS } from "../books.js";
import { onLedgerEntry } from "../sync.js";
import { CANONICAL_APP_URL, getProjectAuthHref } from "../launchState.js";
import { AppDataCtx, useToast } from "../contexts.jsx";
import { In, RR, Tl, Nt, shouldShowTrigger, dismissTrigger } from "../ui.jsx";
import { useViewport } from "../app/responsive.js";

// ═══ SHARE WEEK BUTTON ═══
const ShareWeekBtn = ({entries}) => {
  const [weekCopied,setWeekCopied]=useState(false);
  const shareWeek=()=>{
    const today2=new Date();
    const dayOfWeek=today2.getDay();
    const diffToMon=dayOfWeek===0?-6:1-dayOfWeek;
    const monDate=new Date(today2);
    monDate.setDate(today2.getDate()+diffToMon);
    monDate.setHours(0,0,0,0);
    const weekEntries=entries.filter(e=>{
      if(!e.date) return false;
      const d=new Date(e.date); d.setHours(0,0,0,0);
      return d>=monDate && d<=today2;
    });
    const weekProfit=weekEntries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
    const best=weekEntries.length?weekEntries.reduce((b,e)=>parseFloat(e.profit)>parseFloat(b.profit)?e:b,weekEntries[0]):null;
    const monStr=`${monDate.getMonth()+1}/${monDate.getDate()}`;
    const todayStr2=`${today2.getMonth()+1}/${today2.getDate()}`;
    const card=`📊 PromoGrind Weekly Update\nWeek of ${monStr} – ${todayStr2}\n━━━━━━━━━━━━━━━━━━\nProfit: ${weekProfit>=0?"+":""}$${f(weekProfit)}\n${best?`Best play: ${best.type} at ${best.book}`:"Best play: —"}\nEntries: ${weekEntries.length}\n━━━━━━━━━━━━━━━━━━\nTrack yours free: ${CANONICAL_APP_URL}`;
    try{navigator.clipboard.writeText(card);}catch(e){}
    setWeekCopied(true); setTimeout(()=>setWeekCopied(false),2000);
  };
  return (<button onClick={shareWeek} style={{padding:"7px 14px",background:"transparent",border:`1px solid ${K.ac}`,borderRadius:6,color:weekCopied?K.gn:K.ac,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>
    {weekCopied?"✓ Copied!":"📅 Share This Week"}
  </button>);
};

// ═══ REPORT CARD ═══
const ReportCard = ({entries, total}) => {
  const [copiedReport,setCopiedReport]=useState(false);
  const months={}; entries.forEach(e=>{const m=e.date?e.date.slice(0,7):"?"; if(!months[m])months[m]=0; months[m]+=(parseFloat(e.profit)||0);});
  const monthVals=Object.values(months); const bestMonth=monthVals.length?Math.max(...monthVals):0; const bestMonthKey=Object.entries(months).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
  const conversionEntries=entries.filter(e=>e.type==="Bonus Bet"||e.type==="Profit Boost");
  const avgConv=conversionEntries.length?conversionEntries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0)/conversionEntries.length:0;
  const card=`PromoGrind Report Card 📊\n──────────────────\nTotal Profit: $${f(total)}\nBest Month: ${bestMonthKey} ($${f(bestMonth)})\nEntries: ${entries.length} logged\nAvg per Entry: $${f(avgConv)}\nEst. Tax @ 22%: -$${f(total*0.22)} | Keep: $${f(total*0.78)}\n──────────────────\nTrack yours free: ${CANONICAL_APP_URL}`;
  const copyReport=()=>{try{navigator.clipboard.writeText(card);}catch(e){} setCopiedReport(true); setTimeout(()=>setCopiedReport(false),2000);};
  return (
    <div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
      <div style={{fontSize:11,fontWeight:700,color:K.pp,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>All-Time Report Card</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:10}}>
        <div><div style={{fontSize:9,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(total>=0?K.gn:K.rd)}>${f(total)}</div></div>
        <div><div style={{fontSize:9,color:K.mt}}>BEST MONTH</div><div style={{...S.big(K.ac),fontSize:18}}>${f(bestMonth)}</div><div style={{fontSize:9,color:K.mt}}>{bestMonthKey}</div></div>
        <div><div style={{fontSize:9,color:K.mt}}>ENTRIES</div><div style={{...S.big(K.tx),fontSize:18}}>{entries.length}</div></div>
        <div><div style={{fontSize:9,color:K.mt}}>AVG PER ENTRY</div><div style={{...S.big(K.yl),fontSize:18}}>${f(avgConv)}</div></div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={copyReport} style={{padding:"7px 16px",background:copiedReport?K.gn:K.pp,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>
          {copiedReport?"✓ Copied!":"📋 Copy Report Card"}
        </button>
        <ShareWeekBtn entries={entries}/>
        <button onClick={()=>{const year=new Date().getFullYear();const header=`"PromoGrind P&L Export - For Tax Purposes - Gambling winnings are taxable income"`;const colHeaders=["Date","Sportsbook","Type","Bonus Amount","Hedge Amount","Profit","Notes"];const rows=entries.map(e=>[e.date,e.book,e.type,e.bonus||"",e.hedge||"",e.profit,e.notes||""]);const csv=[header,colHeaders,...rows].map((r,i)=>i<2?r:r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");downloadFile(csv,`promogrind-tax-export-${year}.csv`,"text/csv");}} style={{padding:"7px 14px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:font}}>
          Export Tax CSV ({entries.length} entries)
        </button>
      </div>
    </div>
  );
};

// ═══ BET HEATMAP ═══
const BetHeatmap = ({ entries }) => {
  const [show, setShow] = useState(false);
  const dayMap = useMemo(()=>{
    const m = {};
    entries.forEach(e=>{ if(!e.date) return; const k=e.date; if(!m[k]) m[k]=0; m[k]+=(parseFloat(e.profit)||0); });
    return m;
  },[entries]);
  // 91-day grid (365 cell objects + styles) — build only on data change,
  // not on every parent re-render.
  const {cells, monthLabels} = useMemo(()=>{
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(today); start.setDate(today.getDate()-90);
    const grid = [];
    const d = new Date(start);
    const dow = d.getDay();
    const mondayOffset = dow===0?-6:1-dow;
    d.setDate(d.getDate()+mondayOffset);
    for(let w=0;w<13;w++) {
      const week = [];
      for(let day=0;day<7;day++) {
        const key = d.toISOString().split('T')[0];
        const pl = dayMap[key];
        let color = K.s3;
        if(pl!==undefined){ if(pl>50) color=K.gn; else if(pl>0) color='#22c55e80'; else if(pl===0) color=K.bd2; else color=`${K.rd}99`; }
        week.push({key,pl,color,isFuture:d>today});
        d.setDate(d.getDate()+1);
      }
      grid.push(week);
    }
    const labels = grid.map((week,wi)=>{ const mon=week[0].key; const prev=wi>0?grid[wi-1][0].key:null; if(!prev||mon.slice(0,7)!==prev.slice(0,7)){ const dt=new Date(mon+'T12:00:00'); return dt.toLocaleString('default',{month:'short'}); } return ''; });
    return {cells:grid, monthLabels:labels};
  },[dayMap]);
  return (
    <div style={{marginBottom:12}}>
      <button onClick={()=>setShow(s=>!s)} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,marginBottom:show?8:0}}>
        {show?"▲ Hide":"▼ Show"} P/L Heatmap
      </button>
      {show&&<div style={{overflowX:"auto",padding:"8px 0"}}>
        <div style={{display:"flex",gap:4}}>
          <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:14}}>
            {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{height:14,fontSize:8,color:K.mt,lineHeight:"14px"}}>{d}</div>)}
          </div>
          <div>
            <div style={{display:"flex",gap:2,marginBottom:4}}>
              {monthLabels.map((l,i)=><div key={i} style={{width:14,fontSize:8,color:K.mt,overflow:"hidden",whiteSpace:"nowrap"}}>{l}</div>)}
            </div>
            <div style={{display:"flex",gap:2}}>
              {cells.map((week,wi)=>(
                <div key={wi} style={{display:"flex",flexDirection:"column",gap:2}}>
                  {week.map(cell=>(
                    <div key={cell.key} title={cell.isFuture?'':cell.pl!==undefined?`${cell.key}: ${cell.pl>=0?'+':''}$${f(cell.pl)}`:cell.key+': no data'} style={{width:12,height:12,borderRadius:2,background:cell.isFuture?'transparent':cell.color,opacity:cell.isFuture?0:1}}/>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,fontSize:9,color:K.mt,alignItems:"center"}}>
          <span>Legend:</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:K.s3,display:"inline-block"}}/> No data</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:K.gn,display:"inline-block"}}/> Profit &gt;$50</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'#22c55e80',display:"inline-block"}}/> Profit</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:K.bd2,display:"inline-block"}}/> Break-even</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:`${K.rd}99`,display:"inline-block"}}/> Loss</span>
        </div>
      </div>}
    </div>
  );
};

// ═══ TAX TIMING ADVISOR ═══
const TaxTimingAdvisor = ({ entries }) => {
  const [open, setOpen] = useState(false);
  const total = (entries||[]).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  if(total<=0) return null;
  const now = new Date();
  const month = now.getMonth();
  const quarter = month<3?1:month<6?2:month<9?3:4;
  const bracket = total>578125?0.37:total>231250?0.35:total>182050?0.32:total>95375?0.24:total>44725?0.22:total>10275?0.12:0.10;
  const taxOwed = total*bracket;
  const annualized = total/(now.getMonth()+1)*12;
  let advice = "";
  if(quarter===4) advice = "Consider settling losing hedges before Dec 31 to offset gains.";
  else if(quarter===1) advice = "New tax year — ideal time for highest-variance plays.";
  else advice = `On track for ~$${Math.round(annualized).toLocaleString()} annualized — consider quarterly estimated taxes.`;
  return (
    <div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"none",border:"none",textAlign:"left",color:K.ac,fontSize:11,fontWeight:700,cursor:"pointer",padding:0,fontFamily:font,display:"flex",justifyContent:"space-between",alignItems:"center",textTransform:"uppercase",letterSpacing:"1.5px"}}>
        Tax Timing Advisor
        <span style={{color:K.mt,fontSize:10}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{marginTop:12}}>
        <RR l="Current year profit" v={`$${f(total)}`} c={K.gn}/>
        <RR l="Estimated federal bracket" v={`${Math.round(bracket*100)}%`} c={K.yl}/>
        <RR l="Estimated federal tax owed" v={`~$${f(taxOwed)}`} c={K.rd}/>
        <RR l="Annualized pace" v={`~$${Math.round(annualized).toLocaleString()}`} c={K.ac}/>
        <Nt c={K.yl}>{advice}</Nt>
        <div style={{fontSize:10,color:K.mt,marginTop:8}}>Estimate only. Consult a tax professional. Report all gambling income.</div>
      </div>}
    </div>
  );
};

// ═══ LEDGER ═══
const Ledger = () => {
  const { appData: data, syncAppData, user } = React.useContext(AppDataCtx);
  const viewport = useViewport();
  const isCompact = viewport.isPhone;
  const entries = data.ledger || [];
  const [form, setForm] = useState({date:new Date().toISOString().split("T")[0],book:"DraftKings",type:"Bonus Conversion",bonus:"",hedge:"",profit:"",ev:"",myOdds:"",closingOdds:"",notes:""});
  const save = (newEntries) => syncAppData({...data, ledger: newEntries});
  const toast = useToast();
  const add = () => {
    if(!form.profit) return;
    if(entries.length === 0) window.plausible?.('first_ledger_entry');
    save([{...form,id:Date.now()},...entries]);
    setForm(f=>({...f,bonus:"",hedge:"",profit:"",ev:"",notes:""}));
    onLedgerEntry();
    if(toast) toast('✓ Entry logged');
    if(form.myOdds&&form.closingOdds&&toast) {
      const my=toD(form.myOdds),cl=toD(form.closingOdds);
      if(my>1&&cl>1) {
        const clv=(my/cl-1)*100;
        if(clv>0) setTimeout(()=>toast(`🎯 Beat closing line by +${f(clv,2)}% — strong CLV signal`,K.gn),300);
        else if(clv<-1) setTimeout(()=>toast(`⚠ Closing line moved against you (${f(clv,2)}%)`,K.yl),300);
      }
    }
  };
  const del = id => { const snapshot=[...entries]; save(entries.filter(e=>e.id!==id)); if(toast) toast('Entry deleted',K.rd,{label:'UNDO',fn:()=>save(snapshot)}); };
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const startEdit = (e) => { setEditId(e.id); setEditForm({...e}); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const commitEdit = () => { save(entries.map(e=>e.id===editId?{...editForm}:e)); setEditId(null); setEditForm({}); if(toast) toast('✓ Entry updated'); };
  const [filterBook, setFilterBook] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [ledgerView, setLedgerView] = useState('entries');
  const [showGoal, setShowGoal] = useState(false);
  const signInHref = getProjectAuthHref('signin');
  const [goalInput, setGoalInput] = useState(() => { try { return localStorage.getItem('pg_profit_goal')||''; } catch { return ''; } });
  const saveGoal = v => { setGoalInput(v); try { localStorage.setItem('pg_profit_goal', v); } catch {} };
  const total = entries.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPL = entries.filter(e=>e.date===todayStr).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthPL = entries.filter(e=>e.date&&e.date.startsWith(thisMonth)).reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
  const [upsellLedgerDismissed, setUpsellLedgerDismissed] = useState(()=>{ try{return !!localStorage.getItem('pg_upsell_ledger_dismissed');}catch{return false;} });
  const ledgerIsPro = () => { try { return ['vault_sparked','pro','trial'].includes(localStorage.getItem('pg_pro_status')||''); } catch { return false; } };
  const [showLedgerTrigger, setShowLedgerTrigger] = useState(() => {
    const ents = data?.ledger || [];
    return ents.length >= 3 && shouldShowTrigger('ledger_upsell') && !ledgerIsPro();
  });
  const streakData = useMemo(()=>{
    const sorted=[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date));
    let cur=0,dir=null;
    for(const e of sorted){ const w=parseFloat(e.profit)>0; if(dir===null) dir=w; if(dir===w) cur++; else break; }
    let longest=0,run=0;
    for(const e of [...sorted].reverse()){ if(parseFloat(e.profit)>0) run++; else run=0; if(run>longest) longest=run; }
    const last10=sorted.slice(0,10).reverse().map(e=>parseFloat(e.profit)>0?'W':parseFloat(e.profit)<0?'L':'P');
    return {cur,dir,longest,last10};
  },[entries]);
  const exportCSV = () => {
    const headers = ["Date","Book","Type","Bonus","Hedge","Profit","EV%","Notes"];
    const rows = entries.map(e=>[e.date,e.book,e.type,e.bonus||"",e.hedge||"",e.profit,e.ev||"",e.notes||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadFile(csv, `promogrind-ledger-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  };
  return (<div style={S.card}>
    <Tl t="Profit & Loss Ledger" badge={user ? "CLOUD SYNC" : "LOCAL"} bc={user ? K.gn : K.mt}/>
    {!user && (
      <div style={{...S.note(K.gn), marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8}}>
        <span>Saving to this device only.</span>
        <a href={signInHref} style={{color: K.gn, textDecoration: 'none', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap'}}>Sign in free to sync →</a>
      </div>
    )}
    {showLedgerTrigger && (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'linear-gradient(90deg,#1e3a2f,#0f1724)',border:'1px solid #4ade80',borderRadius:8,marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:13,color:'#cbd5e1'}}>☁️ <strong style={{color:'#4ade80'}}>VaultSparked</strong> syncs your ledger across all devices + unlocks the Live Scanner.</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <a href="#/upgrade" style={{padding:'5px 12px',background:'#4ade80',color:'#0a0e17',borderRadius:5,fontSize:12,fontWeight:700,textDecoration:'none'}}>Start Free Trial →</a>
          <button onClick={() => dismissTrigger('ledger_upsell', setShowLedgerTrigger)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:16}}>×</button>
        </div>
      </div>
    )}
    {entries.length>=5&&!upsellLedgerDismissed&&(
      <div style={{...S.note(K.pp),display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:12}}>
        <span>Get live arb scanner, push alerts + priority support — first 7 days free, then $24.99/mo</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{ window.location.hash='#/upgrade'; }} style={{padding:"4px 10px",background:K.pp,border:"none",borderRadius:4,color:K.bg,fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:font}}>Try 7 days free</button>
          <button onClick={()=>{try{localStorage.setItem('pg_upsell_ledger_dismissed','1');}catch{}setUpsellLedgerDismissed(true);}} style={{padding:"4px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>✕</button>
        </div>
      </div>
    )}
    {(()=>{
      const clvEntries=entries.filter(e=>e.myOdds&&e.closingOdds);
      const avgClv=clvEntries.length?clvEntries.reduce((s,e)=>{const my=toD(e.myOdds),cl=toD(e.closingOdds);return s+(my>1&&cl>1?(my/cl-1)*100:0);},0)/clvEntries.length:null;
      return (<div style={{display:"grid",gridTemplateColumns:isCompact?"repeat(2,minmax(0,1fr))":"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:16,alignItems:"end"}}>
        <div><div style={{fontSize:10,color:K.mt}}>TOTAL PROFIT</div><div style={S.big(total>=0?K.gn:K.rd)}>${f(total)}</div></div>
        <div><div style={{fontSize:10,color:K.mt}}>ENTRIES</div><div style={S.big(K.ac)}>{entries.length}</div></div>
        {avgClv!==null&&<div><div style={{fontSize:10,color:K.mt}}>AVG CLV</div><div style={S.big(avgClv>=0?K.gn:K.rd)}>{avgClv>=0?"+":""}{f(avgClv,2)}%</div></div>}
        {(()=>{ const evEntries=entries.filter(e=>e.ev&&parseFloat(e.ev)>0); if(!evEntries.length) return null; const avgEV=evEntries.reduce((s,e)=>s+parseFloat(e.ev),0)/evEntries.length; return <div><div style={{fontSize:10,color:K.mt}}>AVG EV%</div><div style={S.big(K.pp)}>{f(avgEV,1)}%</div><div style={{fontSize:9,color:K.mt}}>{evEntries.length} logged</div></div>; })()}
        {entries.length>0&&<div><div style={{fontSize:10,color:K.mt}}>STREAK</div><div style={{fontSize:18,fontWeight:700,color:streakData.dir?K.gn:K.rd,fontFamily:fontD}}>{streakData.cur>0?(streakData.dir?`🔥 ${streakData.cur}W`:`❄ ${streakData.cur}L`):'—'}</div><div style={{fontSize:9,color:K.mt}}>Best: {streakData.longest}W</div></div>}
        {streakData.last10.length>0&&<div><div style={{fontSize:10,color:K.mt,marginBottom:4}}>LAST 10</div><div style={{display:"flex",gap:3}}>{streakData.last10.map((r,i)=><span key={i} style={{width:10,height:10,borderRadius:"50%",background:r==='W'?K.gn:r==='L'?K.rd:K.yl,display:"inline-block"}}/>)}</div></div>}
        {(()=>{
          const bbEntries=entries.filter(e=>e.type==="Bonus Conversion"&&e.bonus&&e.profit);
          if(bbEntries.length<3) return null;
          const avgConv=bbEntries.reduce((s,e)=>{
            const b=parseFloat(e.bonus)||0; const p=parseFloat(e.profit)||0;
            return b>0?s+(p/b*100):s;
          },0)/bbEntries.length;
          return <div><div style={{fontSize:10,color:K.mt}}>CONV RATE</div><div style={{...S.big(avgConv>=70?K.gn:avgConv>=55?K.yl:K.rd),fontSize:20}}>{f(avgConv,1)}%</div><div style={{fontSize:9,color:K.mt}}>{bbEntries.length} conv.</div></div>;
        })()}
        {entries.filter(e=>e.date===todayStr).length>0&&<div><div style={{fontSize:10,color:K.mt}}>TODAY</div><div style={{...S.big(todayPL>=0?K.gn:K.rd),fontSize:22}}>{todayPL>=0?"+":""}${f(todayPL)}</div></div>}
        {(()=>{
          const cutoff=new Date(Date.now()-7*24*60*60*1000);
          const recent=entries.filter(e=>e.date&&new Date(e.date)>=cutoff);
          const recentPL=recent.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
          if(!recent.length) return null;
          return <div><div style={{fontSize:10,color:K.mt}}>LAST 7 DAYS</div><div style={S.big(recentPL>=0?K.gn:K.rd,{fontSize:20})}>{recentPL>=0?"+":""}${f(recentPL)}</div><div style={{fontSize:9,color:K.mt}}>{recent.length} bets</div></div>;
        })()}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",gridColumn:isCompact?"1 / -1":"auto",justifyContent:isCompact?"stretch":"flex-end"}}>
          {entries.length>0&&<button onClick={exportCSV} style={{flex:isCompact?1:"0 0 auto",padding:"8px 14px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:8,color:K.dm,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>↓ Export CSV</button>}
          <button onClick={()=>{
          const cutoff=new Date(Date.now()-7*24*60*60*1000);
          const week=entries.filter(e=>e.date&&new Date(e.date)>=cutoff);
          const wPL=week.reduce((s,e)=>s+(parseFloat(e.profit)||0),0);
          const wClv=week.filter(e=>e.myOdds&&e.closingOdds);
          const avgClv=wClv.length?wClv.reduce((s,e)=>{const my=toD(e.myOdds),cl=toD(e.closingOdds);return s+(my>1&&cl>1?(my/cl-1)*100:0);},0)/wClv.length:null;
          const card=`📊 PromoGrind Week\nPromos: ${week.length}  |  Profit: ${wPL>=0?"+":""}$${f(wPL)}${avgClv!==null?`\nCLV: ${avgClv>=0?"+":""}${f(avgClv,2)}%`:""}
\nFree tools at ${CANONICAL_APP_URL}`;
          try{navigator.clipboard.writeText(card);}catch(e){}
          if(toast) toast('📋 Week card copied!',K.pp);
        }} style={{flex:isCompact?1:"0 0 auto",padding:"8px 14px",background:"transparent",border:`1px solid ${K.pp}`,borderRadius:8,color:K.pp,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:font}}>📊 Share Week</button>
        </div>
      </div>);
    })()}
    {(()=>{
      const goal = parseFloat(goalInput);
      const goalPct = goal>0 ? Math.min(100,monthPL/goal*100) : 0;
      const barColor = goalPct>=80?K.gn:goalPct>=40?K.yl:K.rd;
      return (<div style={{marginBottom:12}}>
        <button onClick={()=>setShowGoal(g=>!g)} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font,marginBottom:showGoal||goal>0?8:0}}>
          {showGoal?"▲ Hide Goal":"▼ Monthly Goal"}
        </button>
        {(showGoal||goal>0)&&<div style={{padding:"12px 14px",background:K.s2,borderRadius:6,border:`1px solid ${K.bd}`}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,color:K.dm}}>Monthly profit goal: $</span>
            <input style={{...S.input,width:80,padding:"4px 8px"}} value={goalInput} onChange={e=>saveGoal(e.target.value)} placeholder="1000"/>
          </div>
          {goal>0&&(<>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:K.mt,marginBottom:4}}>
              <span>This month: {monthPL>=0?"+":""}${f(monthPL)}</span>
              <span style={{color:barColor,fontWeight:600}}>{f(goalPct,0)}% of ${f(goal,0)} goal</span>
            </div>
            <div style={{height:6,background:K.s3,borderRadius:3}}>
              <div style={{height:6,borderRadius:3,background:barColor,width:`${goalPct}%`,transition:"width 0.4s"}}/>
            </div>
            {goalPct>=100&&<div style={{fontSize:11,color:K.gn,marginTop:6,fontWeight:600}}>Goal reached!</div>}
          </>)}
        </div>}
      </div>);
    })()}
    <div style={{...S.row,alignItems:"flex-end"}}>
      <div style={S.col}><label style={S.label}>Date</label><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
      <div style={{...S.col,minWidth:140}}><label style={S.label}>Book</label><select style={S.input} value={form.book} onChange={e=>setForm(f=>({...f,book:e.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></div>
      <div style={{...S.col,minWidth:160}}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></div>
    </div>
    <div style={{...S.row,alignItems:"flex-end"}}>
      <In l="Bonus $" v={form.bonus} set={v=>setForm(f=>({...f,bonus:v}))} pre="$"/>
      <In l="Hedge $" v={form.hedge} set={v=>setForm(f=>({...f,hedge:v}))} pre="$"/>
      <In l="Net Profit" v={form.profit} set={v=>setForm(f=>({...f,profit:v}))} pre="$"/>
      <In l="EV % (opt)" v={form.ev} set={v=>setForm(f=>({...f,ev:v}))} ph="4.2" pre="%"/>
      <In l="Your Odds (opt)" v={form.myOdds} set={v=>setForm(f=>({...f,myOdds:v}))} ph="+110"/>
      <In l="Closing Odds (opt)" v={form.closingOdds} set={v=>setForm(f=>({...f,closingOdds:v}))} ph="+105"/>
      <div style={{...S.col,minWidth:80}}><label style={S.label}>&nbsp;</label><button onClick={add} style={{padding:"8px 16px",background:K.gn,border:"none",borderRadius:6,color:K.bg,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:12,width:"100%"}}>+ ADD</button></div>
    </div>
    {entries.length>=2&&(()=>{
      const sorted=[...entries].sort((a,b)=>new Date(a.date)-new Date(b.date));
      const cumulative=sorted.reduce((acc,e,i)=>{const prev=i>0?acc[i-1].cum:0;acc.push({date:e.date,cum:prev+(parseFloat(e.profit)||0)});return acc;},[]);
      const minV=Math.min(0,...cumulative.map(p=>p.cum));
      const maxV=Math.max(0,...cumulative.map(p=>p.cum));
      const range=maxV-minV||1;
      const W=340,H=80,PAD=8;
      const sx=i=>(i/(cumulative.length-1||1))*(W-PAD*2)+PAD;
      const sy=v=>H-PAD-(v-minV)/range*(H-PAD*2);
      const pts=cumulative.map((p,i)=>`${sx(i)},${sy(p.cum)}`).join(' ');
      const areaClose=`${sx(cumulative.length-1)},${sy(0)} ${sx(0)},${sy(0)}`;
      const isPos=cumulative[cumulative.length-1].cum>=0;
      const color=isPos?K.gn:K.rd;
      return (
        <div style={{...S.card,background:K.s2,padding:"12px 16px",marginBottom:12}}>
          <div style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8}}>Cumulative P/L</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",overflow:"visible"}}>
            <line x1={PAD} y1={sy(0)} x2={W-PAD} y2={sy(0)} stroke={K.bd2} strokeWidth="1" strokeDasharray="3,3"/>
            <polyline fill={`${color}15`} stroke="none" points={`${pts} ${areaClose}`}/>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts}/>
            {cumulative.map((p,i)=>i===cumulative.length-1?<circle key={i} cx={sx(i)} cy={sy(p.cum)} r="3" fill={color}/>:null)}
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:K.mt,marginTop:4}}>
            <span>{cumulative[0]?.date}</span><span style={{color,fontWeight:700}}>{isPos?"+":""}${f(cumulative[cumulative.length-1]?.cum||0)}</span><span>{cumulative[cumulative.length-1]?.date}</span>
          </div>
        </div>
      );
    })()}
    <BetHeatmap entries={entries}/>
    <Nt c={K.yl}>All gambling winnings are taxable income. Keep records year-round. Export this ledger each tax season.</Nt>
    <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>View:</span>
      {["entries","by-book"].map(v=>(
        <button key={v} onClick={()=>setLedgerView(v)} style={{padding:"4px 12px",background:ledgerView===v?K.ac:"transparent",border:`1px solid ${ledgerView===v?K.ac:K.bd2}`,borderRadius:4,color:ledgerView===v?K.bg:K.dm,fontSize:10,cursor:"pointer",fontFamily:font,fontWeight:600}}>
          {v==="entries"?"Entries":"By Book"}
        </button>
      ))}
    </div>
    {ledgerView==="by-book"&&(()=>{
      const byBook={};
      entries.forEach(e=>{
        const b=e.book||"Unknown";
        if(!byBook[b]) byBook[b]={count:0,bonus:0,wagered:0,profit:0};
        byBook[b].count++;
        byBook[b].bonus+=parseFloat(e.bonus)||0;
        byBook[b].wagered+=parseFloat(e.hedge)||0;
        byBook[b].profit+=parseFloat(e.profit)||0;
      });
      const rows=Object.entries(byBook).sort((a,b)=>b[1].profit-a[1].profit);
      if(!rows.length) return <div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}><div style={{fontSize:28,marginBottom:8}}>📊</div><div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No entries yet</div><div style={{fontSize:11,color:K.mt}}>Log your first promo conversion in the Ledger tab and it'll appear here sorted by book.</div></div>;
      return (<div><div style={isCompact?{display:"grid",gap:10,marginBottom:8}:{overflowX:"auto",marginBottom:8}}>
        {isCompact ? rows.map(([book,d])=>{
          const roi=calcROI(d.profit,d.wagered);
          return <div key={book} style={{padding:12,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:10}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:K.tx}}>{book}</div>
              <div style={{fontSize:14,fontWeight:800,color:d.profit>=0?K.gn:K.rd,fontFamily:fontD}}>{d.profit>=0?"+":""}${f(d.profit)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,fontSize:10,color:K.mt}}>
              <div>Entries: <span style={{color:K.tx}}>{d.count}</span></div>
              <div>ROI: <span style={{color:roi===null?K.mt:roi>=0?K.gn:K.rd,fontWeight:700}}>{roi===null?"—":`${roi>=0?"+":""}${f(roi,1)}%`}</span></div>
              <div>Bonus: <span style={{color:K.tx}}>{d.bonus?`$${f(d.bonus)}`:"—"}</span></div>
              <div>Wagered: <span style={{color:K.tx}}>{d.wagered?`$${f(d.wagered)}`:"—"}</span></div>
            </div>
          </div>;
        }) : <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Book","Entries","Total Bonus","Total Wagered","Net Profit","ROI%"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(([book,d])=>{
            const roi=calcROI(d.profit,d.wagered);
            return (<tr key={book}>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{book}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{d.count}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{d.bonus?`$${f(d.bonus)}`:"—"}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{d.wagered?`$${f(d.wagered)}`:"—"}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:d.profit>=0?K.gn:K.rd,fontWeight:600}}>{d.profit>=0?"+":""}${f(d.profit)}</td>
              <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:roi===null?K.mt:roi>=0?K.gn:K.rd,fontWeight:roi!==null?600:400}}>{roi===null?"—":`${roi>=0?"+":""}${f(roi,1)}%`}</td>
            </tr>);
          })}</tbody>
        </table>}
      </div>
      <Nt c={K.ac}>Best performing book = highest ROI%. Worst = consider retiring that book.</Nt>
      </div>);
    })()}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
      <span style={{fontSize:10,color:K.mt,textTransform:"uppercase",letterSpacing:"1px"}}>Filter:</span>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterBook} onChange={e=>setFilterBook(e.target.value)}>
        <option value="All">All Books</option>
        {[...new Set(entries.map(e=>e.book))].sort().map(b=><option key={b}>{b}</option>)}
      </select>
      <select style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
        <option value="All">All Types</option>
        {["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}
      </select>
      <input type="date" style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} title="From date"/>
      <input type="date" style={{...S.input,width:"auto",padding:"4px 8px",fontSize:11}} value={filterTo} onChange={e=>setFilterTo(e.target.value)} title="To date"/>
      {(filterBook!=='All'||filterType!=='All'||filterFrom||filterTo)&&
        <button onClick={()=>{setFilterBook('All');setFilterType('All');setFilterFrom('');setFilterTo('');}} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>✕ Clear</button>}
    </div>
    {(()=>{
      const filteredEntries = entries.filter(e => {
        if(filterBook!=='All' && e.book!==filterBook) return false;
        if(filterType!=='All' && e.type!==filterType) return false;
        if(filterFrom && e.date && e.date < filterFrom) return false;
        if(filterTo && e.date && e.date > filterTo) return false;
        return true;
      });
      if(!filteredEntries.length) return entries.length>0
        ?<div style={{textAlign:"center",padding:24,color:K.mt,fontSize:12}}>No entries match your filters.</div>
        :<div style={{textAlign:"center",padding:"32px 16px",color:K.mt}}>
            <div style={{fontSize:32,marginBottom:8}}>📒</div>
            <div style={{fontSize:13,fontWeight:600,color:K.dm,marginBottom:4}}>No entries yet</div>
            <div style={{fontSize:11,color:K.mt,marginBottom:12}}>Every promo you convert goes here. Start with the Bonus Bet Converter — it auto-logs results.</div>
            <button onClick={()=>{
              const demo={id:Date.now(),date:new Date().toISOString().slice(0,10),book:"DraftKings",type:"Bonus Conversion",bonus:"200",hedge:"126",profit:"138.60",notes:"Demo entry — replace with your actual result"};
              syncAppData({...data,ledger:[demo,...(data.ledger||[])]});
            }} style={{padding:"7px 18px",background:`${K.gn}15`,border:`1px solid ${K.gn}30`,borderRadius:6,color:K.gn,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font}}>
              + Add demo entry
            </button>
          </div>;
      if (isCompact) return (<div style={{display:"grid",gap:10,marginTop:12}}>
        {filteredEntries.map(e=>{
          const editing = editId === e.id;
          const iStyle = {...S.input, padding:"7px 8px", fontSize:11};
          if(editing) return (
            <div key={e.id} style={{padding:12,background:`${K.ac}08`,border:`1px solid ${K.ac}20`,borderRadius:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <input style={iStyle} type="date" value={editForm.date||''} onChange={ev=>setEditForm(f=>({...f,date:ev.target.value}))}/>
                <select style={iStyle} value={editForm.book||''} onChange={ev=>setEditForm(f=>({...f,book:ev.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select>
                <select style={{...iStyle,gridColumn:"1 / -1"}} value={editForm.type||''} onChange={ev=>setEditForm(f=>({...f,type:ev.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select>
                <input style={iStyle} value={editForm.bonus||''} onChange={ev=>setEditForm(f=>({...f,bonus:ev.target.value}))} placeholder="Bonus $"/>
                <input style={iStyle} value={editForm.hedge||''} onChange={ev=>setEditForm(f=>({...f,hedge:ev.target.value}))} placeholder="Hedge $"/>
                <input style={iStyle} value={editForm.profit||''} onChange={ev=>setEditForm(f=>({...f,profit:ev.target.value}))} placeholder="Profit $"/>
                <input style={iStyle} value={editForm.myOdds||''} onChange={ev=>setEditForm(f=>({...f,myOdds:ev.target.value}))} placeholder="Your odds"/>
                <input style={iStyle} value={editForm.closingOdds||''} onChange={ev=>setEditForm(f=>({...f,closingOdds:ev.target.value}))} placeholder="Closing odds"/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={commitEdit} style={{flex:1,padding:"8px 12px",background:K.gn,border:"none",borderRadius:8,color:K.bg,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font}}>Save</button>
                <button onClick={cancelEdit} style={{flex:1,padding:"8px 12px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:8,color:K.mt,fontSize:11,cursor:"pointer",fontFamily:font}}>Cancel</button>
              </div>
            </div>
          );
          const clv = (()=>{if(!e.myOdds||!e.closingOdds)return null;const my=toD(e.myOdds),cl=toD(e.closingOdds);if(my<=1||cl<=1)return null;return (my/cl-1)*100;})();
          return <div key={e.id} style={{padding:12,background:K.s2,border:`1px solid ${K.bd}`,borderRadius:10}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:8}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:K.tx}}>{e.book}</div>
                <div style={{fontSize:10,color:K.mt}}>{e.date}</div>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:parseFloat(e.profit)>=0?K.gn:K.rd,fontFamily:fontD}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <span style={S.tag(K.ac)}>{e.type}</span>
              {e.bonus&&<span style={S.tag(K.gn)}>Bonus ${e.bonus}</span>}
              {e.hedge&&<span style={S.tag(K.dm)}>Hedge ${e.hedge}</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,fontSize:10,color:K.mt}}>
              <div>EV: <span style={{color:K.tx}}>{e.ev?`${e.ev}%`:"—"}</span></div>
              <div>CLV: <span style={{color:clv===null?K.mt:clv>=0?K.gn:K.rd,fontWeight:700}}>{clv===null?"—":`${clv>=0?"+":""}${f(clv,2)}%`}</span></div>
              {e.notes&&<div style={{gridColumn:"1 / -1",lineHeight:1.5}}>Notes: <span style={{color:K.dm}}>{e.notes}</span></div>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={()=>startEdit(e)} style={{flex:1,padding:"7px 10px",background:"transparent",border:`1px solid ${K.ac}40`,borderRadius:8,color:K.ac,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font}}>Edit</button>
              <button onClick={()=>del(e.id)} style={{flex:1,padding:"7px 10px",background:"transparent",border:`1px solid ${K.rd}30`,borderRadius:8,color:K.rd,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font}}>Delete</button>
            </div>
          </div>;
        })}
      </div>);
      return (<div style={{overflowX:"auto",marginTop:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr>{["Date","Book","Type","Bonus","Hedge","Profit","CLV",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",borderBottom:`1px solid ${K.bd2}`,color:K.mt,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
        <tbody>{filteredEntries.map(e=>{
          const editing = editId === e.id;
          const iStyle = {...S.input, padding:"3px 6px", fontSize:11};
          if(editing) return (
            <tr key={e.id} style={{background:`${K.ac}08`}}>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:110}} type="date" value={editForm.date||''} onChange={ev=>setEditForm(f=>({...f,date:ev.target.value}))}/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><select style={{...iStyle,width:110}} value={editForm.book||''} onChange={ev=>setEditForm(f=>({...f,book:ev.target.value}))}>{BOOKS.map(b=><option key={b.name}>{b.name}</option>)}</select></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><select style={{...iStyle,width:130}} value={editForm.type||''} onChange={ev=>setEditForm(f=>({...f,type:ev.target.value}))}>{["Bonus Conversion","Profit Boost","First Bet Hedge","Arbitrage","Middle","+EV Bet","Other"].map(t=><option key={t}>{t}</option>)}</select></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.bonus||''} onChange={ev=>setEditForm(f=>({...f,bonus:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.hedge||''} onChange={ev=>setEditForm(f=>({...f,hedge:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.profit||''} onChange={ev=>setEditForm(f=>({...f,profit:ev.target.value}))} placeholder="$"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`}}><input style={{...iStyle,width:70}} value={editForm.myOdds||''} onChange={ev=>setEditForm(f=>({...f,myOdds:ev.target.value}))} placeholder="my"/></td>
              <td style={{padding:"6px 8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap",display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={commitEdit} style={{padding:"3px 8px",background:K.gn,border:"none",borderRadius:4,color:K.bg,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:font}}>✓</button>
                <button onClick={cancelEdit} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${K.bd2}`,borderRadius:4,color:K.mt,fontSize:10,cursor:"pointer",fontFamily:font}}>✕</button>
              </td>
            </tr>
          );
          return (<tr key={e.id}>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.date}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,fontWeight:600}}>{e.book}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}><span style={S.tag(K.ac)}>{e.type}</span></td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.bonus?`$${e.bonus}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{e.hedge?`$${e.hedge}`:"—"}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,color:parseFloat(e.profit)>=0?K.gn:K.rd,fontWeight:600}}>{parseFloat(e.profit)>=0?"+":""}${e.profit}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`}}>{(()=>{if(!e.myOdds||!e.closingOdds)return<span style={{color:K.mt}}>—</span>;const my=toD(e.myOdds),cl=toD(e.closingOdds);if(my<=1||cl<=1)return<span style={{color:K.mt}}>—</span>;const clv=(my/cl-1)*100;return<span style={{color:clv>=0?K.gn:K.rd,fontWeight:600}}>{clv>=0?"+":""}{f(clv,2)}%</span>;})()}</td>
            <td style={{padding:"8px",borderBottom:`1px solid ${K.bd}`,whiteSpace:"nowrap"}}>
              <span onClick={()=>startEdit(e)} style={{cursor:"pointer",color:K.ac,fontSize:11,marginRight:8}} title="Edit">✎</span>
              <span onClick={()=>del(e.id)} style={{cursor:"pointer",color:K.rd,fontSize:10}} title="Delete">✕</span>
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>);
    })()}
    {entries.length>=3&&(()=>{
      const byMonth={};
      entries.forEach(e=>{
        const m=e.date?e.date.slice(0,7):"Unknown";
        if(!byMonth[m]) byMonth[m]={profit:0,count:0};
        byMonth[m].profit+=parseFloat(e.profit)||0;
        byMonth[m].count++;
      });
      const months=Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0]));
      return (<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
        <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Monthly Breakdown</div>
        {months.map(([month,d])=>(
          <div key={month} style={{display:"grid",gridTemplateColumns:isCompact?"1fr auto":"1fr auto auto",gap:8,padding:"8px 0",borderBottom:`1px solid ${K.bd}`,alignItems:"center"}}>
            <span style={{fontSize:12,color:K.dm}}>{month}</span>
            <span style={{fontSize:12,color:K.mt,textAlign:isCompact?"left":"right"}}>{d.count} entries</span>
            <span style={{fontSize:13,fontWeight:600,color:d.profit>=0?K.gn:K.rd,textAlign:"right"}}>{d.profit>=0?"+":""}${f(d.profit)}</span>
          </div>
        ))}
      </div>);
    })()}
    {total>0&&<div style={{...S.card,background:K.s2,border:`1px solid ${K.bd}`,marginTop:12}}>
      <div style={{fontSize:11,fontWeight:700,color:K.ac,marginBottom:8,textTransform:"uppercase",letterSpacing:"1.5px"}}>Federal Tax Estimate</div>
      <div style={{fontSize:10,color:K.mt,marginBottom:10}}>Gambling winnings are ordinary income. Estimate only — consult a tax professional.</div>
      {[[0.22,"22% bracket"],[0.24,"24% bracket"],[0.32,"32% bracket"]].map(([rate,label])=>(
        <RR key={rate} l={label} v={`Owe ~$${f(total*rate)} · Keep $${f(total*(1-rate))}`} c={K.yl}/>
      ))}
      <Nt c={K.yl}>Report all winnings even without a W-2G. You may deduct gambling losses up to your winnings if you itemize deductions. Keep Form W-2G records.</Nt>
    </div>}
    <TaxTimingAdvisor entries={entries}/>
    {entries.length>=1&&<ReportCard entries={entries} total={total}/>}
  </div>);
};

export default Ledger;
